(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const PAGE_SIZE = 10;
  let orders = [];
  let page = 1;

  const I18N = {
    id: {
      kicker: "PAYMENT LINK", title: "Order", subtitle: "Semua pesanan dari Payment Link kamu.",
      order: "Order", paymentLink: "Payment Link", amount: "Amount", status: "Status", time: "Waktu",
      loading: "Memuat...", empty: "Belum ada order.", error: "Gagal memuat order.",
      previous: "Sebelumnya", next: "Berikutnya", page: "Halaman",
      paid: "Berhasil", completed: "Selesai", processing: "Diproses", pending: "Menunggu",
      failed: "Gagal", cancelled: "Dibatalkan", rejected: "Ditolak", expired: "Kedaluwarsa", unknown: "Tidak diketahui"
    },
    en: {
      kicker: "PAYMENT LINK", title: "Orders", subtitle: "All orders from your Payment Links.",
      order: "Order", paymentLink: "Payment Link", amount: "Amount", status: "Status", time: "Time",
      loading: "Loading...", empty: "No orders yet.", error: "Failed to load orders.",
      previous: "Previous", next: "Next", page: "Page",
      paid: "Paid", completed: "Completed", processing: "Processing", pending: "Pending",
      failed: "Failed", cancelled: "Cancelled", rejected: "Rejected", expired: "Expired", unknown: "Unknown"
    }
  };

  const getLang = () => localStorage.getItem("showlink-language") === "en" ? "en" : "id";
  const t = (key) => I18N[getLang()][key] ?? I18N.id[key] ?? key;
  const money = (n) => new Intl.NumberFormat(getLang() === "en" ? "en-US" : "id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
  }).format(Number(n) || 0);
  const dateTime = (v) => new Intl.DateTimeFormat(getLang() === "en" ? "en-US" : "id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(v));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));

  function statusLabel(status) {
    const s = String(status || "").toLowerCase();
    return t({ paid:"paid", completed:"completed", processing:"processing", pending:"pending", failed:"failed", cancelled:"cancelled", rejected:"rejected", expired:"expired" }[s] || "unknown");
  }

  function applyLanguage() {
    document.documentElement.lang = getLang();
    document.querySelectorAll("[data-order-i18n]").forEach(el => {
      el.textContent = t(el.dataset.orderI18n);
    });
    document.title = getLang() === "en" ? "Orders — ShowLink" : "Order — ShowLink";
    render();
  }

  function render() {
    const body = $("#orders-body");
    const pager = $("#order-pagination");
    if (!body) return;

    if (!orders.length) {
      body.innerHTML = `<tr><td colspan="5" class="app-empty">${esc(t("empty"))}</td></tr>`;
      if (pager) { pager.style.display = "none"; pager.innerHTML = ""; }
      return;
    }

    const totalPages = Math.ceil(orders.length / PAGE_SIZE);
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const rows = orders.slice(start, start + PAGE_SIZE);

    body.innerHTML = rows.map(o => `
      <tr>
        <td><strong>${esc(o.order_number || o.id || "—")}</strong></td>
        <td>${esc(o.item_title || "Payment Link")}</td>
        <td>${money(o.amount)}</td>
        <td><span class="status ${esc(String(o.status || "").toLowerCase())}">${esc(statusLabel(o.status))}</span></td>
        <td>${esc(dateTime(o.paid_at || o.created_at))}</td>
      </tr>
    `).join("");

    if (!pager) return;
    if (totalPages <= 1) {
      pager.style.display = "none";
      pager.innerHTML = "";
      return;
    }

    pager.style.display = "flex";
    pager.innerHTML = `
      <button class="app-btn secondary" type="button" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i> ${esc(t("previous"))}</button>
      <span style="align-self:center;color:var(--muted,#748097);font-size:12px;font-weight:800">${esc(t("page"))} ${page} / ${totalPages}</span>
      <button class="app-btn secondary" type="button" data-page="${page + 1}" ${page === totalPages ? "disabled" : ""}>${esc(t("next"))} <i class="fa-solid fa-chevron-right"></i></button>
    `;
    pager.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => {
      const next = Number(btn.dataset.page);
      if (next >= 1 && next <= totalPages) {
        page = next;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }));
  }

  async function init() {
    const sb = await window.ShowLinkSupabase.load();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return location.replace("/login.html?redirect=" + encodeURIComponent(location.pathname));

    const { data, error } = await sb.from("orders")
      .select("id,order_number,item_title,amount,status,created_at,paid_at,payment_link_id")
      .eq("seller_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    orders = data || [];
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    init().catch(error => {
      console.error(error);
      const body = $("#orders-body");
      if (body) body.innerHTML = `<tr><td colspan="5" class="app-empty">${esc(error?.message || t("error"))}</td></tr>`;
    });
    window.addEventListener("showlink:language-change", () => applyLanguage());
  });
})();
