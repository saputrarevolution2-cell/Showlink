/* ShowLink — shared imported footer */
(() => {
  "use strict";
  async function render(){const host=document.querySelector("[data-showlink-footer]");if(!host)return;try{const r=await fetch("/components/footer.html",{cache:"no-store"});if(!r.ok)throw new Error(`footer.html ${r.status}`);host.innerHTML=await r.text();const y=new Date().getFullYear();const c=host.querySelector("[data-footer-copyright]");if(c)c.textContent=(window.ShowLinkLanguage?.t?.("copyright")||`© ${y} ShowLink. All rights reserved and di awasi BI and OJK.`).replace("{year}",y);document.body.classList.add("showlink-footer-page");window.dispatchEvent(new CustomEvent("showlink:footer-rendered"));}catch(e){console.error("ShowLink footer import failed:",e);}}
  window.ShowLinkFooter={render,refresh:render};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();
