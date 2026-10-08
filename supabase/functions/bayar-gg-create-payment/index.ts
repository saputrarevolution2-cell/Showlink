import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API = "https://www.bayar.gg/api/create-payment.php";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8" } });
function env(name: string): string { const v = Deno.env.get(name); if (!v) throw new Error(`${name} is not configured`); return v; }

async function callerUserId(req: Request, supabaseUrl: string): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const client = createClient(
    supabaseUrl,
    env("SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await client.auth.getUser();
  return data.user?.id || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id || "").trim();
    const guestToken = String(body.guest_access_token || "").trim();
    if (!orderId) return json({ error: "order_id is required" }, 400);

    const supabaseUrl = env("SUPABASE_URL");
    const service = createClient(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
    const caller = await callerUserId(req, supabaseUrl);
    if (!caller && !guestToken) return json({ error: "AUTH_OR_GUEST_TOKEN_REQUIRED" }, 401);

    const { data: order, error } = await service.from("orders")
      .select("id,order_number,amount,currency,status,buyer_id,guest_access_token,provider_order_id")
      .eq("id", orderId).single();
    if (error || !order) return json({ error: "Order not found" }, 404);

    const ownsUser = !!caller && order.buyer_id === caller;
    const ownsGuest = !caller && !!guestToken && order.guest_access_token === guestToken;
    if (!ownsUser && !ownsGuest) return json({ error: "ORDER_ACCESS_DENIED" }, 403);
    if (["paid","completed"].includes(String(order.status))) return json({ success:true, already_paid:true, order_id:order.id });
    if (!["pending","waiting_payment","processing"].includes(String(order.status))) return json({ error:`Order cannot be paid in status ${order.status}` },409);

    const { data: existing } = await service.from("payments")
      .select("provider_payment_id,invoice_id,checkout_url,qr_string,amount,status,provider_payload")
      .eq("order_id", order.id).eq("provider","BAYAR_GG").eq("status","pending")
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if (existing?.checkout_url) {
      return json({ success:true, order_id:order.id, provider:"BAYAR_GG", payment_url:existing.checkout_url, checkout_url:existing.checkout_url, invoice_id:existing.invoice_id || existing.provider_payment_id, amount:Number(existing.amount ?? order.amount), reused:true });
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/bayar-gg-webhook`;
    const { data: orderLink } = await service
      .from("orders")
      .select("payment_link_id, payment_links(slug)")
      .eq("id", order.id)
      .single();
    const slug = String((orderLink as any)?.payment_links?.slug || "").trim();
    const publicBase = (Deno.env.get("SHOWLINK_PUBLIC_URL") || "https://showlink.my.id").replace(/\/$/, "");
    const redirectUrl = slug ? `${publicBase}/p/${encodeURIComponent(slug)}` : `${publicBase}/`;
    const response = await fetch(API, {
      method:"POST",
      headers:{"Content-Type":"application/json","X-API-Key":env("BAYARGG_API_KEY")},
      body:JSON.stringify({
        amount:Number(order.amount),
        description:`Order ${order.order_number}`,
        payment_method:Deno.env.get("BAYARGG_PAYMENT_METHOD") || "qris_bayar_gg",
        payment_url:Deno.env.get("BAYARGG_PAYMENT_URL") || "https://www.bayar.gg/pay",
        callback_url:callbackUrl,
        redirect_url:redirectUrl
      })
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok || result?.success!==true) return json({error:`BAYARGG_CREATE_PAYMENT_FAILED: ${String(result?.message||result?.error||`HTTP ${response.status}`)}`,provider_status:response.status},502);

    const data=result?.data || result?.payment || result;
    const invoice=String(data?.invoice_id || result?.invoice_id || "").trim();
    const paymentUrl=String(data?.payment_url || result?.payment_url || "").trim();
    const amount=Number(data?.final_amount ?? data?.amount ?? order.amount);
    if(!invoice || !paymentUrl) return json({error:"BayarGG response missing invoice_id/payment_url"},502);

    const payload={order_id:order.id,provider:"BAYAR_GG",payment_method:String(data?.payment_method || Deno.env.get("BAYARGG_PAYMENT_METHOD") || "qris_bayar_gg"),provider_payment_id:invoice,invoice_id:invoice,amount,fee:Math.max(0,amount-Number(order.amount)),net_amount:Math.max(0,Number(order.amount)),status:"pending",checkout_url:paymentUrl,qr_string:data?.qris_string || null,provider_payload:result,updated_at:new Date().toISOString()};
    const {error:payErr}=await service.from("payments").insert(payload);
    if(payErr && !/duplicate key|unique constraint/i.test(payErr.message||"")) return json({error:"Payment record could not be saved",db_error:payErr.message},500);
    const {error:orderErr}=await service.from("orders").update({provider:"BAYAR_GG",provider_order_id:invoice,payment_reference:invoice,status:"waiting_payment",gateway_payload:result}).eq("id",order.id);
    if(orderErr) return json({error:"Order could not be updated"},500);

    return json({success:true,order_id:order.id,provider:"BAYAR_GG",invoice_id:invoice,payment_url:paymentUrl,checkout_url:paymentUrl,amount});
  } catch(e) { console.error(e); return json({error:e instanceof Error?e.message:"Internal server error"},500); }
});
