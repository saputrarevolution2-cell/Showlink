(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const escapeHtml = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  const normalizeUrl = v => /^www\./i.test(v) ? `https://${v}` : v;
  const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
  function linkify(text){
    return escapeHtml(text).replace(URL_RE, match => {
      const trailing = match.match(/[.,!?;:)\]}]+$/)?.[0] || "";
      const clean = trailing ? match.slice(0,-trailing.length) : match;
      return `<a href="${escapeHtml(normalizeUrl(clean))}" target="_blank" rel="noopener noreferrer">${escapeHtml(clean)}</a>${escapeHtml(trailing)}`;
    }).replace(/\r?\n/g,"<br>");
  }
  function result(msg,type="info") { const box=$("#pastelink-result"); if(!box)return; box.hidden=false; box.className=`pl-result ${type}`; box.innerHTML=msg; }
  function warn(name, show){ document.querySelector(`[data-warning="${name}"]`)?.classList.toggle("show",show); }
  async function init(){
    const form=$("#pastelink-form"); if(!form)return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const title=form.elements.title.value.trim(), description=form.elements.description.value.trim(), content=form.elements.content.value.trim();
      warn("title",!title); warn("content",!content); if(!title||!content)return;
      const button=form.querySelector("button[type=submit]"), original=button.innerHTML; button.disabled=true; button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i><span>Membuat PasteLink...</span>'; result("Sedang membuat PasteLink...","loading");
      try{
        const sb=await window.ShowLinkSupabase.load();
        const {data:sessionData,error:sessionError}=await sb.auth.getSession();
        if(sessionError||!sessionData?.session) throw new Error("Silakan login terlebih dahulu untuk membuat PasteLink.");
        const tags=form.elements.tags.value.split(",").map(x=>x.trim()).filter(Boolean).slice(0,20);
        const {data,error}=await sb.rpc("create_pastelink",{p_title:title,p_description:description,p_content_html:linkify(content),p_content_text:content,p_thumbnail_url:null,p_tags:tags,p_password_hash:null,p_visibility:form.elements.visibility.value});
        if(error)throw error;
        const row=Array.isArray(data)?data[0]:data;
        if(!row?.url)throw new Error("PasteLink berhasil dibuat tetapi URL tidak ditemukan.");
        result(`PasteLink berhasil dibuat.<br><a href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.url)}</a>`,"success");
        form.reset();
      }catch(err){
        console.error("[ShowLink] create_pastelink",err);
        const raw=String(err?.message||"");
        const msg=raw.includes("AUTH_REQUIRED")?"Silakan login terlebih dahulu untuk membuat PasteLink.":raw||"Gagal membuat PasteLink. Silakan coba lagi.";
        result(escapeHtml(msg),"error");
      }finally{button.disabled=false;button.innerHTML=original;}
    });
  }
  document.addEventListener("DOMContentLoaded",init);
})();
