(()=>{
const $=s=>document.querySelector(s);
const slug=location.pathname.split('/').filter(Boolean).pop();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  $('#view-message').textContent='Teks berhasil disalin.';
 }catch{$('#view-message').textContent='Gagal menyalin. Coba tombol Salin semua teks.'}
}
async function init(){
 try{
  if(!slug||slug==='pastelink-view.html')throw new Error('Slug PasteLink tidak valid.');
  const c=await window.ShowLinkSupabase.load();
  const {data,error}=await c.rpc('get_pastelink',{p_slug:slug});
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row||!row.content)throw new Error('PasteLink tidak ditemukan.');
  $('#view-title').textContent=row.title||'PasteLink';
  $('#view-content').innerHTML=render(row.content);
  $('#view-content').addEventListener('click',e=>{
    if(e.target.closest('a'))return;
    const p=e.target.closest('p');
    if(p&&!p.classList.contains('paste-empty-line'))copy(p.textContent);const q=e.target.closest('blockquote.paste-copy-line');if(q)copy(q.textContent);
  });
  $('#copy-all').onclick=()=>copy(row.content.replace(/^> ?/gm,'').replace(/~~(.+?)~~/gs,'$1').replace(/\*\*(.+?)\*\*/gs,'$1').replace(/\*(.+?)\*/gs,'$1'));
  document.title=(row.title||'PasteLink')+' — ShowLink';
 }catch(e){
  $('#view-title').textContent='PasteLink tidak ditemukan';
  $('#view-message').textContent=e.message||'Gagal memuat PasteLink.';
  $('#copy-all').hidden=true;
 }
}
document.addEventListener('DOMContentLoaded',init);
})();