/* ShowLink — Payment Link Only navbar */
(() => {
  "use strict";
  const C={
    home:"/",dashboard:"/dashboard.html",paymentLink:"/payment-link.html",orders:"/order.html",
    notifications:"/notifikasi.html",withdraw:"/withdraw.html",myLinks:"/kelola-tautan.html",
    profile:"/profil.html",settings:"/pengaturan.html",about:"/about.html",admin:"/admin.html",login:"/login.html",register:"/register.html"
  };
  let authUser=null;
  const stored=()=>{try{return JSON.parse(localStorage.getItem("showlink_user")||"null")}catch{return null}};
  const logged=()=>!!authUser||!!stored();
  const t=k=>window.ShowLinkLanguage?.t?.(k)||({orders:"Order",withdraw:"Withdraw",myPaymentLinks:"My Payment Link",profile:"Profil",settings:"Pengaturan",about:"About",notifications:"Notifikasi",paymentLink:"Payment Link",dashboard:"Dashboard",signOut:"Logout"}[k]||k);
  const icon=(cls,name)=>`<i class="fa-solid ${name}${cls?` ${cls}`:""}" aria-hidden="true"></i>`;
  const link=(href,ic,key)=>`<a class="sl-nav-link" href="${href}" data-nav-link>${icon(ic.cls,ic.name)}<span data-i18n="${key}">${t(key)}</span></a>`;
  function authMarkup(){return `
    ${link(C.dashboard,{cls:"sl-icon-blue",name:"fa-gauge-high"},"dashboard")}
    ${link(C.paymentLink,{cls:"sl-icon-yellow",name:"fa-credit-card"},"paymentLink")}
    ${link(C.orders,{cls:"sl-icon-purple",name:"fa-receipt"},"orders")}
    ${link(C.notifications,{cls:"sl-icon-pink",name:"fa-bell"},"notifications")}
    ${link(C.withdraw,{cls:"sl-icon-green",name:"fa-money-bill-transfer"},"withdraw")}
    ${link(C.myLinks,{cls:"sl-icon-blue",name:"fa-link"},"myPaymentLinks")}
    <div class="sl-drawer-divider"></div>
    ${link(C.profile,{cls:"sl-icon-purple",name:"fa-user"},"profile")}
    ${link(C.settings,{cls:"sl-icon-yellow",name:"fa-gear"},"settings")}
    ${link(C.about,{cls:"sl-icon-blue",name:"fa-circle-info"},"about")}
    <a class="sl-nav-link sl-admin-nav" href="${C.admin}" data-admin-nav hidden>${icon("sl-icon-red","fa-shield-halved")}<span>Admin Panel</span></a>
    <div class="sl-drawer-divider"></div>
    <a class="sl-nav-link sl-nav-logout" href="#logout" data-logout>${icon("sl-icon-red","fa-right-from-bracket")}<span data-i18n="signOut">${t("signOut")}</span></a>`;}
  function guestMarkup(){return `${link(C.home,{cls:"sl-icon-blue",name:"fa-house"},"home")}<div class="sl-drawer-divider"></div>${link(C.login,{cls:"sl-icon-green",name:"fa-right-to-bracket"},"login")}${link(C.register,{cls:"sl-icon-yellow",name:"fa-user-plus"},"register")}`;}
  function closeDrawer(){const h=document.querySelector("[data-showlink-navbar]");if(!h)return;h.querySelector("[data-showlink-drawer]")?.classList.remove("is-open");h.querySelector("[data-showlink-overlay]")?.classList.remove("is-open");h.querySelector("[data-showlink-menu]")?.setAttribute("aria-expanded","false");document.documentElement.classList.remove("sl-drawer-open");}
  function openDrawer(){const h=document.querySelector("[data-showlink-navbar]");if(!h)return;h.querySelector("[data-showlink-drawer]")?.classList.add("is-open");h.querySelector("[data-showlink-overlay]")?.classList.add("is-open");h.querySelector("[data-showlink-menu]")?.setAttribute("aria-expanded","true");document.documentElement.classList.add("sl-drawer-open");}
  async function refreshAdminVisibility(){const els=document.querySelectorAll("[data-admin-nav]");if(!els.length||!logged())return;try{const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;const {data:{session}}=await sb.auth.getSession();if(!session)return;const {data,error}=await sb.rpc("is_current_user_admin");if(!error&&data===true)els.forEach(e=>e.hidden=false);}catch{}}
  async function refreshNotificationBadge(){const h=document.querySelector("[data-showlink-navbar]"),b=h?.querySelector("[data-notification-badge]");if(!b)return;b.hidden=true;b.textContent="";if(!logged())return;try{const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;const {data:{session}}=await sb.auth.getSession();const uid=session?.user?.id;if(!uid)return;const {count,error}=await sb.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",uid).eq("is_read",false);if(error||!count)return;b.textContent=count>99?"99+":String(count);b.hidden=false;}catch{}}
  function render(){const host=document.querySelector("[data-showlink-navbar]");if(!host)return;const is=logged();host.innerHTML=`
    <header class="sl-navbar" id="showlink-navbar"><div class="sl-nav-shell">
      <button class="sl-nav-menu" type="button" aria-label="${t("openMenu")}" aria-expanded="false" data-showlink-menu>${icon("","fa-bars")}</button>
      <a class="sl-brand" href="${C.home}" aria-label="ShowLink"><span class="sl-brand-mark"><img src="/assets/showlink-logo.svg" alt="ShowLink"></span><span class="sl-brand-text">Show<span>Link</span></span></a>
      <nav class="sl-nav-links" aria-hidden="true"></nav>
      <div class="sl-nav-actions">
        <a class="sl-nav-notification" href="${is?C.notifications:C.login}" aria-label="${t("notifications")}" title="${t("notifications")}">${icon("","fa-bell")}<span class="sl-nav-notification-badge" data-notification-badge hidden></span><span class="sl-nav-notification-pulse"></span></a>
        <div data-showlink-tools class="showlink-tools">
          <div class="showlink-tool" data-theme-tool><button class="showlink-tool-btn" type="button" aria-label="${t("theme")}" aria-expanded="false" data-theme-toggle><span class="sl-tool-icon" data-theme-icon><i class="fa-solid fa-moon"></i></span><span class="showlink-tool-text" data-theme-label>${t("light")}</span></button><div class="showlink-tool-menu" role="menu"><button class="showlink-tool-option" type="button" data-theme-option="light"><span class="sl-option-icon"><i class="fa-solid fa-sun"></i></span><span data-i18n="light">${t("light")}</span><span class="sl-check"></span></button><button class="showlink-tool-option" type="button" data-theme-option="dark"><span class="sl-option-icon"><i class="fa-solid fa-moon"></i></span><span data-i18n="dark">${t("dark")}</span><span class="sl-check"></span></button></div></div>
          <div class="showlink-tool" data-language-tool><button class="showlink-tool-btn" type="button" aria-label="${t("language")}" aria-expanded="false" data-language-toggle><span class="sl-tool-icon"><i class="fa-solid fa-language"></i></span><span class="showlink-lang-label" data-lang-label>ID</span></button><div class="showlink-tool-menu" role="menu"><button class="showlink-tool-option" type="button" data-lang-option="id"><span class="sl-option-icon"><i class="fa-solid fa-flag"></i></span><span>${t("indonesia")}</span><span class="sl-check"></span></button><button class="showlink-tool-option" type="button" data-lang-option="en"><span class="sl-option-icon"><i class="fa-solid fa-earth-americas"></i></span><span>${t("english")}</span><span class="sl-check"></span></button></div></div>
        </div>
        ${is?"":`<a class="sl-btn sl-btn-ghost sl-desktop-action" href="${C.login}">${icon("sl-icon-green","fa-right-to-bracket")}<span>${t("login")}</span></a><a class="sl-btn sl-btn-primary sl-desktop-action" href="${C.register}">${icon("","fa-user-plus")}<span>${t("register")}</span></a>`}
      </div></div></header>
      <div class="sl-nav-overlay" data-showlink-overlay></div><aside class="sl-nav-drawer" data-showlink-drawer aria-hidden="true"><div class="sl-drawer-head"><div class="sl-drawer-brand"><span class="sl-brand-mark"><img src="/assets/showlink-logo.svg" alt="ShowLink"></span><span>Show<span style="color:var(--sl-primary)">Link</span></span></div><button class="sl-drawer-close" type="button" data-showlink-close>${icon("","fa-xmark")}</button></div><div class="sl-drawer-scroll"><nav class="sl-drawer-nav" aria-label="${t("mainNavigation")}">${is?authMarkup():guestMarkup()}</nav></div></aside>`;
    host.querySelector("[data-showlink-menu]")?.addEventListener("click",()=>host.querySelector("[data-showlink-drawer]")?.classList.contains("is-open")?closeDrawer():openDrawer());
    host.querySelector("[data-showlink-close]")?.addEventListener("click",closeDrawer);host.querySelector("[data-showlink-overlay]")?.addEventListener("click",closeDrawer);host.querySelectorAll("[data-nav-link]").forEach(a=>a.addEventListener("click",closeDrawer));
    document.body.classList.add("showlink-navbar-page");window.dispatchEvent(new CustomEvent("showlink:navbar-rendered"));refreshNotificationBadge();refreshAdminVisibility();
  }
  function logoutReady(){if(window.__showLinkLogoutReady)return;window.__showLinkLogoutReady=true;document.addEventListener("click",async e=>{const b=e.target instanceof Element?e.target.closest("[data-logout]"):null;if(!b)return;e.preventDefault();closeDrawer();try{const sb=await window.ShowLinkSupabase?.load?.();await sb?.auth.signOut();}catch{}localStorage.removeItem("showlink_user");window.dispatchEvent(new CustomEvent("showlink:auth-change",{detail:{user:null}}));location.replace(C.home);});}
  window.ShowLinkNavbar={render,refresh:()=>{authUser=stored();render()},refreshNotifications:refreshNotificationBadge,setAuth:u=>{authUser=u||null;render()}};
  window.addEventListener("showlink:auth-change",e=>{authUser=e.detail?.user||null;render();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();});logoutReady();
})();
