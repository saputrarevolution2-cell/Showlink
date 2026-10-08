/* ============================================================
   SHOWLINK ULTRA PREMIUM — CONSTRUCTION UI
   Lightweight DOM enhancer + micro-interactions
   ============================================================ */
(function(){"use strict";
  const copy={
    about:["About sedang dibangun","Kami sedang menyempurnakan halaman informasi ShowLink agar lebih lengkap, elegan, dan informatif."],
    payment:["Payment sedang dibangun","Modul pembayaran dan aktivitas transaksi sedang kami rapikan agar pengalaman pembayaran lebih aman dan premium."],
    profile:["Profil sedang dibangun","Pengaturan profil dan identitas akun sedang disiapkan dengan tampilan baru yang lebih nyaman."],
    notifications:["Notifikasi sedang dibangun","Pusat notifikasi sedang kami siapkan agar seluruh aktivitas akun dapat dipantau dengan rapi."],
    settings:["Pengaturan sedang dibangun","Pengaturan lanjutan ShowLink sedang dalam tahap pengembangan dan penyempurnaan."],
    sub4unlock:["Sub4Unlock sedang diperbaiki","Kami sedang membangun ulang modul ini agar lebih stabil, cepat, dan siap digunakan."],
    default:["Fitur sedang dibangun","Tim ShowLink sedang mengerjakan halaman ini agar siap digunakan dengan pengalaman terbaik."]
  };
  function pageKey(){const p=(location.pathname.split("/").pop()||"").toLowerCase();if(p.includes("about"))return"about";if(p==="payment.html"||p==="payment")return"payment";if(p.includes("profil"))return"profile";if(p.includes("notifikasi"))return"notifications";if(p.includes("pengaturan"))return"settings";if(p.includes("sub4unlock"))return"sub4unlock";return"default"}
  function particles(el){if(el.querySelector(".sl-construction-particles"))return;const wrap=document.createElement("div");wrap.className="sl-construction-particles";for(let i=0;i<10;i++){const s=document.createElement("span");s.style.setProperty("--i",i);s.style.left=(8+Math.random()*84)+"%";s.style.top=(10+Math.random()*80)+"%";wrap.appendChild(s)}el.appendChild(wrap)}
  function mount(){
    const placeholders=[...document.querySelectorAll(".sl-placeholder")],existing=document.querySelector(".sl-coming-card");
    if(!placeholders.length&&!existing)return;
    const key=pageKey(),c=copy[key]||copy.default;
    placeholders.forEach(el=>{if(el.closest("[data-no-construction]"))return;el.classList.remove("sl-placeholder");el.classList.add("sl-construction");el.innerHTML=`
      <span class="sl-construction-spark s1"></span><span class="sl-construction-spark s2"></span><span class="sl-construction-spark s3"></span><span class="sl-construction-spark s4"></span>
      <div class="sl-construction-inner">
        <div class="sl-construction-orbit"><div class="sl-construction-icon"><i class="fa-solid fa-screwdriver-wrench"></i></div></div>
        <span class="sl-construction-badge"><i class="fa-solid fa-circle-notch"></i> Coming Soon</span>
        <h2 class="sl-construction-title">${c[0]}</h2><p class="sl-construction-text">${c[1]}</p>
        <div class="sl-construction-progress"><div class="sl-construction-progress-head"><span>Progress pembangunan</span><span>In progress</span></div><div class="sl-construction-track"><div class="sl-construction-bar"></div></div></div>
        <div class="sl-construction-status"><i class="fa-solid fa-spinner"></i><span>Sedang dikerjakan</span><span class="sl-construction-dots"><span>.</span><span>.</span><span>.</span></span></div>
      </div>`;particles(el)});
    const coming=document.querySelector(".sl-coming-card");
    if(coming&&!coming.classList.contains("sl-construction")){coming.classList.add("sl-construction");particles(coming);const wait=coming.querySelector(".sl-waiting");if(wait)wait.innerHTML='<i class="fa-solid fa-spinner"></i><span>Sedang dikerjakan</span><span class="sl-construction-dots"><span>.</span><span>.</span><span>.</span></span>'}
    requestAnimationFrame(()=>document.body.classList.add("sl-construction-ready"));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
