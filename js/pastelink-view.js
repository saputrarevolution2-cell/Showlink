(()=>{
const $=s=>document.querySelector(s);
const slug=String(window.__SHOWLINK_PASTELINK_SLUG||new URLSearchParams(location.search).get('slug')||location.pathname.split('/').filter(Boolean).pop()||'').trim();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function tr(key,fallback){const lang=(document.documentElement.lang||'id').toLowerCase().startsWith('en')?'en':'id';const dict={id:{loading:'Memuat PasteLink…',missing:'PasteLink tidak ditemukan atau sudah kedaluwarsa.',badSlug:'Slug PasteLink tidak valid.',loadFail:'PasteLink tidak dapat dibuka',passwordPrompt:'Masukkan kata sandi untuk membuka PasteLink',passwordRequired:'PasteLink ini membutuhkan kata sandi.',passwordMissing:'Masukkan kata sandi terlebih dahulu.',passwordWrong:'Kata sandi salah. Coba lagi.',passwordRight:'Kata sandi benar! PasteLink berhasil dibuka.',copyOk:'Teks berhasil disalin.',copyFail:'Gagal menyalin. Coba tombol Salin semua teks.'},en:{loading:'Loading PasteLink…',missing:'PasteLink was not found or has expired.',badSlug:'Invalid PasteLink slug.',loadFail:'Unable to open PasteLink',passwordPrompt:'Enter the password to open this PasteLink',passwordRequired:'This PasteLink requires a password.',passwordMissing:'Please enter a password first.',passwordWrong:'Incorrect password. Please try again.',passwordRight:'Correct password! PasteLink opened successfully.',copyOk:'Text copied successfully.',copyFail:'Could not copy. Try the Copy all text button.'}};return dict[lang][key]||fallback||key}
function render(text){
 return String(text).split('\n').map(line=>{
  if(!line)return '<p class="paste-empty-line">&nbsp;</p>';
  const quoted=line.startsWith('> ');
  let s=esc(quoted?line.slice(2):line);
  s=s.replace(/~~(.+?)~~/gs,'<del>$1</del>').replace(/\*\*(.+?)\*\*/gs,'<strong>$1</strong>').replace(/\*(.+?)\*/gs,'<em>$1</em>');
  s=s.replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g,u=>{
   const clean=u.replace(/[.,!?;:)\]]+$/,'');const tail=u.slice(clean.length);
   const href=clean.startsWith('www.')?'https://'+clean:clean;
   return '<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+clean+'</a>'+tail;
  });
  return quoted?'<blockquote class="paste-quote paste-copy-line" title="Ketuk untuk menyalin baris ini">'+s+'</blockquote>':'<p class="paste-copy-line" title="Ketuk untuk menyalin baris ini">'+s+'</p>';
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
 const box=$('#view-password-box'), input=$('#view-password'), unlock=$('#unlock-paste');
 async function loadPaste(password){
  const c=await window.ShowLinkSupabase.load();
  const {data,error}=await c.rpc('get_pastelink',{p_slug:slug,p_password:password||null});
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row){const err=new Error(tr('missing'));err.code='PASTE_NOT_FOUND';throw err}
  if(row.password_required){box.hidden=false;$('#view-title').hidden=true;$('#view-message').textContent=password?tr('passwordWrong'):tr('passwordRequired');if(password){$('#paste-mood-icon').className='fa-solid fa-face-angry';$('#paste-mood').classList.add('is-wrong');}return false}
  box.hidden=true;$('#paste-loading').hidden=true;$('#view-title').hidden=false;$('#paste-mood-icon').className='fa-solid fa-face-smile';$('#paste-mood').classList.remove('is-wrong');if(password){$('#view-message').textContent=tr('passwordRight');$('#paste-mood').classList.add('is-correct');} 
  if(!row.content){throw new Error('Isi PasteLink tidak tersedia.')}
  $('#view-title').textContent=row.title||'PasteLink';
  $('#view-content').innerHTML=render(row.content);
  $('#view-content').addEventListener('click',e=>{
    if(e.target.closest('a'))return;
    const p=e.target.closest('p');
    if(p&&!p.classList.contains('paste-empty-line'))copy(p.textContent);
    const q=e.target.closest('blockquote.paste-copy-line');if(q)copy(q.textContent);
  });
  $('#copy-all').onclick=()=>copy(row.content.replace(/^> ?/gm,'').replace(/~~(.+?)~~/gs,'$1').replace(/\*\*(.+?)\*\*/gs,'$1').replace(/\*(.+?)\*/gs,'$1'));
  document.title=(row.title||'PasteLink')+' — ShowLink';
 }
 try{
  if(!slug||slug==='pastelink-view.html')throw new Error(tr('badSlug'));
  const loading=$('#paste-loading');loading.hidden=false;
  await loadPaste(null);
  unlock.onclick=async()=>{if(!input.value){$('#view-message').textContent=tr('passwordMissing');return}unlock.disabled=true;$('#view-message').textContent=tr('loading');$('#paste-mood-icon').className='fa-solid fa-robot fa-bounce';$('#paste-mood').classList.remove('is-wrong','is-correct');try{const opened=await loadPaste(input.value);if(opened===false){$('#paste-mood-icon').className='fa-solid fa-face-angry';$('#paste-mood').classList.add('is-wrong');$('#view-message').textContent=tr('passwordWrong');}}catch(e){$('#paste-mood-icon').className='fa-solid fa-face-angry';$('#paste-mood').classList.add('is-wrong');$('#view-message').textContent=tr('passwordWrong')}finally{unlock.disabled=false}};
 }catch(e){
  $('#paste-loading').hidden=true;$('#view-title').hidden=false;$('#view-title').textContent=tr('loadFail');
  $('#view-message').textContent=e.message||'Gagal memuat PasteLink.';
  $('#copy-all').hidden=true;
 }
}
document.addEventListener('DOMContentLoaded',init);
})();