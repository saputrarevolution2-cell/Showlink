import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const API="https://www.bayar.gg/api/check-payment.php";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"content-type":"application/json; charset=utf-8"}});
function env(name:string):string{const v=Deno.env.get(name);if(!v)throw new Error(`${name} is not configured`);return v;}
async function callerUserId(req:Request,url:string){const h=req.headers.get("Authorization")||"";if(!h.startsWith("Bearer "))return null;const c=createClient(url,env("SUPABASE_ANON_KEY"),{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:h}}});const {data}=await c.auth.getUser();return data.user?.id||null;}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const b=await req.json().catch(()=>({}));const orderId=String(b.order_id||"").trim(),guest=String(b.guest_access_token||"").trim();if(!orderId)return json({error:"order_id is required"},400);
  const url=env("SUPABASE_URL"), service=createClient(url,env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}}), caller=await callerUserId(req,url);
  if(!caller&&!guest)return json({error:"AUTH_OR_GUEST_TOKEN_REQUIRED"},401);
  const {data:o,error}=await service.from("orders").select("id,status,buyer_id,guest_access_token,provider,provider_order_id").eq("id",orderId).single();
  if(error||!o)return json({error:"Order not found"},404);
  if(!(caller&&o.buyer_id===caller) && !( !caller&&guest&&o.guest_access_token===guest))return json({error:"ORDER_ACCESS_DENIED"},403);
  if(["paid","completed"].includes(String(o.status)))return json({success:true,paid:true,status:"paid"});
  if(o.provider!=="BAYAR_GG"||!o.provider_order_id)return json({success:true,paid:false,status:o.status});
  const r=await fetch(`${API}?invoice=${encodeURIComponent(o.provider_order_id)}`,{headers:{"X-API-Key":env("BAYARGG_API_KEY")}});
  const data=await r.json().catch(()=>({}));if(!r.ok||data?.success!==true)return json({error:`BAYARGG_STATUS_CHECK_FAILED: ${String(data?.message||data?.error||`HTTP ${r.status}`)}`},502);
  const status=String(data.status||"pending").toLowerCase();
  if(status==="paid"){
    const {data:settled,error:settleErr}=await service.rpc("settle_paid_order",{p_order_id:o.id,p_provider:"BAYAR_GG",p_provider_payment_id:o.provider_order_id,p_provider_payload:data});
    if(settleErr)return json({error:"Settlement failed",details:settleErr.message},500);
    await service.from("payments").update({status:"paid",paid_at:new Date().toISOString(),provider_payload:data,updated_at:new Date().toISOString()}).eq("order_id",o.id).eq("provider","BAYAR_GG");
    return json({success:true,paid:true,status:"paid",settlement:settled});
  }
  return json({success:true,paid:false,status});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Internal server error"},500);}
});
