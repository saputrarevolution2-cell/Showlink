(()=>{
const $=s=>document.querySelector(s);
const editor=$('#paste-content'),msg=$('#paste-message'),btn=$('#create-paste');
const plain=()=>editor.innerText.replace(/\u00a0/g,' ');
function markdown(node){
 // Convert editor DOM to text while preserving explicit BRs and block boundaries.
 // Return line-oriented content; never concatenate separate block elements.
 if(node.nodeType===Node.TEXT_NODE)return node.nodeValue.replace(/\r\n?/g,'\n');
 if(node.nodeType!==Node.ELEMENT_NODE)return '';
 const tag=node.tagName.toLowerCase();
 if(tag==='br')return '\n';
 const blocks=['div','p','li','pre','h1','h2','h3','h4','h5','h6','blockquote'];
 let inner='';
 for(const child of Array.from(node.childNodes)){
  const isBlock=child.nodeType===Node.ELEMENT_NODE && blocks.includes(child.tagName.toLowerCase());
  if(isBlock && inner && !inner.endsWith('\n')) inner+='\n';
  inner+=markdown(child);
  if(isBlock && !inner.endsWith('\n')) inner+='\n';
 }
 if(tag==='b'||tag==='strong')return inner.trim()?`**${inner}**`:inner;
 if(tag==='i'||tag==='em')return inner.trim()?`*${inner}*`:inner;
 if(tag==='s'||tag==='strike'||tag==='del')return inner.trim()?`~~${inner}~~`:inner;
 if(tag==='blockquote')return inner.replace(/\n+$/,'').split('\n').map(line=>line?'> '+line:'>').join('\n')+'\n';
 if(blocks.includes(tag))return inner.replace(/\n+$/,'')+'\n';
 return inner;
}
function editorMarkdown(){
 // Use a single recursive DOM serialization so boundaries are preserved whether
 // iOS Safari represents Enter as BR, DIV/P blocks, or a bare text node + block.
 let text='';
 const blocks=['div','p','li','pre','h1','h2','h3','h4','h5','h6','blockquote'];
 for(const node of Array.from(editor.childNodes)){
  const isBlock=node.nodeType===Node.ELEMENT_NODE && blocks.includes(node.tagName.toLowerCase());
  if(isBlock && text && !text.endsWith('\n')) text+='\n';
  text+=markdown(node);
  if(isBlock && !text.endsWith('\n')) text+='\n';
 }
 return text.replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function selectedText(){const sel=window.getSelection();return sel?sel.toString():''}
function format(cmd){
  if(!selectedText()){msg.textContent='Pilih teks dulu untuk diformat.';return}
  editor.focus();
  if(cmd==='bold'||cmd==='italic')document.execCommand(cmd,false,null);
  else if(cmd==='strike')document.execCommand('strikeThrough',false,null);
  else if(cmd==='quote'){const sel=window.getSelection();let node=sel&&sel.anchorNode;while(node&&node!==editor&&node.parentElement!==editor)node=node.parentNode;if(node&&node!==editor&&node.nodeType===Node.ELEMENT_NODE&&node.tagName.toLowerCase()==='blockquote')document.execCommand('formatBlock',false,'div');else document.execCommand('formatBlock',false,'blockquote');}
  msg.textContent='';
}
document.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>format(b.dataset.format)));
$('#copy-selected').addEventListener('click',async()=>{
 const s=selectedText(); if(!s){msg.textContent='Pilih teks yang ingin disalin.';return}
 try{await navigator.clipboard.writeText(s);msg.textContent='Teks berhasil disalin.'}
 catch{msg.textContent='Clipboard tidak tersedia; salin teks pilihan secara manual.'}
});
editor.addEventListener('paste',e=>{
 e.preventDefault();
 const text=(e.clipboardData||window.clipboardData).getData('text/plain').replace(/\r\n?/g,'\n');
 const html=text.split('\n').map(line=>line?line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'<br>').join('<br>');
 document.execCommand('insertHTML',false,html);
});
btn.addEventListener('click',async()=>{
 const text=editorMarkdown();
 const title=$('#paste-title').value.trim();
 const password=$('#paste-password').value;
 const expiry=$('#paste-expiry').value;
 if(!text){msg.textContent='Isi PasteLink tidak boleh kosong.';return}
 btn.disabled=true;msg.textContent='Menyimpan…';
 try{
  const c=await window.ShowLinkSupabase.load();
  const {data,error}=await c.rpc('create_pastelink',{p_title:title||'PasteLink',p_content:text,p_password:password||null,p_expiry_hours:expiry?Number(expiry):null});
  if(error)throw error;
  const slug=data?.slug||data?.[0]?.slug;
  if(!slug)throw new Error('Database tidak mengembalikan slug. Periksa SQL migration sudah dijalankan.');
  const url=location.origin+'/a/'+slug;
  $('#paste-result').hidden=false;
  $('#paste-result').innerHTML='<strong>PasteLink berhasil dibuat!</strong><a id="paste-url" href="'+url+'">'+url+'</a><button type="button" id="copy-url"><i class="fa-regular fa-copy"></i> Salin tautan</button><a class="paste-open" href="'+url+'" target="_blank" rel="noopener">Buka PasteLink</a>';
  $('#copy-url').onclick=async()=>{try{await navigator.clipboard.writeText(url);msg.textContent='Tautan disalin.'}catch{msg.textContent='Salin tautan dari alamat di atas.'}};
  msg.textContent='Berhasil disimpan.';
  $('#paste-password').value=''; $('#paste-expiry').value='';
 }catch(e){msg.textContent=(e.message||'Gagal menyimpan.')+' Jika tabel belum tersedia, jalankan file SQL migration yang disertakan di ZIP.'}
 finally{btn.disabled=false}
});
})();