/* ShowLink v23 admin-configured Shortlink ads and redirect control */
(()=>{'use strict';
const $=s=>document.querySelector(s);
async function run(){
 try{
  const c=window.SHOWLINK_SUPABASE||{};
  if(!window.supabase||!c.url||!c.anonKey)return;
  const sb=window.supabase.createClient(c.url,c.anonKey);
  const {data,error}=await sb.rpc('get_public_shortlink_control_settings');if(error||!data)return;
  const main=document.querySelector('main')||document.body;
  const box=document.createElement('section');box.className='sl-admin-ad-zone';box.setAttribute('aria-label','Iklan');
  if(data.image_ad_enabled&&/^https?:\/\//i.test(data.image_ad_url||'')&&/^https?:\/\//i.test(data.image_ad_target_url||'')){
    const a=document.createElement('a');a.href=data.image_ad_target_url;a.target='_blank';a.rel='noopener noreferrer sponsored';
    const img=document.createElement('img');img.src=data.image_ad_url;img.alt='Iklan';img.loading='lazy';img.style.cssText='display:block;width:100%;height:auto;max-height:320px;object-fit:contain;border-radius:12px';
    a.appendChild(img);box.appendChild(a);
  }
  const slots=Array.isArray(data.adsterra_slots)?data.adsterra_slots.slice(0,12):[];
  slots.forEach((slot,i)=>{if(!slot||!slot.code)return;const wrap=document.createElement('div');wrap.className='sl-admin-ad-slot';wrap.dataset.slot=String(i+1);wrap.innerHTML=slot.code;box.appendChild(wrap);});
  if(box.childNodes.length)main.prepend(box);
  if(data.shortlink_redirect_enabled){
    const old=document.querySelector('[data-admin-native-redirect]');if(old)old.remove();
    const b=document.createElement('a');b.className='sl-admin-native-redirect';b.dataset.adminNativeRedirect='1';b.textContent=data.shortlink_redirect_label||'Lanjutkan';b.href='#';b.style.cssText='display:block;margin:18px auto;padding:13px 20px;max-width:420px;text-align:center;border-radius:12px;background:#2563eb;color:#fff;font-weight:800;text-decoration:none';
    b.addEventListener('click',e=>{e.preventDefault();let dest=data.shortlink_redirect_url||'';try{const saved=JSON.parse(sessionStorage.getItem('sl_data')||'{}');dest=dest||saved.content_url||saved.destination_url||'';}catch{}if(!/^https?:\/\//i.test(dest)){const slug=new URLSearchParams(location.search).get('slug')||sessionStorage.getItem('sl_slug')||'';if(slug)dest='/shortlink-view.html?slug='+encodeURIComponent(slug);}if(dest)location.href=dest;});
    main.appendChild(b);
  }
 }catch(e){console.debug('ShowLink admin ad settings not applied',e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
