(()=>{
const $=s=>document.querySelector(s);
const slug=String(window.__SHOWLINK_PASTELINK_SLUG||new URLSearchParams(location.search).get('slug')||location.pathname.split('/').filter(Boolean).pop()||'').trim();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tr(key,fallback){const lang=(localStorage.getItem('showlink-language')||document.documentElement.lang||'id').toLowerCase().startsWith('en')?'en':'id';const dict={id:{promoTitle:'Daftar dan dapatkan penghasilan dengan Shortlink CPM tinggi',promoDescription:'Gunakan PaymentLink dengan akses langsung dan mulai bagikan link kamu.',promoJoin:'Gabung',metaCreated:'Dibuat',metaExpiry:'Kedaluwarsa',metaNever:'Tidak kedaluwarsa',metaViews:'Total dilihat',humanTitle:'Konfirmasi Bahwa Anda Manusia',humanDescription:'Selesaikan pemeriksaan keamanan berikut untuk memverifikasi koneksi sebelum melihat PasteLink ini.',humanCheckbox:'Saya bukan robot',humanStatus:'Pemeriksaan keamanan',humanFootnote:'Koneksi Anda akan diperiksa sebelum PasteLink ditampilkan.',humanContinue:'Lanjutkan',humanVerified:'Koneksi berhasil diperiksa',loading:'Memuat PasteLink…',missing:'PasteLink tidak ditemukan atau sudah kedaluwarsa.',badSlug:'Slug PasteLink tidak valid.',loadFail:'PasteLink tidak dapat dibuka',passwordPrompt:'Masukkan kata sandi untuk membuka PasteLink',passwordRequired:'PasteLink ini membutuhkan kata sandi.',passwordMissing:'Masukkan kata sandi terlebih dahulu.',passwordWrong:'Kata sandi salah. Coba lagi.',passwordRight:'Kata sandi benar! PasteLink berhasil dibuka.',copyOk:'Teks berhasil disalin.',copyFail:'Gagal menyalin. Coba tombol Salin semua teks.'},en:{promoTitle:'Register and earn with high-CPM shortlinks',promoDescription:'Use instant-access PaymentLinks and start sharing your links.',promoJoin:'Join',metaCreated:'Created',metaExpiry:'Expires',metaNever:'Never expires',metaViews:'Total views',humanTitle:'Confirm You Are Human',humanDescription:'Please complete the security check below to verify your connection before viewing this paste.',humanCheckbox:"I'm not a robot",humanStatus:'Security check',humanFootnote:'Your connection is checked before the paste is displayed.',humanContinue:'Continue',humanVerified:'Connection check complete',loading:'Loading PasteLink…',missing:'PasteLink was not found or has expired.',badSlug:'Invalid PasteLink slug.',loadFail:'Unable to open PasteLink',passwordPrompt:'Enter the password to open this PasteLink',passwordRequired:'This PasteLink requires a password.',passwordMissing:'Please enter a password first.',passwordWrong:'Incorrect password. Please try again.',passwordRight:'Correct password! PasteLink opened successfully.',copyOk:'Text copied successfully.',copyFail:'Could not copy. Try the Copy all text button.'}};return dict[lang][key]||fallback||key}
let toastTimer;
function toast(text,kind='info'){
 let el=document.getElementById('paste-toast');
 if(!el){el=document.createElement('div');el.id='paste-toast';el.className='paste-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el)}
 el.className='paste-toast is-visible '+kind;el.textContent=text;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.classList.remove('is-visible');setTimeout(()=>{if(!el.classList.contains('is-visible'))el.textContent=''},250)},2000);
}
function render(text){
 // Render each source line as its own block. Do not rely on CSS white-space
 // alone: global paragraph styles can otherwise collapse the visual spacing.
 const lines=String(text??'').replace(/\r\n?/g,'\n').split('\n');
 return lines.map(line=>{
  if(line==='') return '<div class="paste-copy-line paste-empty-line" aria-hidden="true">&nbsp;</div>';
  const quoted=line.startsWith('> ');
  let s=esc(quoted?line.slice(2):line);
  s=s.replace(/~~(.+?)~~/g,'<del>$1</del>')
     .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
     .replace(/\*(.+?)\*/g,'<em>$1</em>');
  s=s.replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,u=>{
   const clean=u.replace(/[.,!?;:)\]]+$/,'');const tail=u.slice(clean.length);
   const href=clean.startsWith('www.')?'https://'+clean:clean;
   return '<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+clean+'</a>'+tail;
  });
  return quoted
   ? '<div class="paste-copy-line paste-quote" title="Ketuk untuk menyalin baris ini">'+s+'</div>'
   : '<div class="paste-copy-line" title="Ketuk untuk menyalin baris ini">'+s+'</div>';
 }).join('');
}
async function copy(t){
 try{
  if(navigator.clipboard&&navigator.clipboard.writeText) await navigator.clipboard.writeText(t);
  else {const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();if(!ok)throw new Error('copy failed');}
  $('#view-message').textContent=tr('copyOk');
 }catch{$('#view-message').textContent=tr('copyFail')}
}
async function init(){
 const box=$('#view-password-box'), input=$('#view-password'), unlock=$('#unlock-paste'), loading=$('#paste-loading'), content=$('#view-content'), copyAll=$('#copy-all'), message=$('#view-message');
 loading.hidden=false; box.hidden=true; content.hidden=true; copyAll.hidden=true; message.hidden=true; $('#view-title').hidden=true;
 async function loadPaste(password){
  const c=await window.ShowLinkSupabase.load();
  const {data,error}=await c.rpc('get_pastelink',{p_slug:slug,p_password:password||null});
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row){const err=new Error(tr('missing'));err.code='PASTE_NOT_FOUND';throw err}
  if(row.password_required){loading.hidden=true;box.hidden=false;content.hidden=true;copyAll.hidden=true;$('#view-title').hidden=true;message.hidden=true;
   if(password){$('#paste-mood-icon').className='fa-solid fa-face-angry';$('#paste-mood').classList.add('is-wrong');$('#paste-mood').classList.remove('is-correct');toast(tr('passwordWrong'),'error')}else toast(tr('passwordRequired'),'info');return false}
  if(row.content==null){throw new Error('Isi PasteLink tidak tersedia.')}
  box.hidden=true;loading.hidden=true;$('#view-title').hidden=true;content.hidden=true;copyAll.hidden=true;message.hidden=true;
  $('#paste-mood-icon').className='fa-solid fa-face-smile';$('#paste-mood').classList.remove('is-wrong');
  if(password){$('#paste-mood').classList.add('is-correct');toast(tr('passwordRight'),'success');await new Promise(r=>setTimeout(r,2100));}
  $('#view-title').textContent=row.title||'PasteLink';$('#view-title').hidden=false;
  const meta=$('#paste-metadata');
  const dateFmt=value=>{if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';return new Intl.DateTimeFormat((localStorage.getItem('showlink-language')||'id').startsWith('en')?'en-US':'id-ID',{dateStyle:'medium',timeStyle:'short'}).format(d)};
  $('#meta-created').textContent=dateFmt(row.created_at);
  $('#meta-expiry').textContent=row.expires_at?dateFmt(row.expires_at):tr('metaNever','Tidak kedaluwarsa');
  $('#meta-views').textContent=Number(row.views??row.total_views??0).toLocaleString((localStorage.getItem('showlink-language')||'id').startsWith('en')?'en-US':'id-ID');
  meta.hidden=false;
  content.innerHTML=render(row.content);content.hidden=false;copyAll.hidden=false;
  content.onclick=e=>{if(e.target.closest('a'))return;const p=e.target.closest('.paste-copy-line:not(.paste-empty-line)');if(p&&!p.classList.contains('paste-empty-line'))copy(p.textContent)};
  copyAll.onclick=()=>copy(row.content.replace(/^> ?/gm,'').replace(/~~(.+?)~~/gs,'$1').replace(/\*\*(.+?)\*\*/gs,'$1').replace(/\*(.+?)\*/gs,'$1'));
  document.title=(row.title||'PasteLink')+' — ShowLink';return true;
 }

 try{
  if(!slug||slug==='pastelink-view.html')throw new Error(tr('badSlug'));
  loading.hidden=false;
  const progress=$('#paste-loading-progress');let pct=0;const ticker=setInterval(()=>{pct=Math.min(95,pct+5);if(progress)progress.style.width=pct+'%'},250);const began=Date.now();
  try{await loadPaste(null);await new Promise(r=>setTimeout(r,Math.max(0,5000-(Date.now()-began))));}finally{clearInterval(ticker);if(progress)progress.style.width='100%';}
  unlock.onclick=async()=>{if(!input.value){toast(tr('passwordMissing'),'error');return}unlock.disabled=true;message.hidden=true;$('#paste-mood-icon').className='fa-solid fa-robot fa-bounce';$('#paste-mood').classList.remove('is-wrong','is-correct');try{const opened=await loadPaste(input.value);}catch(e){$('#paste-mood-icon').className='fa-solid fa-face-angry';$('#paste-mood').classList.add('is-wrong');toast(tr('passwordWrong'),'error')}finally{unlock.disabled=false}};
 }catch(e){
  loading.hidden=true;box.hidden=true;content.hidden=true;$('#view-title').hidden=false;$('#view-title').textContent=tr('loadFail');
  message.hidden=true;toast(e.message||'Gagal memuat PasteLink.','error');
  copyAll.hidden=true;
 }
}
document.addEventListener('DOMContentLoaded',()=>{
 const gate=document.getElementById('paste-human-check'),check=document.getElementById('human-confirm'),go=document.getElementById('human-continue'),status=document.getElementById('human-status'),statusText=status?.querySelector('span:last-child'),card=document.getElementById('paste-content-card');
 const lang=(localStorage.getItem('showlink-language')||document.documentElement.lang||'id').toLowerCase().startsWith('en')?'en':'id';
 const copy={id:{promoTitle:'Daftar dan dapatkan penghasilan dengan Shortlink CPM tinggi',promoDescription:'Gunakan PaymentLink dengan akses langsung dan mulai bagikan link kamu.',promoJoin:'Gabung',created:'Dibuat',expiry:'Kedaluwarsa',never:'Tidak kedaluwarsa',views:'Total dilihat',title:'Konfirmasi Bahwa Anda Manusia',description:'Selesaikan pemeriksaan keamanan berikut untuk memverifikasi koneksi sebelum melihat PasteLink ini.',checkbox:'Saya bukan robot',status:'Pemeriksaan keamanan',foot:'Koneksi Anda akan diperiksa sebelum PasteLink ditampilkan.',continue:'Lanjutkan',working:'Memeriksa koneksi…',done:'Pemeriksaan selesai'},en:{promoTitle:'Register and earn with high-CPM shortlinks',promoDescription:'Use instant-access PaymentLinks and start sharing your links.',promoJoin:'Join',created:'Created',expiry:'Expires',never:'Never expires',views:'Total views',title:'Confirm You Are Human',description:'Please complete the security check below to verify your connection before viewing this paste.',checkbox:"I'm not a robot",status:'Security check',foot:'Your connection is checked before the paste is displayed.',continue:'Continue',working:'Checking your connection…',done:'Security check complete'}}[lang];
 document.documentElement.lang=lang;
 const promoTitle=document.querySelector('[data-promo-title]'),promoDescription=document.querySelector('[data-promo-description]'),promoJoin=document.querySelector('[data-promo-join]');
 if(promoTitle)promoTitle.textContent=copy.promoTitle;if(promoDescription)promoDescription.textContent=copy.promoDescription;if(promoJoin){promoJoin.innerHTML=copy.promoJoin+' <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';promoJoin.href='/register.html';}
 const mc=document.querySelector('[data-meta-created-label]'),me=document.querySelector('[data-meta-expiry-label]'),mv=document.querySelector('[data-meta-views-label]');if(mc)mc.textContent=copy.created;if(me)me.textContent=copy.expiry;if(mv)mv.textContent=copy.views;
 document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.getAttribute('data-i18n');const map={pasteViewCreate:lang==='en'?'Create PasteLink':'Buat PasteLink',pasteViewLoading:lang==='en'?'Loading PasteLink…':'Memuat PasteLink…'};if(map[k])el.textContent=map[k]});
 if(gate&&check&&go&&card){document.querySelector('[data-i18n="humanTitle"]').textContent=copy.title;document.querySelector('[data-i18n="humanDescription"]').textContent=copy.description;document.querySelector('[data-i18n="humanCheckbox"]').textContent=copy.checkbox;document.querySelector('[data-i18n="humanStatus"]').textContent=copy.status;document.querySelector('[data-i18n="humanFootnote"]').textContent=copy.foot;go.textContent=copy.continue;
 let verificationTimer=null,verified=false;
 go.disabled=true;
 check.addEventListener('change',()=>{
  if(verificationTimer){clearInterval(verificationTimer);verificationTimer=null;}
  verified=false;go.disabled=true;status.classList.remove('is-success');
  if(!check.checked){status.classList.remove('is-loading');if(statusText)statusText.textContent=copy.status;return;}
  let seconds=3;status.classList.add('is-loading');if(statusText)statusText.textContent=copy.working+' 3…';
  verificationTimer=setInterval(()=>{seconds--;if(seconds>0){if(statusText)statusText.textContent=copy.working+' '+seconds+'…';return;}
   clearInterval(verificationTimer);verificationTimer=null;verified=true;status.classList.remove('is-loading');status.classList.add('is-success');if(statusText)statusText.textContent=copy.done;go.disabled=false;
  },1000);
 });
 go.addEventListener('click',()=>{if(!check.checked||!verified)return;go.disabled=true;check.disabled=true;gate.hidden=true;card.hidden=false;init()});
 // Respond immediately when the shared navbar language selector changes.
 window.addEventListener('showlink:language-change',()=>{const next=(localStorage.getItem('showlink-language')||'id').toLowerCase().startsWith('en')?'en':'id';if(next!==lang)location.reload();});
 }else init();
});
})();