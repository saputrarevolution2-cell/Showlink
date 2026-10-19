/* ShowLink — shared imported navbar */
(() => {
  "use strict";
  const C={home:"/index.html",dashboard:"/dashboard.html",allPublicLinks:"/all-public-links.html",pastelink:"/pastelink.html",shortlink:"/shortlink.html",sub4unlock:"#",vip:"#",premium:"#",support:"/support.html",endorse:"/endorse.html",paymentLink:"/payment-link.html",orders:"/order.html",notifications:"/notifikasi.html",withdraw:"/withdraw.html",myLinks:"/kelola-tautan.html",profile:"/profil.html",settings:"/pengaturan.html",about:"/about.html",admin:"/admin.html",login:"/login.html",register:"/register.html"};
  let authUser=null, loaded=false, supabaseBootstrap=null, templatePromise=null, renderVersion=0;
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
      if(!sessionUser?.id)return null;
      // Verify the session against Supabase Auth, rather than trusting a locally cached session alone.
      const {data:verified,error:verifyError}=await sb.auth.getUser();
      if(verifyError||!verified?.user?.id||verified.user.id!==sessionUser.id)return null;
      return verified.user;
    }catch(e){
      // Fail closed: do not display account-only navigation unless Supabase confirms the user.
      console.warn("ShowLink could not verify auth session; hiding account-only controls.",e);
      return null;
    }
  }
  const t=k=>{
    const isId=(document.documentElement.lang||"id").toLowerCase().startsWith("id");
    const fallback={orders:isId?"Pesanan":"Orders",withdraw:isId?"Penarikan":"Withdraw",myPaymentLinks:isId?"Link Saya":"My Links",profile:isId?"Profil":"Profile",settings:isId?"Pengaturan":"Settings",about:isId?"Tentang":"About",notifications:isId?"Notifikasi":"Notifications",paymentLink:"Payment Link",dashboard:"Dashboard",signOut:isId?"Keluar":"Sign out",home:isId?"Beranda":"Home",support:isId?"Suport":"Support",endorse:"Endorse",login:isId?"Masuk":"Login",register:isId?"Daftar":"Register",allPublicLinks:isId?"Tautan Publik":"Public Links",pastelink:"PasteLink",shortlink:"Shortlink",sub4unlock:"Sub4Unlock",vip:"VIP",premium:"Premium",comingSoon:isId?"Segera hadir":"Coming soon",create:isId?"Buat":"Create"};
    const translated=window.ShowLinkLanguage?.t?.(k);
    return translated&&translated!==k?translated:(fallback[k]||k);
  };
  const icon=(cls,name)=>`<i class="fa-solid ${name}${cls?` ${cls}`:""}" aria-hidden="true"></i>`;
  const link=(href,ic,key,extra="")=>`<a class="sl-nav-link" href="${href}" data-nav-link data-nav-key="${key}" ${extra}><span>${icon(ic.cls,ic.name)}</span><span class="sl-nav-link-label" data-i18n="${key}">${t(key)}</span></a>`;
  const soon=(href,ic,key)=>`${link(href,ic,key)}<span class="sl-new-badge sl-new-gray">${t("comingSoon")}</span>`;
  function withSoon(href,ic,key){return link(href,ic,key).replace("</a>",`<span class="sl-new-badge sl-new-gray sl-coming-soon-badge">${t("comingSoon")}</span></a>`);}
  function badge(label,cls){return `<span class="sl-new-badge ${cls}">${label}</span>`;}
  function disabledLink(ic,key,badgeText,badgeClass){return `<a class="sl-nav-link sl-nav-link-disabled" href="#" data-nav-link data-nav-key="${key}" aria-disabled="true" tabindex="-1"><span>${icon(ic.cls,ic.name)}</span><span class="sl-nav-link-label">${t(key)}</span>${badge(badgeText,badgeClass)}</a>`;}
  function authMarkup(){
    return `${link(C.dashboard,{cls:"sl-icon-blue",name:"fa-gauge-high"},"dashboard")}
      <div class="sl-drawer-divider"></div>
      ${link(C.pastelink,{cls:"sl-icon-blue",name:"fa-file-lines"},"pastelink")}
      ${link(C.shortlink,{cls:"sl-icon-pink",name:"fa-link"},"shortlink")}
      ${link(C.paymentLink,{cls:"sl-icon-red",name:"fa-credit-card"},"paymentLink")}
      ${link("/sub4unlock.html",{cls:"sl-icon-muted",name:"fa-lock-open"},"sub4unlock")}
      <div class="sl-drawer-divider"></div>
      ${link(C.endorse,{cls:"sl-icon-viral",name:"fa-bullhorn"},"endorse")}
      ${link(C.notifications,{cls:"sl-icon-pink",name:"fa-bell"},"notifications",'data-menu-notifications-link').replace('</a>','<span class="sl-menu-notification-badge" data-menu-notification-badge hidden></span></a>')}
      ${link(C.withdraw,{cls:"sl-icon-green",name:"fa-money-bill-transfer"},"withdraw")}
      <div class="sl-drawer-divider"></div>
      ${link(C.profile,{cls:"sl-icon-purple",name:"fa-user"},"profile")}
      ${link(C.vip,{cls:"sl-icon-vip",name:"fa-crown"},"vip")}
      ${link("/premium.html",{cls:"sl-icon-premium",name:"fa-gem"},"premium")}
      <div class="sl-drawer-divider"></div>
      ${link(C.support,{cls:"sl-icon-green",name:"fa-headset"},"support")}
      ${link(C.about,{cls:"sl-icon-blue",name:"fa-circle-info"},"about")}
      <a class="sl-nav-link sl-nav-logout" href="/index.html" data-nav-link data-nav-key="logout" data-logout><span>${icon("sl-icon-red","fa-right-from-bracket")}</span><span class="sl-nav-link-label" data-i18n="signOut">${t("signOut")}</span></a>`;
  }
  function guestMarkup(){return `${link(C.home,{cls:"sl-icon-blue",name:"fa-house"},"home")}${link(C.support,{cls:"sl-icon-green",name:"fa-headset"},"support")}${link(C.endorse,{cls:"sl-icon-pink",name:"fa-bullhorn"},"endorse")}<div class="sl-drawer-divider"></div>${link(C.login,{cls:"sl-icon-green",name:"fa-right-to-bracket"},"login")}${link(C.register,{cls:"sl-icon-yellow",name:"fa-user-plus"},"register")}`;}
  async function loadTemplate(){
    if(loaded)return true;
    const host=document.querySelector("[data-showlink-navbar]");
    if(!host)return false;
    if(templatePromise)return templatePromise;
    templatePromise=(async()=>{
      try{
        const r=await fetch("/components/navbar.html",{cache:"no-store"});
        if(!r.ok)throw new Error(`navbar.html ${r.status}`);
        host.innerHTML=await r.text();
        loaded=true;
        return true;
      }catch(e){
        console.error("ShowLink navbar import failed:",e);
        host.innerHTML="";
        return false;
      }finally{templatePromise=null;}
    })();
    return templatePromise;
  }
  function closeDrawer(){const h=document.querySelector("[data-showlink-navbar]");if(!h)return;const drawer=h.querySelector("[data-showlink-drawer]"),overlay=h.querySelector("[data-showlink-overlay]"),menu=h.querySelector("[data-showlink-menu]");drawer?.classList.remove("is-open");overlay?.classList.remove("is-open");drawer?.setAttribute("aria-hidden","true");menu?.setAttribute("aria-expanded","false");document.documentElement.classList.remove("sl-drawer-open");}
  function openDrawer(){const h=document.querySelector("[data-showlink-navbar]");if(!h)return;const drawer=h.querySelector("[data-showlink-drawer]"),overlay=h.querySelector("[data-showlink-overlay]"),menu=h.querySelector("[data-showlink-menu]");drawer?.classList.add("is-open");overlay?.classList.add("is-open");drawer?.setAttribute("aria-hidden","false");menu?.setAttribute("aria-expanded","true");document.documentElement.classList.add("sl-drawer-open");}
  async function refreshPublicMenuVisibility(){
    try{
      const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;
      const {data,error}=await sb.rpc("get_public_shortlink_control_settings");if(error||!data)return;
      const map={"/dashboard.html":"dashboard","/all-public-links.html":"all-public-links","/pastelink.html":"pastelink","/shortlink.html":"shortlink","/payment-link.html":"payment-link","/order.html":"order","/notifikasi.html":"notifications","/withdraw.html":"withdraw","/profil.html":"profile","/kelola-tautan.html":"my-links","/pengaturan.html":"settings","/about.html":"about","/support.html":"support","/endorse.html":"endorse"};
      const settings=data.navbar_visibility||{};
      const order=Array.isArray(settings.__order)?settings.__order:[];
      const drawer=document.querySelector("[data-navbar-menu]");if(drawer&&order.length){const nodes=[...drawer.children];nodes.sort((a,b)=>{const key=x=>x.querySelector("[data-nav-link]")?.dataset.navKey||"";const ai=order.indexOf(key(a)),bi=order.indexOf(key(b));return (ai<0?999:ai)-(bi<0?999:bi)}).forEach(n=>drawer.appendChild(n));}
      const bottomOrder=Array.isArray(settings.__bottom_order)?settings.__bottom_order:["dashboard","withdraw","create","premium","profile"];
      const createItems={pastelink:"pastelink",shortlink:"shortlink","payment-link":"payment-link",sub4unlock:"sub4unlock"};const createMenu=document.querySelector("[data-bottom-create-menu]");createMenu?.querySelectorAll("a").forEach(a=>{const key=Object.keys(createItems).find(k=>a.getAttribute("href")===(k==="payment-link"?"/payment-link.html":`/${k}.html`));if(key){a.hidden=settings[createItems[key]]===false;a.style.display=a.hidden?"none":"";}});
      const bottom=document.querySelector("[data-showlink-bottom-nav]");if(bottom){const nodes=[...bottom.children];nodes.sort((a,b)=>{const key=x=>x.dataset.bottomLink|| (x.querySelector("[data-bottom-create]")?"create":"");const ai=bottomOrder.indexOf(key(a)),bi=bottomOrder.indexOf(key(b));return (ai<0?999:ai)-(bi<0?999:bi)}).forEach(n=>bottom.appendChild(n));bottom.querySelectorAll("[data-bottom-link]").forEach(a=>{const k=a.dataset.bottomLink;a.hidden=settings[k]===false;a.style.display=a.hidden?"none":"";});}

      document.querySelectorAll("[data-showlink-navbar] [data-nav-link]").forEach(a=>{
        const key=a.dataset.navKey||map[new URL(a.href,location.origin).pathname];if(!key)return;
        const hide=settings[key]===false;a.hidden=hide;a.style.display=hide?"none":"";
        let badgeEl=a.querySelector(".sl-admin-nav-badge");
        const item=settings.__items?.[key]||{},label=String(item.text||"").trim().slice(0,18);
        if(label){
          if(!badgeEl){badgeEl=document.createElement("span");badgeEl.className="sl-admin-nav-badge";badgeEl.setAttribute("aria-label",label);a.appendChild(badgeEl);}
          badgeEl.textContent=label;
          badgeEl.style.color=/^#[0-9a-f]{6}$/i.test(item.text_color||"")?item.text_color:"#ffffff";
          badgeEl.style.backgroundColor=/^#[0-9a-f]{6}$/i.test(item.bg_color||"")?item.bg_color:"#2563eb";
          badgeEl.hidden=false;
          a.querySelectorAll(".sl-new-badge:not(.sl-admin-nav-badge)").forEach(existing=>existing.hidden=true);
        }else{
          if(badgeEl)badgeEl.remove();
          a.querySelectorAll(".sl-new-badge").forEach(existing=>existing.remove());
        }
      });
      const appearance=settings.__appearance||{},root=document.documentElement;
      const cssMap={bg:"--sl-admin-nav-bg",drawer:"--sl-admin-drawer-bg",text:"--sl-admin-nav-text",accent:"--sl-admin-nav-accent"};
      for(const [key,variable] of Object.entries(cssMap)){const value=appearance[key];if(/^#[0-9a-f]{6}$/i.test(value||""))root.style.setProperty(variable,value);else root.style.removeProperty(variable);}
    }catch(e){console.debug("ShowLink navbar visibility settings unavailable",e);}
  }
  async function refreshAdminVisibility(){const els=document.querySelectorAll("[data-admin-nav]");if(!els.length||!logged())return;try{const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;const {data:{session}}=await sb.auth.getSession();if(!session)return;const {data,error}=await sb.rpc("is_current_user_admin");if(!error&&data===true)els.forEach(e=>e.hidden=false);}catch{}}
  async function refreshNotificationBadge(){const h=document.querySelector("[data-showlink-navbar]"),b=h?.querySelector("[data-notification-badge]"),mb=h?.querySelector("[data-menu-notification-badge]");[b,mb].filter(Boolean).forEach(el=>{el.hidden=true;el.textContent=""});h?.querySelector("[data-navbar-notification]")?.classList.remove("has-notifications");const items=h?.querySelector("[data-notification-items]");if(!logged()){const wrap=h?.querySelector(".sl-notification-wrap");if(wrap){wrap.hidden=true;wrap.style.display="none";wrap.style.visibility="hidden";wrap.style.pointerEvents="none"}if(items)items.innerHTML='<div class="sl-notification-empty">Masuk untuk melihat notifikasi.</div>';return}try{const sb=await window.ShowLinkSupabase?.load?.();if(!sb)return;const {data:{session}}=await sb.auth.getSession();const uid=session?.user?.id;if(!uid)return;const {count,error:ce}=await sb.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",uid).eq("is_read",false);if(!ce&&Number(count)>0){[b,mb].filter(Boolean).forEach(el=>{el.textContent=count>99?"99+":String(count);el.hidden=false});h?.querySelector("[data-navbar-notification]")?.classList.add("has-notifications")}else{[b,mb].filter(Boolean).forEach(el=>{el.hidden=true;el.textContent=""});h?.querySelector("[data-navbar-notification]")?.classList.remove("has-notifications")}if(!items)return;const {data,error}=await sb.from("notifications").select("id,type,title,message,link_url,is_read,created_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(5);if(error)throw error;if(!data?.length){items.innerHTML='<div class="sl-notification-empty">Belum ada notifikasi.</div>';return}items.innerHTML=data.map(n=>`<a class="sl-notification-item ${n.is_read?'':'is-unread'}" href="${String(n.link_url||'/notifikasi.html').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}" data-preview-id="${String(n.id).replace(/[^a-zA-Z0-9_-]/g,'')}"><span class="sl-notification-dot"></span><span class="sl-notification-copy"><strong>${String(n.title||'Notifikasi').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</strong><span>${String(n.message||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span><small>${new Date(n.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</small></span></a>`).join('');h.querySelectorAll('[data-preview-id]').forEach(a=>a.addEventListener('click',async()=>{const id=a.dataset.previewId;if(a.classList.contains('is-unread')){await sb.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('id',id).eq('user_id',uid);setTimeout(refreshNotificationBadge,150)}}));const read=h.querySelector('[data-notification-read-all]'),del=h.querySelector('[data-notification-delete-all]');if(read)read.onclick=async()=>{read.disabled=true;const {error}=await sb.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('user_id',uid).eq('is_read',false);read.disabled=false;if(error){alert('Gagal menandai notifikasi.');return}await refreshNotificationBadge()};if(del)del.onclick=async()=>{if(!confirm('Hapus SEMUA notifikasi? Tindakan ini tidak bisa dibatalkan.'))return;del.disabled=true;const {error}=await sb.from('notifications').delete().eq('user_id',uid);del.disabled=false;if(error){alert('Gagal menghapus notifikasi. Pastikan policy DELETE notifications aktif di Supabase.');return}await refreshNotificationBadge()};}catch(e){if(items)items.innerHTML='<div class="sl-notification-empty">Notifikasi gagal dimuat.</div>';console.warn('ShowLink notification preview:',e)}}
  function closeNotificationPanel(host){
    const btn=host?.querySelector('[data-navbar-notification]');
    const panel=host?.querySelector('[data-notification-panel]');
    if(panel)panel.hidden=true;
    btn?.setAttribute('aria-expanded','false');
  }
  function closeCreateMenu(host){
    const menu=host?.querySelector('[data-bottom-create-menu]');
    const btn=host?.querySelector('[data-bottom-create]');
    if(menu)menu.hidden=true;
    btn?.setAttribute('aria-expanded','false');
  }
  // Bind once on the stable host. Delegation survives auth/language refreshes and avoids duplicate toggles.
  function bindNavbarEvents(host){
    if(!host||host.dataset.slNavbarEventsBound==='true')return;
    host.dataset.slNavbarEventsBound='true';
    host.addEventListener('click',async e=>{
      const target=e.target instanceof Element?e.target:null;
      if(!target)return;
      const menuBtn=target.closest('[data-showlink-menu]');
      if(menuBtn){e.preventDefault();e.stopPropagation();host.querySelector('[data-showlink-drawer]')?.classList.contains('is-open')?closeDrawer():openDrawer();return;}
      if(target.closest('[data-showlink-close]')||target.closest('[data-showlink-overlay]')){e.preventDefault();closeDrawer();return;}
      if(target.closest('[data-nav-link]')){closeDrawer();return;}
      const noticeBtn=target.closest('[data-navbar-notification]');
      if(noticeBtn){
        e.preventDefault();e.stopPropagation();
        const panel=host.querySelector('[data-notification-panel]');
        if(!panel)return;
        const opening=panel.hidden;
        panel.hidden=!opening;
        noticeBtn.setAttribute('aria-expanded',String(opening));
        if(opening)await refreshNotificationBadge();
        return;
      }
      const createBtn=target.closest('[data-bottom-create]');
      if(createBtn){
        e.preventDefault();e.stopPropagation();
        const menu=host.querySelector('[data-bottom-create-menu]');
        const opening=!!menu?.hidden;
        if(menu)menu.hidden=!opening;
        createBtn.setAttribute('aria-expanded',String(opening));
        return;
      }
      if(target.closest('[data-bottom-create-menu] a'))closeCreateMenu(host);
    });
    document.addEventListener('click',e=>{
      const target=e.target instanceof Element?e.target:null;
      if(!target||!target.closest('.sl-notification-wrap'))closeNotificationPanel(host);
      if(!target||!target.closest('[data-showlink-bottom-nav]'))closeCreateMenu(host);
    });
  }
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
    if(create){const isId=(document.documentElement.lang||"id").toLowerCase().startsWith("id");create.setAttribute("aria-label",isId?"Buat":"Create");create.title=isId?"Buat":"Create";}
    const closeCreate=()=>{if(menu)menu.hidden=true;if(create)create.setAttribute("aria-expanded","false");};
    const path=location.pathname.replace(/\/$/,"")||"/";
    const isId=(document.documentElement.lang||"id").toLowerCase().startsWith("id");
    const labels={dashboard:isId?"Dashboard":"Dashboard",withdraw:isId?"Withdraw":"Withdraw",premium:"Premium",profile:isId?"Profil":"Profile",create:isId?"Buat":"Create"};
    nav.querySelectorAll("[data-bottom-link]").forEach(a=>{
      const key=a.dataset.bottomLink;
      a.setAttribute("aria-label",labels[key]||key);a.title=labels[key]||key;
      const active=(key==="dashboard"&&path==="/dashboard.html")||
        (key==="premium"&&path==="/premium.html")||
        (key==="withdraw"&&path==="/withdraw.html")||
        (key==="profile"&&path==="/profil.html");
      a.classList.toggle("is-active",active);
      if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");
    });
    if(!is)closeCreateMenu(host);
  }
  async function render(){
    const version=++renderVersion;
    const host=document.querySelector("[data-showlink-navbar]");
    if(!host)return;
    if(!(await loadTemplate()))return;
    const verifiedUser=await syncAuthSession();
    // Ignore older async renders that finish after a newer refresh.
    if(version!==renderVersion)return;
    authUser=verifiedUser;
    const is=logged();
    const menu=host.querySelector("[data-navbar-menu]"),actions=host.querySelector("[data-navbar-auth-actions]"),notice=host.querySelector("[data-navbar-notification]"),noticeWrap=host.querySelector(".sl-notification-wrap");
    if(menu)menu.innerHTML=is?authMarkup():guestMarkup();
    setupBottomNav(host,is);
    if(noticeWrap){noticeWrap.hidden=!is;noticeWrap.style.display=is?"flex":"none";noticeWrap.style.visibility=is?"visible":"hidden";noticeWrap.style.pointerEvents=is?"auto":"none";}
    if(notice){notice.setAttribute("aria-label",t("notifications"));notice.title=t("notifications");}
    if(actions){actions.innerHTML=is?"":`<a class="sl-btn sl-btn-ghost sl-desktop-action" href="${C.login}">${icon("sl-icon-green","fa-right-to-bracket")}<span>${t("login")}</span></a><a class="sl-btn sl-btn-primary sl-desktop-action" href="${C.register}">${icon("","fa-user-plus")}<span>${t("register")}</span></a>`;}
    bindNavbarEvents(host);
    document.body.classList.add("showlink-navbar-page");
    window.dispatchEvent(new CustomEvent("showlink:navbar-rendered"));
    refreshNotificationBadge();refreshAdminVisibility();refreshPublicMenuVisibility();
  }
  function logoutReady(){if(window.__showLinkLogoutReady)return;window.__showLinkLogoutReady=true;document.addEventListener("click",async e=>{const b=e.target instanceof Element?e.target.closest("[data-logout]"):null;if(!b)return;e.preventDefault();closeDrawer();try{const sb=await window.ShowLinkSupabase?.load?.();await sb?.auth.signOut();}catch{}localStorage.removeItem("showlink_user");window.dispatchEvent(new CustomEvent("showlink:auth-change",{detail:{user:null}}));location.replace(C.home);});}
  window.ShowLinkNavbar={render,refresh:()=>{render()},refreshNotifications:refreshNotificationBadge,setAuth:u=>{authUser=u||null;render()}};
  window.addEventListener("showlink:auth-change",e=>{authUser=e.detail?.user||null;render();});window.addEventListener("showlink:language-change",()=>render());document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeDrawer();closeNotificationPanel(document.querySelector("[data-showlink-navbar]"));closeCreateMenu(document.querySelector("[data-showlink-navbar]"));}});logoutReady();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{authUser=null;render()},{once:true});else{authUser=null;render();}
})();
