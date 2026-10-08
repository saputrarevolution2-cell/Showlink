(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
  const iconFor = type => type === "order" ? "receipt" : type === "withdrawal" ? "money-bill-transfer" : type === "settlement" ? "wallet" : "bell";
  const timeFor = value => {
    try { return new Date(value).toLocaleString("id-ID", {dateStyle:"medium", timeStyle:"short"}); }
    catch { return String(value || ""); }
  };

  async function init(){
    const sb = await window.ShowLinkSupabase.load();
    const {data:{session}} = await sb.auth.getSession();
    if(!session) return location.replace('/login.html?redirect='+encodeURIComponent(location.pathname));

    const box = $("#notification-list");
    const markAll = $("#mark-all-read");
    const deleteAllRead = $("#delete-all-read");

    function emptyState(){
      box.innerHTML = '<div class="notification-empty"><span class="notification-empty-icon"><i class="fa-regular fa-bell-slash"></i></span><strong>Belum ada notifikasi</strong><span>Notifikasi pembayaran, order, settlement, dan withdrawal akan muncul di sini.</span></div>';
    }

    async function load(){
      box.innerHTML = '<div class="notification-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Memuat notifikasi...</span></div>';
      const {data,error} = await sb.from("notifications")
        .select("id,type,title,message,link_url,is_read,created_at")
        .eq("user_id",session.user.id)
        .order("created_at",{ascending:false})
        .limit(100);
      if(error) throw error;
      if(!data?.length){ emptyState(); updateActions([]); return; }

      box.innerHTML = data.map(n => `
        <article class="notice-item ${n.is_read ? "" : "unread"}" data-id="${esc(n.id)}">
          <span class="notice-dot notice-${esc(n.type)}"><i class="fa-solid fa-${iconFor(n.type)}"></i></span>
          <div class="notice-main">
            <div class="notice-topline"><strong>${esc(n.title)}</strong><span class="notice-status">${n.is_read ? "Dibaca" : "Baru"}</span></div>
            <div class="notice-message">${esc(n.message)}</div>
            <small>${timeFor(n.created_at)}${n.link_url ? ` · <a href="${esc(n.link_url)}">Buka</a>` : ""}</small>
          </div>
          <button class="notice-delete" type="button" data-delete-id="${esc(n.id)}" aria-label="Hapus notifikasi" title="Hapus notifikasi"><i class="fa-solid fa-trash-can"></i></button>
        </article>`).join('');

      box.querySelectorAll(".notice-item[data-id]").forEach(el => {
        el.addEventListener("click", async e => {
          if(e.target.closest("a,.notice-delete")) return;
          if(!el.classList.contains("unread")) return;
          const {error} = await sb.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("id",el.dataset.id).eq("user_id",session.user.id);
          if(error) return;
          el.classList.remove("unread");
          const status = el.querySelector(".notice-status"); if(status){status.textContent="Dibaca";}
          window.ShowLinkNavbar?.refreshNotifications();
        });
      });

      box.querySelectorAll("[data-delete-id]").forEach(btn => {
        btn.addEventListener("click", async e => {
          e.stopPropagation();
          const item = btn.closest(".notice-item");
          btn.disabled = true;
          item?.classList.add("is-deleting");
          const {error} = await sb.from("notifications").delete().eq("id",btn.dataset.deleteId).eq("user_id",session.user.id);
          if(error){
            btn.disabled = false;
            item?.classList.remove("is-deleting");
            alert("Notifikasi gagal dihapus. Pastikan policy DELETE notifications sudah diterapkan di Supabase.");
            return;
          }
          item?.remove();
          if(!box.querySelector(".notice-item")) emptyState();
          window.ShowLinkNavbar?.refreshNotifications();
        });
      });
      updateActions(data);
    }

    function updateActions(rows){
      const hasUnread = rows.some(x => !x.is_read);
      const hasRead = rows.some(x => x.is_read);
      if(markAll){markAll.disabled = !hasUnread; markAll.classList.toggle("is-disabled",!hasUnread);}
      if(deleteAllRead){deleteAllRead.disabled = !hasRead; deleteAllRead.classList.toggle("is-disabled",!hasRead);}
    }

    markAll?.addEventListener("click", async () => {
      if(markAll.disabled) return;
      markAll.disabled = true;
      const {error} = await sb.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("user_id",session.user.id).eq("is_read",false);
      if(error){markAll.disabled=false; alert("Gagal menandai notifikasi sebagai dibaca."); return;}
      await load();
      window.ShowLinkNavbar?.refreshNotifications();
    });

    deleteAllRead?.addEventListener("click", async () => {
      if(deleteAllRead.disabled) return;
      const ok = confirm("Hapus semua notifikasi yang sudah dibaca? Tindakan ini tidak bisa dibatalkan.");
      if(!ok) return;
      deleteAllRead.disabled = true;
      const {error} = await sb.from("notifications").delete().eq("user_id",session.user.id).eq("is_read",true);
      if(error){deleteAllRead.disabled=false; alert("Gagal menghapus notifikasi. Pastikan policy DELETE notifications sudah diterapkan di Supabase."); return;}
      await load();
      window.ShowLinkNavbar?.refreshNotifications();
    });

    await load();
  }

  document.addEventListener("DOMContentLoaded",()=>init().catch(e=>{
    const box=$("#notification-list");
    if(box) box.innerHTML='<div class="notification-error"><i class="fa-solid fa-circle-exclamation"></i><strong>Notifikasi gagal dimuat</strong><span>'+esc(e.message||'Terjadi kesalahan.')+'</span></div>';
  }));
})();
