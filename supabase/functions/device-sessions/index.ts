import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type,x-supabase-api-version,x-supabase-client-platform,x-supabase-client-version,x-supabase-client-runtime,x-supabase-client-runtime-version","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:CORS});
const env=(k:string)=>{const v=Deno.env.get(k);if(!v)throw new Error(`${k} missing`);return v};
const valid=(x:unknown)=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const clean=(x:unknown,n=100)=>String(x??"").replace(/[<>]/g,"").trim().slice(0,n);
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);try{
 const auth=req.headers.get("Authorization")||"";if(!auth.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
 const url=env("SUPABASE_URL"),anon=env("SUPABASE_ANON_KEY"),service=env("SUPABASE_SERVICE_ROLE_KEY");
 const ac=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:ue}=await ac.auth.getUser();if(ue||!user)return json({error:"AUTH_REQUIRED"},401);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});const b=await req.json().catch(()=>({}));const action=clean(b.action,20),id=b.device_id;
 if(!valid(id))return json({error:"INVALID_DEVICE_ID"},400);
 if(action==="register"){
  const {data:old,error:oe}=await db.from("showlink_device_sessions").select("revoked_at").eq("user_id",user.id).eq("device_id",id).maybeSingle();if(oe)throw oe;if(old?.revoked_at)return json({ok:false,revoked:true},403);
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||null;
  const {error}=await db.from("showlink_device_sessions").upsert({user_id:user.id,device_id:id,device_label:clean(b.device_label||"Browser"),user_agent:clean(req.headers.get("user-agent"),500)||null,ip_address:ip?clean(ip,80):null,last_seen_at:new Date().toISOString()},{onConflict:"user_id,device_id"});if(error)throw error;return json({ok:true,revoked:false});
 }
 if(action==="list"){const {data,error}=await db.from("showlink_device_sessions").select("device_id,device_label,user_agent,ip_address,first_seen_at,last_seen_at,revoked_at").eq("user_id",user.id).order("last_seen_at",{ascending:false}).limit(50);if(error)throw error;return json({ok:true,sessions:data||[]});}
 if(action==="status"){const {data,error}=await db.from("showlink_device_sessions").select("revoked_at").eq("user_id",user.id).eq("device_id",id).maybeSingle();if(error)throw error;return json({ok:true,revoked:!!data?.revoked_at,registered:!!data});}
 if(action==="revoke"){const target=b.target_device_id;if(!valid(target))return json({error:"INVALID_TARGET_DEVICE_ID"},400);const {data,error}=await db.from("showlink_device_sessions").update({revoked_at:new Date().toISOString(),revoked_reason:"Revoked by account owner"}).eq("user_id",user.id).eq("device_id",target).is("revoked_at",null).select("device_id").maybeSingle();if(error)throw error;if(!data)return json({error:"SESSION_NOT_FOUND_OR_ALREADY_REVOKED"},404);return json({ok:true});}
 return json({error:"UNKNOWN_ACTION"},400);
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:"INTERNAL_ERROR"},500)}});
