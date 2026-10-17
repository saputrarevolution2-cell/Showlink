/* Admin-configured sponsor placements and final destination control. */
(()=>{'use strict';
async function run(){try{
 const c=window.SHOWLINK_SUPABASE||{};if(!window.supabase||!c.url||!c.anonKey)return;
 const sb=window.supabase.createClient(c.url,c.anonKey);const {data,error}=await sb.rpc('get_public_shortlink_control_settings');if(error||!data)return;
 const slots=Array.isArray(data.adsterra_slots)?data.adsterra_slots.slice(0,12):[];
 const placeholders=[...document.querySelectorAll('[data-shortlink-ad-slot]')];
 if(data.image_ad_enabled&&/^https?:\/\//i.test(data.image_ad_url||'')&&/^https?:\/\//i.test(data.image_ad_target_url||'')){
   const wrap=document.createElement('div');wrap.className='sl-admin-image-ad';const a=document.createElement('a');a.href=data.image_ad_target_url;a.target='_blank';a.rel='noopener noreferrer sponsored';const img=document.createElement('img');img.src=data.image_ad_url;img.alt='Iklan sponsor';img.loading='lazy';img.style.cssText='display:block;width:100%;height:auto;max-height:320px;object-fit:contain;border-radius:12px';a.appendChild(img);wrap.appendChild(a);if(placeholders[0])placeholders[0].prepend(wrap);
 }
 if(data.image_ad_enabled&&/^https?:\/\//i.test(data.image_ad_url||'')&&/^https?:\/\//i.test(data.image_ad_target_url||'')){
   const area=document.getElementById('showlink-endorsement');
   if(area){const placeholder=area.querySelector('.endorsement-placeholder');if(placeholder)placeholder.remove();const link=document.createElement('a');link.className='sl-endorsement-button';link.href=data.image_ad_target_url;link.target='_blank';link.rel='noopener noreferrer sponsored';link.innerHTML='<i class="fa-solid fa-handshake-angle" aria-hidden="true"></i> Kunjungi Sponsor';area.appendChild(link);}
 }
 slots.forEach((slot,i)=>{if(!slot||!slot.code)return;const target=placeholders[i]||placeholders[placeholders.length-1];if(!target)return;const wrap=document.createElement('div');wrap.className='sl-admin-ad-slot';wrap.dataset.slot=String(i+1);wrap.innerHTML=slot.code;target.prepend(wrap);});
 if(document.body.dataset.shortlinkFinal==='true'&&data.shortlink_redirect_enabled){
   const b=document.getElementById('final-admin-redirect');if(b){b.textContent=data.shortlink_redirect_label||'Lanjut ke tujuan';const adminUrl=String(data.shortlink_redirect_url||'').trim();if(/^https?:\/\//i.test(adminUrl)){b.dataset.adminDestination=adminUrl;} }
 }
 }catch(e){console.debug('ShowLink sponsor settings not applied',e)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();