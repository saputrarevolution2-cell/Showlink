(() => {
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function init(){
 const sb=await window.ShowLinkSupabase.load(); const {data:{session}}=await sb.auth.getSession(); if(!session)return location.replace('/login.html?redirect='+encodeURIComponent(location.pathname));
 const {data,error}=await sb.from('payment_links').select('id,slug,title,description,price,status,views,sales_count,created_at,updated_at').eq('owner_id',session.user.id).order('created_at',{ascending:false});
 if(error) throw error; const rows=data||[]; const body=$('#payment-links-body');
 if(!rows.length){body.innerHTML='<tr><td colspan="6" class="empty-state">Belum ada Payment Link. <a href="/payment-link.html">Buat sekarang</a>.</td></tr>';return;}
 body.innerHTML=rows.map(x=>`<tr><td><strong>${esc(x.title)}</strong><span class="sub">/p/${esc(x.slug)}</span></td><td>${money(x.price)}</td><td>${Number(x.views||0).toLocaleString('id-ID')}</td><td>${Number(x.sales_count||0).toLocaleString('id-ID')}</td><td><span class="status-chip ${esc(x.status)}">${esc(x.status)}</span></td><td><div class="row-actions"><a class="mini" href="/p/${encodeURIComponent(x.slug)}" target="_blank">Buka</a><button class="mini" data-copy="https://showlink.my.id/p/${encodeURIComponent(x.slug)}">Salin</button></div></td></tr>`).join('');
 body.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Tersalin';setTimeout(()=>b.textContent='Salin',1500)}catch(_){prompt('Salin URL:',b.dataset.copy)}});
}
document.addEventListener('DOMContentLoaded',()=>init().catch(e=>{console.error(e);const b=$('#payment-links-body');if(b)b.innerHTML=`<tr><td colspan="6">${esc(e.message||'Gagal memuat Payment Link')}</td></tr>`}));
})();