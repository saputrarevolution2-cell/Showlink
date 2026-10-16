/* ShowLink — shared imported navbar */
(() => {
  "use strict";
  const C={home:"/index.html",dashboard:"/dashboard.html",allPublicLinks:"/all-public-links.html",pastelink:"/pastelink.html",shortlink:"/shortlink.html",support:"/support.html",paymentLink:"/payment-link.html",orders:"/order.html",notifications:"/notifikasi.html",withdraw:"/withdraw.html",myLinks:"/kelola-tautan.html",profile:"/profil.html",settings:"/pengaturan.html",about:"/about.html",admin:"/admin.html",login:"/login.html",register:"/register.html"};
  let authUser=null, loaded=false, supabaseBootstrap=null;
  // Authentication must come from the real Supabase session, never stale localStorage.
  const logged=()=>!!authUser;
  function loadScript(src,ready){
    if(ready())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src=src;script.async=false;script.dataset.showlinkBootstrap="true";
      script.onload=()=>ready()?resolve():reject(new Error("Script loaded but expected API is unavailable: "+src));
      script.onerror=()=>reject(new Error("Could not load "+src));
      document.head.appendChild(script);
    });
  }
  async function ensureSupabase(){
    if(window.ShowLinkSupabase?.load)return window.ShowLinkSupabase.load();
    if(!supabaseBootstrap)supabaseBootstrap=(async()=>{
      if(!window.supabase)await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",()=>!!window.supabase);
      if(!window.SHOWLINK_SUPABASE)await loadScript("/js/supabase-config.js",()=>!!window.SHOWLINK_SUPABASE);
      if(!window.ShowLinkSupabase?.load)await loadScript("/js/supabase-client.js",()=>!!window.ShowLinkSupabase?.load);
      return window.ShowLinkSupabase.load();
    })();
    return supabaseBootstrap;
  }
  async function syncAuthSession(){
    try{
      const sb=await ensureSupabase();
      const {data,error}=await sb.auth.getSession();
      if(error)throw error;
      const sessionUser=data?.session?.user;
      if(!sessionUser?.id){authUser=null;return null;}
      // Verify the session against Supabase Auth, rather than trusting a locally cached session alone.
      const {data:verified,error:verifyError}=await sb.auth.getUser();
      if(verifyError||!verified?.user?.id||verified.user.id!==sessionUser.id){
        authUser=null;
        return null;
      }
      authUser=verified.user;
    }catch(e){
      // Fail closed: do not display account-only navigation unless Supabase confirms the user.
      authUser=null;
      console.warn("ShowLink could not verify auth session; hiding account-only controls.",e);
    }
    return authUser;
  }
  const t=k=>window.ShowLinkLanguage?.t?.(k)||({orders:"Order",withdraw:"Withdraw",myPaymentLinks:"My Links",profile:"Profile",settings:"Settings",about:"About",notifications:"Notifications",paymentLink:"Payment Link",dashboard:"Dashboard",signOut:"Sign out",home:"Home",support:"Support",login:"Login",register:"Register",allPublicLinks:"All Public Links",pastelink:"Pastelink",shortlink:"Shortlink",comingSoon:"Coming soon",create:(document.documentElement.lang==="id"?"Buat":"Create"),allPublicLinks:(document.documentElement.lang==="id"?"All Link":"All Link"),profile:(document.documentElement.lang==="id"?"Profil":"Profile"),withdraw:"Withdraw"}[k]||k);
  const icon=(cls,name)=>`<i class="fa-solid ${name}${cls?` ${cls}`:""}" aria-hidden="true"></i>`;
  const link=(href,ic,key,extra="")=>`<a class="sl-nav-link" href="${href}" data-nav-link ${extra}><span>${icon(ic.cls,ic.name)}</span><span class="sl-nav-link-label" data-i18n="${key}">${t(key)}</span></a>`;
  const soon=(href,ic,key)=>`${link(href,ic,key)}<span class="sl-new-badge sl-new-gray">${t("comingSoon")}</span>`;
  function withSoon(href,ic,key){return link(href,ic,key).replace("</a>",`<span class="sl-new-badge sl-new-gray sl-coming-soon-badge">${t("comingSoon")}</span></a>`);}
  function authMarkup(){return `${link(C.dashboard,{cls:"sl-icon-blue",name:"fa-gauge-high"},"dashboard")}${withSoon(C.allPublicLinks,{cls:"sl-icon-cyan",name:"fa-globe"},"allPublicLinks")}<div class="sl-drawer-divider"></div>${link(C.pastelink,{cls:"sl-icon-purple",name:"fa-file-lines"},"pastelink").replace("</a>",`<span class="sl-new-badge sl-pastelink-new"><i class="fa-solid fa-sparkles" aria-hidden="true"></i> NEW</span></a>`)}${link(C.shortlink,{cls:"sl-icon-orange",name:"fa-link"},"shortlink")}${link(C.paymentLink,{cls:"sl-icon-yellow",name:"fa-credit-card"},"paymentLink").replace("</a>",`<span class="sl-new-badge sl-payment-trend"><i class="fa-solid fa-fire" aria-hidden="true"></i> TREND</span></a>`)}<div class="sl-drawer-divider"></div>${link(C.orders,{cls:"sl-icon-purple",name:"fa-receipt"},"orders",'data-order-link').replace('</a>','<span class="sl-new-badge sl-new-green" data-order-new>NEW</span></a>')}${link(C.notifications,{cls:"sl-icon-pink",name:"fa-bell"},"notifications",'data-menu-notifications-link').replace('</a>','<span class="sl-menu-notification-badge" data-menu-notification-badge hidden></span></a>')}${link(C.withdraw,{cls:"sl-icon-green",name:"fa-money-bill-transfer"},"withdraw")}<div class="sl-drawer-divider"></div>${link(C.profile,{cls:"sl-icon-purple",name:"fa-user"},"profile")}${link(C.myLinks,{cls:"sl-icon-blue",name:"fa-link"},"myPaymentLinks")}${link(C.settings,{cls:"sl-icon-yellow",name:"fa-gear"},"settings")}<div class="sl-drawer-divider"></div>${link(C.about,{cls:"sl-icon-blue",name:"fa-circle-info"},"about")}${link(C.support,{cls:"sl-icon-green",name:"fa-headset"},"support")}<a class="sl-nav-link sl-nav-logout" href="/index.html" data-logout>${icon("sl-icon-red","fa-right-from-bracket")}<span data-i18n="signOut">${t("signOut")}</span></a>`;}
  function guestMarkup(){return `${link(C.home,{cls:"sl-icon-blue",name:"fa-house"},"home")}${link(C.support,{cls:"sl-icon-green",name:"fa-headset"},"support")}<div class="sl-drawer-divider"></div>${link(C.login,{cls:"sl-icon-green",name:"fa-right-to-bracket"},"login")}${link(C.register,{cls:"sl-icon-yellow",name:"fa-user-plus"},"register")}`;}
  async function loadTemplate(){if(loaded)return true;const host=document.querySelector("[data-showlink-navbar]");if(!host)return false;try{const r=await fetch("/components/navbar.html",{cache:"no-store"});if(!r.ok)throw new Error(`navbar.html ${r.status}`);host.innerHTML=await r.text();loaded=true;return true}catch(e){console.error("ShowLink navbar import failed:",e);host.innerHTML="";return false;}}
  function closeDrawer(){const h=document.querySelector("[data-showlink-navbar]");if(!h)return;const drawer=h.querySelector("[data-showlink-drawer]"),overlay=h.querySelector("[data-showlink-overlay]"),menu=h.querySelector("[data-showlink-menu]");drawer?.classList.remove("is-open");overlay?.classList.remove("is-open");drawer?.setAttribute("aria-hidden","true");menu?.setAttribute("aria-expanded","false");document.documentElement.classList.remove("sl-drawer-open");}
  function openDrawer(){const h=document.querySelector("[data-showlink-navbar]");if(!h)return;const drawer=h.querySelector("[data-showlink-drawer]"),overlay=h.querySelector("[data-showlink-overlay]"),menu=h.querySelector("[data-showlink-menu]");drawer?.classList.add("is-open");overlay?.classList.add("is-open");drawer?.setAttribute("aria-hidden","false");menu?.setAttribute("aria-expanded","true");document.documentElement.classList.add("sl-drawer-open");}
  async function refreshPublicMenuVisibility(){
    try{
      const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;
      const {data,error}=await sb.rpc("get_public_shortlink_control_settings");if(error||!data)return;
      const map={"/dashboard.html":"dashboard","/all-public-links.html":"all-public-links","/pastelink.html":"pastelink","/shortlink.html":"shortlink","/payment-link.html":"payment-link","/order.html":"order","/notifikasi.html":"notifications","/withdraw.html":"withdraw","/profil.html":"profile","/kelola-tautan.html":"my-links","/pengaturan.html":"settings","/about.html":"about","/support.html":"support"};
      document.querySelectorAll("[data-showlink-navbar] [data-nav-link]").forEach(a=>{const key=map[new URL(a.href,location.origin).pathname];if(key){const hide=!!(data.navbar_visibility&&data.navbar_visibility[key]===false);a.hidden=hide;a.style.display=hide?"none":"";}});
    }catch(e){console.debug("ShowLink navbar visibility settings unavailable",e);}
  }
  async function refreshAdminVisibility(){const els=document.querySelectorAll("[data-admin-nav]");if(!els.length||!logged())return;try{const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;const {data:{session}}=await sb.auth.getSession();if(!session)return;const {data,error}=await sb.rpc("is_current_user_admin");if(!error&&data===true)els.forEach(e=>e.hidden=false);}catch{}}
  async function refreshNotificationBadge(){const h=document.querySelector("[data-showlink-navbar]"),b=h?.querySelector("[data-notification-badge]"),mb=h?.querySelector("[data-menu-notification-badge]");[b,mb].filter(Boolean).forEach(el=>{el.hidden=true;el.textContent=""});h?.querySelector("[data-navbar-notification]")?.classList.remove("has-notifications");const items=h?.querySelector("[data-notification-items]");if(!logged()){const wrap=h?.querySelector(".sl-notification-wrap");if(wrap){wrap.hidden=true;wrap.style.display="none";wrap.style.visibility="hidden";wrap.style.pointerEvents="none"}if(items)items.innerHTML='<div class="sl-notification-empty">Masuk untuk melihat notifikasi.</div>';return}try{const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;const {data:{session}}=await sb.auth.getSession();const uid=session?.user?.id;if(!uid)return;const {count,error:ce}=await sb.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",uid).eq("is_read",false);if(!ce&&count>0){[b,mb].filter(Boolean).forEach(el=>{el.textContent=count>99?"99+":String(count);el.hidden=false});h?.querySelector("[data-navbar-notification]")?.classList.add("has-notifications")}if(!items)return;const {data,error}=await sb.from("notifications").select("id,type,title,message,link_url,is_read,created_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(5);if(error)throw error;if(!data?.length){items.innerHTML='<div class="sl-notification-empty">Belum ada notifikasi.</div>';return}items.innerHTML=data.map(n=>`<a class="sl-notification-item ${n.is_read?'':'is-unread'}" href="${String(n.link_url||'/notifikasi.html').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}" data-preview-id="${String(n.id).replace(/[^a-zA-Z0-9_-]/g,'')}"><span class="sl-notification-dot"></span><span class="sl-notification-copy"><strong>${String(n.title||'Notifikasi').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong><span>${String(n.message||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span><small>${new Date(n.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</small></span></a>`).join('');h.querySelectorAll('[data-preview-id]').forEach(a=>a.addEventListener('click',async()=>{const id=a.dataset.previewId;if(a.classList.contains('is-unread')){await sb.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('id',id).eq('user_id',uid);setTimeout(refreshNotificationBadge,150)}}));const read=h.querySelector('[data-notification-read-all]'),del=h.querySelector('[data-notification-delete-all]');if(read)read.onclick=async()=>{read.disabled=true;const {error}=await sb.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('user_id',uid).eq('is_read',false);read.disabled=false;if(error){alert('Gagal menandai notifikasi.');return}await refreshNotificationBadge()};if(del)del.onclick=async()=>{if(!confirm('Hapus SEMUA notifikasi? Tindakan ini tidak bisa dibatalkan.'))return;del.disabled=true;const {error}=await sb.from('notifications').delete().eq('user_id',uid);del.disabled=false;if(error){alert('Gagal menghapus notifikasi. Pastikan policy DELETE notifications aktif di Supabase.');return}await refreshNotificationBadge()};}catch(e){if(items)items.innerHTML='<div class="sl-notification-empty">Notifikasi gagal dimuat.</div>';console.warn('ShowLink notification preview:',e)}}
  function setupNotificationPanel(host){const btn=host.querySelector('[data-navbar-notification]'),panel=host.querySelector('[data-notification-panel]');if(!btn||!panel)return;const close=()=>{panel.hidden=true;btn.setAttribute('aria-expanded','false')};btn.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const opening=panel.hidden;panel.hidden=!opening;btn.setAttribute('aria-expanded',String(opening));if(opening)await refreshNotificationBadge()});document.addEventListener('click',e=>{if(!e.target.closest('.sl-notification-wrap'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})}
  function setupBottomNav(host,is){
    const nav=host.querySelector("[data-showlink-bottom-nav]");
    if(!nav)return;
    // Explicitly control both the HTML hidden state and display so global CSS cannot expose it to guests.
    nav.hidden=!is;
    nav.style.display=is?"grid":"none";
    nav.setAttribute("aria-hidden",String(!is));
    nav.classList.toggle("is-auth-visible",!!is);
    document.body.classList.toggle("showlink-authenticated",!!is);
    const menu=nav.querySelector("[data-bottom-create-menu]");
    const create=nav.querySelector("[data-bottom-create]");
    const closeCreate=()=>{if(menu)menu.hidden=true;if(create)create.setAttribute("aria-expanded","false");};
    const path=location.pathname.replace(/\/$/,"")||"/";
    nav.querySelectorAll("[data-bottom-link]").forEach(a=>{
      const key=a.dataset.bottomLink;
      const active=(key==="dashboard"&&path==="/dashboard.html")||
        (key==="all"&&path==="/all-public-links.html")||
        (key==="withdraw"&&path==="/withdraw.html")||
        (key==="profile"&&path==="/profil.html");
      a.classList.toggle("is-active",active);
      if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
    });
    if(create&&!create.dataset.bound){
      create.dataset.bound="1";
      create.addEventListener("click",e=>{
        e.preventDefault();e.stopPropagation();
        const opening=!!menu?.hidden;
        if(menu)menu.hidden=!opening;
        create.setAttribute("aria-expanded",String(opening));
      });
      menu?.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeCreate));
      document.addEventListener("click",e=>{if(!e.target.closest("[data-showlink-bottom-nav]"))closeCreate();});
      document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCreate();});
    }
    if(!is)closeCreate();
  }
  async function render(){const host=document.querySelector("[data-showlink-navbar]");if(!host)return;if(!(await loadTemplate()))return;const bottom=host.querySelector("[data-showlink-bottom-nav]");if(bottom){bottom.hidden=true;bottom.style.display="none";bottom.setAttribute("aria-hidden","true");bottom.classList.remove("is-auth-visible");}document.body.classList.remove("showlink-authenticated");await syncAuthSession();const is=logged();const menu=host.querySelector("[data-navbar-menu]"),actions=host.querySelector("[data-navbar-auth-actions]"),notice=host.querySelector("[data-navbar-notification]"),noticeWrap=host.querySelector(".sl-notification-wrap");if(menu)menu.innerHTML=is?authMarkup():guestMarkup();setupBottomNav(host,is);if(noticeWrap){noticeWrap.hidden=!is;noticeWrap.style.display=is?"flex":"none";noticeWrap.style.visibility=is?"visible":"hidden";noticeWrap.style.pointerEvents=is?"auto":"none";}if(notice){notice.setAttribute("aria-label",t("notifications"));notice.title=t("notifications");}if(actions){actions.innerHTML=is?"":`<a class="sl-btn sl-btn-ghost sl-desktop-action" href="${C.login}">${icon("sl-icon-green","fa-right-to-bracket")}<span>${t("login")}</span></a><a class="sl-btn sl-btn-primary sl-desktop-action" href="${C.register}">${icon("","fa-user-plus")}<span>${t("register")}</span></a>`;}
    setupNotificationPanel(host);host.querySelector("[data-showlink-menu]")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();host.querySelector("[data-showlink-drawer]")?.classList.contains("is-open")?closeDrawer():openDrawer();});host.querySelector("[data-showlink-close]")?.addEventListener("click",closeDrawer);host.querySelector("[data-showlink-overlay]")?.addEventListener("click",closeDrawer);host.querySelectorAll("[data-nav-link]").forEach(a=>a.addEventListener("click",closeDrawer));
    document.body.classList.add("showlink-navbar-page");window.dispatchEvent(new CustomEvent("showlink:navbar-rendered"));refreshNotificationBadge();refreshAdminVisibility();refreshPublicMenuVisibility();
  }
  function logoutReady(){if(window.__showLinkLogoutReady)return;window.__showLinkLogoutReady=true;document.addEventListener("click",async e=>{const b=e.target instanceof Element?e.target.closest("[data-logout]"):null;if(!b)return;e.preventDefault();closeDrawer();try{const sb=await window.ShowLinkSupabase?.load?.();await sb?.auth.signOut();}catch{}localStorage.removeItem("showlink_user");window.dispatchEvent(new CustomEvent("showlink:auth-change",{detail:{user:null}}));location.replace(C.home);});}
  window.ShowLinkNavbar={render,refresh:()=>{authUser=null;loaded=false;render()},refreshNotifications:refreshNotificationBadge,setAuth:u=>{authUser=u||null;loaded=false;render()}};
  window.addEventListener("showlink:auth-change",e=>{authUser=e.detail?.user||null;loaded=false;render();});document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();});logoutReady();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{authUser=null;render()},{once:true});else{authUser=null;render();}
})();
