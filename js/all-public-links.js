(() => {
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const translations={
  id:{kicker:'SHOWLINK · TAUTAN PUBLIK',title:'Semua tautan publik',description:'Jelajahi tautan yang dibagikan secara publik oleh pengguna ShowLink.',back:'Kembali ke Dashboard',loading:'Memuat tautan publik…',empty:'Belum ada tautan publik.',error:'Gagal memuat tautan publik. Pastikan PUBLIC-PRIVATE-LINKS-MIGRATION.sql sudah dijalankan di Supabase.',open:'Buka tautan'},
  en:{kicker:'SHOWLINK · PUBLIC LINKS',title:'All Public Links',description:'Explore links publicly shared by ShowLink users.',back:'Back to Dashboard',loading:'Loading public links…',empty:'There are no public links yet.',error:'Could not load public links. Make sure PUBLIC-PRIVATE-LINKS-MIGRATION.sql has been run in Supabase.',open:'Open link'}
 };
 const lang=()=>{const x=localStorage.getItem('showlink_language')||localStorage.getItem('showlink-language')||localStorage.getItem('language')||document.documentElement.lang||'id';return /^en/i.test(x)?'en':'id'};
 const applyLanguage=()=>{const d=translations[lang()];document.documentElement.lang=lang();document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(d[k])el.textContent=d[k]})};
 async function load(){
  applyLanguage();const d=translations[lang()],status=$('#public-links-status'),list=$('#public-links-list');
  status.textContent=d.loading;list.innerHTML='';
  try{
   const sb=await window.ShowLinkSupabase.load();
   const {data,error}=await sb.rpc('get_all_public_links');if(error)throw error;
   const rows=Array.isArray(data)?data:(data||[]);
   if(!rows.length){status.textContent=d.empty;return}
   status.textContent=`${rows.length} ${lang()==='en'?'public links':'tautan publik'}`;
   list.innerHTML=rows.map(r=>`<article class="public-link-item"><span class="public-link-type">${esc(r.type)}</span><strong>${esc(r.title||r.type)}</strong><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(d.open)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a><small>${esc(new Date(r.created_at).toLocaleDateString(lang()==='en'?'en-US':'id-ID'))}</small></article>`).join('');
  }catch(e){status.textContent=d.error;console.error(e)}
 }
 document.addEventListener('DOMContentLoaded',load);
 window.addEventListener('storage',load);
 document.addEventListener('showlink:language-changed',load);
})();
