/* ShowLink task flow: timed progress is independent from ad clicks. */
(function(){
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const $=s=>document.querySelector(s);
  function countdown(status,ms,label){
    return new Promise(resolve=>{
      const start=Date.now(); status.innerHTML='';
      const wrap=document.createElement('div'); wrap.className='sl-countdown';
      const spinner=document.createElement('span'); spinner.className='sl-spinner'; spinner.setAttribute('aria-hidden','true');
      const text=document.createElement('span'); text.className='sl-countdown-text';
      const track=document.createElement('span'); track.className='sl-progress';
      const fill=document.createElement('span'); track.appendChild(fill); wrap.append(spinner,text,track); status.appendChild(wrap);
      function tick(){ const elapsed=Date.now()-start, left=Math.max(0,Math.ceil((ms-elapsed)/1000)); text.textContent=label+' '+left+' detik'; fill.style.width=Math.min(100,elapsed/ms*100)+'%'; if(elapsed>=ms){text.textContent=label+' selesai';fill.style.width='100%';resolve();}else requestAnimationFrame(tick); }
      tick();
    });
  }
  function scrollTo(el){(el||document.body).scrollIntoView({behavior:'smooth',block:'start'});}
  function setBusy(button,busy){if(button)button.disabled=!!busy;}
  function init(){
    if(!window.SLF)return;
    const F=window.SLF; const task=Number(document.body.dataset.task||1); const $status=$('#status'),$status2=$('#status2');
    const top=$('#top'),save=$('#save'),down=$('#down'),mid=$('#now'),up=$('#up'),next=$('#next'),success=$('#success');
    const nextPage=task===1?'task2.html':task===2?'task3.html':'shortlink-final.html';
    F.get().then(d=>{const title=$('#title');if(title)title.textContent=(d.title||'Shortlink')+' — Task '+task;}).catch(e=>{if($status)$status.textContent=e.message;});
    if(task<3){
      top?.addEventListener('click',async()=>{setBusy(top,true);await countdown($status,10000,'Menyiapkan langkah');top.classList.add('hide');save?.classList.remove('hide');down?.classList.remove('hide');});
      save?.addEventListener('click',()=>{const zone=$('[data-shortlink-ad-slot="1"]')||$('.ad-zone');scrollTo(zone);if($status)$status.textContent='Area sponsor ditampilkan secara opsional. Lanjutkan tanpa perlu mengeklik iklan.';});
      down?.addEventListener('click',()=>{scrollTo($('#bottom-step'));down.classList.add('hide');setTimeout(()=>mid?.classList.remove('hide'),450);});
      mid?.addEventListener('click',async()=>{setBusy(mid,true);await countdown($status2,7000,'Memproses langkah');mid.classList.add('hide');up?.classList.remove('hide');});
      up?.addEventListener('click',()=>{scrollTo(top);up.classList.add('hide');if(top){top.classList.add('hide');}setTimeout(()=>next?.classList.remove('hide'),450);});
      next?.addEventListener('click',async()=>{setBusy(next,true);await countdown($status,5000,'Menyelesaikan Task '+task);if(success){success.textContent='Success — Task '+task+' Done';success.classList.remove('hide');}next.textContent='Task '+(task+1);setTimeout(()=>F.go(nextPage),650);});
    } else {
      const steps=[...document.querySelectorAll('[data-step]')]; let completed=0;
      top?.addEventListener('click',async()=>{setBusy(top,true);await countdown($status,10000,'Menyiapkan Task 3');top.classList.add('hide');steps[0]?.classList.remove('hide');});
      steps.forEach((b,i)=>b.addEventListener('click',async()=>{if(i!==completed)return;setBusy(b,true);await countdown($status,5000,'Menyelesaikan langkah '+(i+1));b.textContent='Langkah '+(i+1)+' selesai';b.classList.add('is-done');completed++;if(steps[completed]){steps[completed].disabled=false;steps[completed].classList.remove('hide');scrollTo(steps[completed]);}else{const redirect=$('#redirect-final');redirect?.classList.remove('hide');scrollTo(redirect);}}));
      $('#redirect-final')?.addEventListener('click',()=>F.go('shortlink-final.html'));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
