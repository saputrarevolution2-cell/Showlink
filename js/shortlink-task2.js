/* ShowLink task flow: reliable completion state and visible redirect loading. */
(function(){
 const $=s=>document.querySelector(s);
 function countdown(status,ms,label){return new Promise(resolve=>{if(!status){setTimeout(resolve,ms);return;}status.innerHTML='';const wrap=document.createElement('div');wrap.className='sl-countdown';const spinner=document.createElement('span');spinner.className='sl-spinner';spinner.setAttribute('aria-hidden','true');const text=document.createElement('span');text.className='sl-countdown-text';const track=document.createElement('span');track.className='sl-progress';const fill=document.createElement('span');track.appendChild(fill);wrap.append(spinner,text,track);status.appendChild(wrap);const start=Date.now();function tick(){const elapsed=Date.now()-start,left=Math.max(0,Math.ceil((ms-elapsed)/1000));text.textContent=label+' '+left+' detik';fill.style.width=Math.min(100,elapsed/ms*100)+'%';if(elapsed>=ms){text.textContent=label+' selesai';fill.style.width='100%';resolve();}else requestAnimationFrame(tick);}tick();});}
 function scrollTo(el){if(el)el.scrollIntoView({behavior:'smooth',block:'start'});}
 function busy(b,v){if(b)b.disabled=!!v;}
 function init(){if(!window.SLF)return;const F=window.SLF,task=Number(document.body.dataset.task||1),status=$('#status'),status2=$('#status2'),top=$('#top'),save=$('#save'),down=$('#down'),mid=$('#now'),up=$('#up'),next=$('#next'),success=$('#success');const nextPage=task===1?'task2.html':task===2?'task3.html':'shortlink-final.html';let taskDone=false,opening=false;
  F.get().then(d=>{const title=$('#title');if(title)title.textContent=(d.title||'Shortlink')+' — Task '+task;}).catch(e=>{if(status)status.textContent=e.message;});
  if(task<3){
   top?.addEventListener('click',async()=>{if(top.disabled)return;busy(top,true);await countdown(status,10000,'Menyiapkan langkah');top.classList.add('hide');save?.classList.remove('hide');down?.classList.remove('hide');busy(top,false);});
   save?.addEventListener('click',()=>{const zone=$('[data-shortlink-ad-slot="1"]');if(zone)scrollTo(zone);if(status)status.textContent='Area sponsor ditampilkan. Klik iklan tidak diperlukan untuk menyelesaikan task.';});
   down?.addEventListener('click',()=>{down.classList.add('hide');scrollTo($('#bottom-step'));setTimeout(()=>mid?.classList.remove('hide'),450);});
   mid?.addEventListener('click',async()=>{if(mid.disabled)return;busy(mid,true);await countdown(status2,7000,'Memproses langkah');mid.classList.add('hide');up?.classList.remove('hide');busy(mid,false);});
   up?.addEventListener('click',()=>{up.classList.add('hide');top?.classList.add('hide');scrollTo($('#task-completion-area')||top);setTimeout(()=>{next?.classList.remove('hide');if(next)next.focus({preventScroll:true});},350);});
   next?.addEventListener('click',async()=>{if(opening)return;if(taskDone){opening=true;busy(next,true);await countdown(status,2000,'Membuka Task '+(task+1));F.go(nextPage);return;}busy(next,true);await countdown(status,5000,'Menyelesaikan Task '+task);taskDone=true;if(success){success.innerHTML='<i class="fa-solid fa-circle-check"></i> Success — Task '+task+' Done';success.classList.remove('hide');}next.textContent='Lanjut ke Task '+(task+1);next.disabled=false;next.setAttribute('aria-label','Lanjut ke Task '+(task+1));scrollTo($('#task-completion-area'));});
  }else{
   const steps=[...document.querySelectorAll('[data-step]')];let completed=0;
   top?.addEventListener('click',async()=>{if(top.disabled)return;busy(top,true);await countdown(status,10000,'Menyiapkan Task 3');top.classList.add('hide');steps[0]?.classList.remove('hide');busy(top,false);});
   steps.forEach((b,i)=>b.addEventListener('click',async()=>{if(i!==completed||b.disabled)return;busy(b,true);await countdown(status,5000,'Menyelesaikan langkah '+(i+1));b.textContent='Langkah '+(i+1)+' selesai';b.classList.add('is-done');b.disabled=true;completed++;if(steps[completed]){steps[completed].disabled=false;steps[completed].classList.remove('hide');scrollTo(steps[completed]);}else{const redirect=$('#redirect-final');redirect?.classList.remove('hide');scrollTo(redirect);}}));
   $('#redirect-final')?.addEventListener('click',async e=>{const b=e.currentTarget;if(b.dataset.loading==='1')return;b.dataset.loading='1';busy(b,true);await countdown(status,2500,'Membuka halaman Final');F.go('shortlink-final.html');});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
