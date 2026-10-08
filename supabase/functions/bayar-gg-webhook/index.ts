import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json; charset=utf-8"}});
function env(n:string){const v=Deno.env.get(n);if(!v)throw new Error(`${n} is not configured`);return v;}
async function hmac(value:string,secret:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value));return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,"0")).join("");}
function safe(a:string,b:string){if(!a||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const raw=await req.text(), p=JSON.parse(raw), sig=req.headers.get("X-Webhook-Signature")||"", ts=req.headers.get("X-Webhook-Timestamp")||"";
  if(!sig||!ts)return json({error:"Missing webhook signature"},401);
  const expected=await hmac(`${p.invoice_id}|${p.status}|${p.final_amount}|${ts}`,env("BAYARGG_WEBHOOK_SECRET"));
  if(!safe(expected.toLowerCase(),sig.trim().toLowerCase()))return json({error:"Invalid signature"},401);
  if(String(p.status).toLowerCase()!=="paid")return json({ok:true,ignored:true});
  const supabase=createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:o,error}=await supabase.from("orders").select("id,status,provider_order_id").eq("provider","BAYAR_GG").eq("provider_order_id",String(p.invoice_id)).maybeSingle();
  if(error)return json({error:"Order lookup failed"},500);if(!o)return json({error:"Order not found"},404);
  const {data:settled,error:settleErr}=await supabase.rpc("settle_paid_order",{p_order_id:o.id,p_provider:"BAYAR_GG",p_provider_payment_id:String(p.invoice_id),p_provider_payload:p});
  if(settleErr)return json({error:"Settlement failed"},500);
  await supabase.from("payments").update({status:"paid",paid_at:new Date().toISOString(),provider_payload:p,updated_at:new Date().toISOString()}).eq("order_id",o.id).eq("provider","BAYAR_GG");
  return json({ok:true,order_id:o.id,settlement:settled});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Webhook error"},500);}
});
