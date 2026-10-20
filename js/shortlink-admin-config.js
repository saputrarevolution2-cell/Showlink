/* Public renderer for admin-managed page-specific ads and endorsements.
 * Ad network snippets run in a sandboxed iframe so document.write() and
 * dynamically inserted Adsterra scripts cannot overwrite the ShowLink page.
 */
(()=>{'use strict';
function validHttp(value){try{const u=new URL(String(value||''),location.href);return u.protocol==='http:'||u.protocol==='https:';}catch{return false;}}
function inferHeight(code){
 const m=String(code||'').match(/(?:height\s*['"\s:=]+)(\d{2,4})/i);
 const h=m?Number(m[1]):250;
 return Number.isFinite(h)?Math.max(50,Math.min(h,1200)):250;
}
function mountAdCode(target,code){
 if(!target||!code||target.dataset.slAdMounted==='true')return;
 target.dataset.slAdMounted='true';
 const wrap=document.createElement('div');wrap.className='sl-admin-ad-slot';
 wrap.style.cssText='display:block;width:100%;min-width:0;overflow:hidden;text-align:center;margin:8px auto;';
 const frame=document.createElement('iframe');
 frame.title='Iklan sponsor';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.setAttribute('sandbox','allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox');
 frame.style.cssText='display:block;border:0;width:100%;max-width:100%;height:'+inferHeight(code)+'px;margin:0 auto;overflow:hidden;';
 const base=location.origin+'/';
 const resize=`<script>(function(){function send(){try{parent.postMessage({type:'sl-ad-size',height:Math.min(1200,Math.max(50,document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0))},'*')}catch(e){}}addEventListener('load',send);new MutationObserver(send).observe(document.documentElement,{subtree:true,childList:true,attributes:true});setTimeout(send,250);setTimeout(send,1000);setTimeout(send,2500)})();<\/script>`;
 // Use srcdoc to preserve normal ad-tag behavior, including document.write and
 // scripts that create their own iframe/container. Snippet is admin-supplied.
 frame.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="'+base+'"><style>html,body{margin:0;padding:0;width:100%;min-height:0;overflow:hidden;text-align:center}body>*{max-width:100%}iframe,img,ins{max-width:100%;}</style></head><body>'+String(code)+resize+'</body></html>';
 frame.addEventListener('load',()=>{try{frame.contentWindow.postMessage({type:'sl-ad-ready'},'*')}catch{}});
 wrap.appendChild(frame);target.replaceChildren(wrap);
}
// Resize only frames created by this renderer; ignore messages from all other frames.
window.addEventListener('message',event=>{
 if(!event.data||event.data.type!=='sl-ad-size'||!Number.isFinite(Number(event.data.height)))return;
 const frame=[...document.querySelectorAll('iframe[title="Iklan sponsor"]')].find(item=>item.contentWindow===event.source);
 if(!frame)return;frame.style.height=Math.max(50,Math.min(1200,Number(event.data.height)))+'px';
});
function ensurePageSlot(page,n){
 let target=document.querySelector(`[data-shortlink-ad-page="${page}"][data-shortlink-ad-slot="${n}"]`);if(target)return target;
 // Reuse existing untagged slot on pages whose markup predates page-specific slots.
 target=document.querySelector(`[data-shortlink-ad-slot="${n}"]:not([data-shortlink-ad-page])`);if(target){target.dataset.shortlinkAdPage=page;return target;}
 target=document.createElement('div');target.className='ad task-ad-slot sl-generated-ad-slot';target.dataset.shortlinkAdPage=page;target.dataset.shortlinkAdSlot=String(n);target.innerHTML='<strong>Iklan Sponsor</strong><p>Iklan sponsor opsional; tidak perlu diklik untuk melanjutkan.</p>';
 const magazine=document.querySelector('.magazine');const sections=magazine?[...magazine.querySelectorAll('article,section.magazine-story,section.task3-step-section')]:[];
 if(magazine&&sections.length){const anchor=sections[Math.min(n-1,sections.length-1)];anchor.insertAdjacentElement('afterend',target);}else{const footer=document.querySelector('footer');if(footer)footer.insertAdjacentElement('beforebegin',target);else (document.querySelector('main')||document.body).appendChild(target);}return target;
}
async function run(){try{
 const c=window.SHOWLINK_SUPABASE||{};if(!window.supabase||!c.url||!c.anonKey)return;
 const sb=window.supabase.createClient(c.url,c.anonKey);const {data,error}=await sb.rpc('get_public_shortlink_control_settings');if(error||!data)return;
 const page=String(document.body.dataset.shortlinkPage||(document.body.dataset.shortlinkFinal==='true'?'final':''));
 const slots=Array.isArray(data.adsterra_slots)?data.adsterra_slots:[];
 for(const slot of slots){const n=Number(slot.slot);if(!Number.isInteger(n)||!slot.code||slot.enabled===false)continue;
  if(slot.page){if(slot.page!==page||n<1||n>7)continue;mountAdCode(ensurePageSlot(page,n),slot.code);}
  else{if(n<1||n>10)continue;const target=document.querySelector(`[data-shortlink-ad-slot="${n}"]:not([data-shortlink-ad-page])`);if(target)mountAdCode(target,slot.code);}
 }
 const placeholders=[...document.querySelectorAll('[data-shortlink-ad-slot]')];
 if(data.image_ad_enabled&&validHttp(data.image_ad_url)&&validHttp(data.image_ad_target_url)&&placeholders.length){const wrap=document.createElement('div');wrap.className='sl-admin-image-ad';const a=document.createElement('a');a.href=data.image_ad_target_url;a.target='_blank';a.rel='noopener noreferrer sponsored';const img=document.createElement('img');img.src=data.image_ad_url;img.alt='Iklan sponsor';img.loading='lazy';img.style.cssText='display:block;width:100%;height:auto;max-height:320px;object-fit:contain;border-radius:12px';a.appendChild(img);wrap.appendChild(a);placeholders[0].prepend(wrap);}
 if(data.image_ad_enabled&&validHttp(data.image_ad_url)&&validHttp(data.image_ad_target_url)){const area=document.getElementById('showlink-endorsement');if(area){area.querySelector('.endorsement-placeholder')?.remove();const link=document.createElement('a');link.className='sl-endorsement-button';link.href=data.image_ad_target_url;link.target='_blank';link.rel='noopener noreferrer sponsored';link.textContent='Kunjungi Sponsor';area.appendChild(link);}}
 const endorsements=Array.isArray(data.endorsement_slots)?data.endorsement_slots:[];
 document.querySelectorAll('[data-shortlink-endorsements]').forEach(area=>{area.replaceChildren();const position=area.dataset.shortlinkEndorsements;const selected=endorsements.filter(item=>item&&item.enabled===true&&validHttp(item.image_url)&&validHttp(item.target_url)&&(item.page===page||!item.page));const ordered=selected.filter(item=>!item.page);const pageItems=selected.filter(item=>item.page===page);const combined=[...pageItems,...ordered];const visible=position==='top'?combined.filter((item,index)=>Number(item.slot||index+1)%2===1).slice(0,1):position==='bottom'?combined.filter((item,index)=>Number(item.slot||index+1)%2===0).slice(0,1):combined;
  for(const item of visible){const a=document.createElement('a');a.className='sl-endorsement-card';a.href=item.target_url;a.target='_blank';a.rel='noopener noreferrer sponsored';const img=document.createElement('img');img.src=item.image_url;img.alt=String(item.alt||'Endorsement sponsor');img.loading='lazy';const label=document.createElement('span');label.textContent=String(item.title||'Endorsement sponsor');a.append(img,label);area.appendChild(a);}if(!area.children.length)area.remove();});
 if(document.body.dataset.shortlinkFinal==='true'&&data.shortlink_redirect_enabled){const b=document.getElementById('final-go');if(b){const adminUrl=String(data.shortlink_redirect_url||'').trim();if(validHttp(adminUrl))b.dataset.adminDestination=adminUrl;}}
 }catch(e){console.debug('ShowLink sponsor settings not applied',e)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();})();
