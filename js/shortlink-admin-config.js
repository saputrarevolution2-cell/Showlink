/* Public renderer for admin-managed Adsterra codes and endorsements.
   Global/script-only units (e.g. Popunder or Social Bar) are injected into the
   document head once per unique script; container-based units (banner/native)
   are rendered in their page slots. Intensity controls eligible slot counts,
   never forced repeated firing of a global ad script. Only admin-saved codes run. */
(()=>{'use strict';
const GLOBAL_SRC_ATTR='data-sl-adsterra-src';
const GLOBAL_CODE_ATTR='data-sl-adsterra-code';
function validHttp(value){try{const u=new URL(String(value||''),location.href);return u.protocol==='http:'||u.protocol==='https:';}catch{return false;}}
function isGlobalCode(code){
 const s=String(code||'');
 if(/SHOWLINK\s*:\s*BODY/i.test(s))return false;
 if(/SHOWLINK\s*:\s*HEAD/i.test(s))return true;
 // Popunder and Social Bar are standalone scripts; container-based display units
 // must remain inside the slot so their dimensions and target element are retained.
 const hasContainer=/<\s*(?:div|ins|iframe|img|a|section|article)\b/i.test(s)||/\batOptions\s*=|adsbygoogle|data-ad-slot|container[-_][\w-]+/i.test(s);
 return /<\s*script\b/i.test(s)&&!hasContainer;
}
function scriptAlreadyLoaded(src){return !![...document.scripts].find(s=>s.getAttribute(GLOBAL_SRC_ATTR)===src||s.src===src);}
function appendScript(parent,node,globalMode){
 const src=node.getAttribute('src')||'';
 if(src&&scriptAlreadyLoaded(src))return;
 const script=document.createElement('script');
 for(const a of [...node.attributes]){
   if(a.name.toLowerCase()==='src')continue;
   if(a.name.toLowerCase().startsWith('on'))continue;
   script.setAttribute(a.name,a.value);
 }
 if(globalMode)script.setAttribute('data-cfasync','false');
 if(src){script.src=src.startsWith('//')?location.protocol+src:src;if(globalMode)script.setAttribute(GLOBAL_SRC_ATTR,src);}
 // Keep snippet execution order unless the publisher's original code explicitly requests async.
 script.async=node.hasAttribute('async');
 const inline=String(node.textContent||'').trim();
 if(inline){
   const key=inline.slice(0,500);
   if(globalMode&&[...document.scripts].some(s=>s.getAttribute(GLOBAL_CODE_ATTR)===key))return;
   script.textContent=inline;if(globalMode)script.setAttribute(GLOBAL_CODE_ATTR,key);
 }
 parent.appendChild(script);
}
function appendSafeNode(parent,node,globalMode=false){
 if(node.nodeType===Node.TEXT_NODE){parent.appendChild(document.createTextNode(node.textContent||''));return;}
 if(node.nodeType!==Node.ELEMENT_NODE)return;
 const tag=node.tagName.toLowerCase();
 if(tag==='script'){appendScript(parent,node,globalMode);return;}
 if(tag==='iframe'){
   // Do not sandbox ad-network frames: sandboxing can block ad behavior/popups and
   // alter normal Adsterra creative rendering. The code is admin-managed.
   const frame=document.createElement('iframe');
   for(const a of [...node.attributes]){if(a.name.toLowerCase().startsWith('on'))continue;if(['src','href','data','poster'].includes(a.name.toLowerCase())&&!validHttp(a.value)&&!a.value.startsWith('//'))continue;frame.setAttribute(a.name,a.value);}
   if(!frame.hasAttribute('loading'))frame.setAttribute('loading','lazy');
   parent.appendChild(frame);return;
 }
 if(!/^(div|span|a|ins|img|p|br|strong|b|em|i|small|section|article|picture|source|noscript|style|ul|ol|li)$/.test(tag))return;
 const el=document.createElement(tag);
 for(const a of [...node.attributes]){if(a.name.toLowerCase().startsWith('on'))continue;if(['href','src','data','poster'].includes(a.name.toLowerCase())&&!validHttp(a.value)&&!a.value.startsWith('//'))continue;el.setAttribute(a.name,a.value);}
 for(const child of [...node.childNodes])appendSafeNode(el,child,globalMode);
 parent.appendChild(el);
}
function parseAndMount(target,code){
 if(!target||!code||target.dataset.slAdMounted==='true')return;
 target.dataset.slAdMounted='true';
 const doc=new DOMParser().parseFromString(String(code),'text/html');
 const nodes=[...doc.body.childNodes];
 const hasHeadContent=[...doc.head.childNodes].length>0;
 // Codes copied as full HTML documents may place Popunder in <head>.
 if(hasHeadContent){for(const node of [...doc.head.childNodes])appendSafeNode(document.head,node,true);}
 for(const node of nodes)appendSafeNode(target,node,false);
}
function mountAtOptionsBannerCode(target,code){
 // Adsterra atOptions/invoke.js units share the global `atOptions` variable.
 // Running several snippets in the page context can make every invoke.js read
 // the last unit's options. Give each banner its own document/global context.
 const doc=new DOMParser().parseFromString(String(code),'text/html');
 const scripts=[...doc.querySelectorAll('script')];
 const pairs=[];
 for(let i=0;i<scripts.length-1;i++){
   const inline=scripts[i];const invoke=scripts[i+1];
   if(!inline.src&&/\batOptions\s*=/.test(inline.textContent||'')&&/invoke\.js(?:[?#]|$)/i.test(invoke.getAttribute('src')||'')){
     pairs.push({html:inline.outerHTML+'\n'+invoke.outerHTML,source:(inline.textContent||'')+'\n'+(invoke.getAttribute('src')||'')});i++;
   }
 }
 if(!pairs.length)return false;
 const wrap=document.createElement('div');wrap.className='sl-admin-ad-slot sl-atoptions-banner-list';
 wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:100%;';
 for(const pair of pairs){
   const widthMatch=pair.source.match(/\bwidth\s*['"]?\s*:\s*(\d+)/i);
   const heightMatch=pair.source.match(/\bheight\s*['"]?\s*:\s*(\d+)/i);
   const width=Math.max(1,Math.min(970,Number(widthMatch?.[1]||320)));
   const height=Math.max(1,Math.min(600,Number(heightMatch?.[1]||100)));
   const frame=document.createElement('iframe');
   frame.title='Iklan Adsterra';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
   frame.style.cssText=`display:block;width:min(${width}px,100%);max-width:100%;height:${height}px;border:0;overflow:hidden;flex:0 0 auto;`;
   frame.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;width:100%;min-height:0;overflow:hidden}body{display:flex;justify-content:center;align-items:flex-start}body>iframe{max-width:100%!important}img{max-width:100%!important;height:auto}</style></head><body>'+pair.html+'</body></html>';
   wrap.appendChild(frame);
 }
 target.prepend(wrap);
 target.dataset.slAdMounted='true';
 target.classList.add('sl-atoptions-banner-loaded');
 return true;
}
function mountAdCode(target,code){
 if(!target||!code||target.dataset.slAdMounted==='true')return;
 target.classList.add('sl-ad-active');
 target.querySelectorAll(':scope > strong, :scope > p').forEach(el=>{el.hidden=true;});
 if(/\batOptions\s*=/.test(String(code))&&/invoke\.js/i.test(String(code))&&mountAtOptionsBannerCode(target,code))return;
 if(isGlobalCode(code)){
   target.dataset.slAdMounted='true';target.hidden=true;
   const doc=new DOMParser().parseFromString(String(code),'text/html');
   for(const node of [...doc.head.childNodes,...doc.body.childNodes])appendSafeNode(document.head,node,true);
   target.classList.add('sl-global-ad-loaded');
   target.setAttribute('aria-label','Iklan global telah dimuat');
   return;
 }
 const wrap=document.createElement('div');wrap.className='sl-admin-ad-slot';
 parseAndMount(wrap,code);target.prepend(wrap);
}
function ensurePageSlot(page,n,legacyTargets=[]){
 let target=document.querySelector(`[data-shortlink-ad-page="${page}"][data-shortlink-ad-slot="${n}"]`);if(target)return target;
 target=legacyTargets[n-1]||null;
 if(target&&!target.dataset.shortlinkAdPage){target.dataset.shortlinkAdPage=page;target.dataset.shortlinkAdSlot=String(n);return target;}
 target=document.createElement('div');target.className='ad task-ad-slot sl-generated-ad-slot';target.dataset.shortlinkAdPage=page;target.dataset.shortlinkAdSlot=String(n);target.innerHTML='<strong><i class="fa-solid fa-rectangle-ad"></i> Area iklan '+page.toUpperCase()+' '+n+'</strong><p>Iklan sponsor opsional; tidak perlu diklik untuk melanjutkan.</p>';
 const magazine=document.querySelector('.magazine');const sections=magazine?[...magazine.querySelectorAll('article,section.magazine-story,section.task3-step-section')]:[];
 if(magazine&&sections.length){const anchor=sections[Math.min(n-1,sections.length-1)];anchor.insertAdjacentElement('afterend',target);}else{const footer=document.querySelector('footer');if(footer)footer.insertAdjacentElement('beforebegin',target);else (document.querySelector('main')||document.body).appendChild(target);}return target;
}
async function run(){
 try{
   const c=window.SHOWLINK_SUPABASE||{};if(!window.supabase||!c.url||!c.anonKey)return;
   const sb=window.supabase.createClient(c.url,c.anonKey);
   const {data,error}=await sb.rpc('get_public_shortlink_control_settings');if(error||!data){console.warn('ShowLink: pengaturan iklan gagal dimuat',error?.message||'Tidak ada data');return;}
   const page=String(document.body.dataset.shortlinkPage||(document.body.dataset.shortlinkFinal==='true'?'final':''));
   const flowSettings=data.shortlink_flow||{};
   const tiers=flowSettings.ad_tiers||{};
   let intensity='medium';
   const params=new URLSearchParams(location.search);
   const slug=(params.get('slug')||params.get('code')||params.get('id')||'').trim();
   try{const cached=JSON.parse(sessionStorage.getItem('sl_data')||'{}');if(['low','medium','high'].includes(cached.ad_intensity))intensity=cached.ad_intensity;}catch(_){}
   if(/^[A-Za-z0-9_-]{3,40}$/.test(slug)){try{const {data:level,error:levelError}=await sb.rpc('get_shortlink_ad_intensity',{p_slug:slug});if(!levelError&&['low','medium','high'].includes(String(level)))intensity=String(level);}catch(_){}}
   const percent=({low:50,medium:75,high:100})[intensity]||75;
   // Per-page configured placement caps requested by the platform owner.
   // Low=7, Medium=14, High=28 independently on Task 1, Task 2, Task 3 and Final.
   // These are separate admin-configured placements, not forced repeat executions
   // of one Popunder/Social Bar script.
   const maxPageSlot=({low:7,medium:14,high:28})[intensity]||14;
   const maxLegacySlot=Math.ceil(10*percent/100);
   document.body.dataset.adIntensity=intensity;
   document.body.dataset.adIntensityPercent=String(percent);
   document.body.dataset.adIntensitySlotCap=String(maxPageSlot);
   const slots=Array.isArray(data.adsterra_slots)?data.adsterra_slots:[];
   // Task 1 slots 21–23 are a Popunder rotation pool. Load only one distinct
   // configured Popunder script per page visit; never force three popups at once.
   const task1PopunderPool=page==='task1'&&maxPageSlot>=21?slots.filter(slot=>slot&&slot.page==='task1'&&[21,22,23].includes(Number(slot.slot))&&slot.code&&slot.enabled!==false&&isGlobalCode(slot.code)):[];
   const chosenTask1Popunder=task1PopunderPool.length?task1PopunderPool[Math.floor(Math.random()*task1PopunderPool.length)]:null;
   const legacyTargets=[...document.querySelectorAll('[data-shortlink-ad-slot]:not([data-shortlink-ad-page])')];
   const hasPageSpecificSlots=slots.some(slot=>slot&&slot.page===page&&slot.code&&slot.enabled!==false);
   for(const slot of slots){
     const n=Number(slot.slot);if(!Number.isInteger(n)||!slot.code||slot.enabled===false)continue;
     if(page==='task1'&&[21,22,23].includes(n)&&slot!==chosenTask1Popunder)continue;
     if(slot.page){if(slot.page!==page||n<1||n>maxPageSlot)continue;mountAdCode(ensurePageSlot(page,n,legacyTargets),slot.code);}
     else {
       // Legacy configuration is a fallback only. Do not combine legacy and page-specific
       // slot sets on the same page, which would exceed the selected intensity budget.
       if(hasPageSpecificSlots||n<1||n>maxPageSlot)continue;
       const target=document.querySelector(`[data-shortlink-ad-slot="${n}"]:not([data-shortlink-ad-page])`);if(target)mountAdCode(target,slot.code);
     }
   }
   const placeholders=[...document.querySelectorAll('[data-shortlink-ad-slot]')];
   if(data.image_ad_enabled&&validHttp(data.image_ad_url)&&validHttp(data.image_ad_target_url)&&placeholders.length){const wrap=document.createElement('div');wrap.className='sl-admin-image-ad';const a=document.createElement('a');a.href=data.image_ad_target_url;a.target='_blank';a.rel='noopener noreferrer sponsored';const img=document.createElement('img');img.src=data.image_ad_url;img.alt='Iklan sponsor';img.loading='lazy';img.style.cssText='display:block;width:100%;height:auto;max-height:320px;object-fit:contain;border-radius:12px';a.appendChild(img);wrap.appendChild(a);placeholders[0].prepend(wrap);}
   if(data.image_ad_enabled&&validHttp(data.image_ad_url)&&validHttp(data.image_ad_target_url)){const area=document.getElementById('showlink-endorsement');if(area){area.querySelector('.endorsement-placeholder')?.remove();const link=document.createElement('a');link.className='sl-endorsement-button';link.href=data.image_ad_target_url;link.target='_blank';link.rel='noopener noreferrer sponsored';link.textContent='Kunjungi Sponsor';area.appendChild(link);}}
   const endorsements=Array.isArray(data.endorsement_slots)?data.endorsement_slots:[];
   document.querySelectorAll('[data-shortlink-endorsements]').forEach(area=>{area.replaceChildren();const position=area.dataset.shortlinkEndorsements;const selected=endorsements.filter(item=>item&&item.enabled===true&&validHttp(item.image_url)&&validHttp(item.target_url)&&(item.page===page||!item.page));const ordered=selected.filter(item=>!item.page);const pageItems=selected.filter(item=>item.page===page);const combined=[...pageItems,...ordered];const visible=position==='top'?combined.filter((item,index)=>Number(item.slot||index+1)%2===1).slice(0,1):position==='bottom'?combined.filter((item,index)=>Number(item.slot||index+1)%2===0).slice(0,1):combined;for(const item of visible){const a=document.createElement('a');a.className='sl-endorsement-card';a.href=item.target_url;a.target='_blank';a.rel='noopener noreferrer sponsored';const img=document.createElement('img');img.src=item.image_url;img.alt=String(item.alt||'Endorsement sponsor');img.loading='lazy';const label=document.createElement('span');label.textContent=String(item.title||'Endorsement sponsor');a.append(img,label);area.appendChild(a);}if(!area.children.length)area.remove();});
   if(document.body.dataset.shortlinkFinal==='true'&&data.shortlink_redirect_enabled){const b=document.getElementById('final-go');if(b){const adminUrl=String(data.shortlink_redirect_url||'').trim();if(validHttp(adminUrl))b.dataset.adminDestination=adminUrl;}}
 }catch(e){console.warn('ShowLink sponsor settings not applied',e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
