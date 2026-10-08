(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const PAGE_SIZE = 10;
  let orders = [];
  let page = 1;

  const I18N = {
    id: {
      orderKicker: "PAYMENT LINK", ordersTitle: "Pesanan",
      ordersSubtitle: "Pantau semua pesanan dari Payment Link kamu dalam satu tempat.",
      orderOverview: "ORDER OVERVIEW", allOrders: "Semua pesanan",
      orderOverviewSub: "Lihat nominal, status, dan waktu setiap transaksi.",
      ordersLabel: "pesanan", orderCol: "Order", paymentLinkCol: "Payment Link",
      amountCol: "Nominal", statusCol: "Status", timeCol: "Waktu",
      loading: "Memuat pesanan...", noOrders: "Belum ada order.",
      failed: "Gagal memuat order.", page: "Halaman", previous: "Sebelumnya", next: "Berikutnya",
      paid: "Berhasil", processing: "Diproses", completed: "Selesai", pending: "Menunggu",
      failedStatus: "Gagal", cancelled: "Dibatalkan", expired: "Kedaluwarsa", unknown: "Tidak diketahui"
    },
    en: {
      orderKicker: "PAYMENT LINK", ordersTitle: "Orders",
      ordersSubtitle: "Track all orders from your Payment Links in one place.",
      orderOverview: "ORDER OVERVIEW", allOrders: "All orders",
      orderOverviewSub: "View the amount, status, and time of every transaction.",
      ordersLabel: "orders", orderCol: "Order", paymentLinkCol: "Payment Link",
      amountCol: "Amount", statusCol: "Status", timeCol: "Time",
      loading: "Loading orders...", noOrders: "No orders yet.",
      failed: "Failed to load orders.", page: "Page", previous: "Previous", next: "Next",
      paid: "Paid", processing: "Processing", completed: "Completed", pending: "Pending",
      failedStatus: "Failed", cancelled: "Cancelled", expired: "Expired", unknown: "Unknown"
    }
  };

  const lang = () => localStorage.getItem("showlink-language") === "en" ? "en" : "id";
  const t = (k) => I18N[lang()][k] || I18N.id[k] || k;
  const money = (n) => new Intl.NumberFormat(lang() === "en" ? "en-US" : "id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
  const dateTime = (v) => new Intl.DateTimeFormat(lang() === "en" ? "en-US" : "id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  function statusLabel(status) {
    const key = String(status || "").toLowerCase();
    const map = { paid:"paid", processing:"processing", completed:"completed", pending:"pending", failed:"failedStatus", cancelled:"cancelled", expired:"expired" };
    return t(map[key] || "unknown");
  }
  function statusClass(status) {
    const s = String(status || "unknown").toLowerCase();
    if (["paid", "completed"].includes(s)) return "success";
    if (["processing", "pending"].includes(s)) return "pending";
    if (["failed", "cancelled", "expired"].includes(s)) return "danger";
    return "neutral";
  }

  function translate() {
    document.documentElement.lang = lang();
    document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
    const c = $("#order-count");
    if (c) c.textContent = orders.length;
    render();
  }

  function render() {
    const body = $("#orders-body");
    const mobile = $("#orders-mobile");
    const pager = $("#order-pagination");
    if (!body) return;

    if (!orders.length) {
      body.innerHTML = `<tr><td colspan="5" class="order-empty"><span class="empty-icon"><i class="fa-regular fa-folder-open"></i></span><b>${esc(t("noOrders"))}</b></td></tr>`;
      if (mobile) mobile.innerHTML = "";
      if (pager) { pager.hidden = true; pager.innerHTML = ""; }
      return;
    }

    const totalPages = Math.ceil(orders.length / PAGE_SIZE);
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const rows = orders.slice(start, start + PAGE_SIZE);

    body.innerHTML = rows.map(o => {
      const status = statusClass(o.status);
      return `<tr>
        <td><strong class="order-number">${esc(o.order_number || "—")}</strong></td>
        <td><div class="product-cell"><span class="product-icon"><i class="fa-solid fa-link"></i></span><span>${esc(o.item_title || "Payment Link")}</span></div></td>
        <td><strong>${money(o.amount)}</strong></td>
        <td><span class="status-pill ${status}"><i class="fa-solid ${status === "success" ? "fa-circle-check" : status === "pending" ? "fa-clock" : status === "danger" ? "fa-circle-xmark" : "fa-circle-info"}"></i>${esc(statusLabel(o.status))}</span></td>
        <td class="time-cell">${esc(dateTime(o.paid_at || o.created_at))}</td>
      </tr>`;
    }).join("");

    if (mobile) {
      mobile.innerHTML = rows.map(o => {
        const status = statusClass(o.status);
        return `<article class="order-mobile-card">
          <div class="mobile-card-top"><span class="order-number">${esc(o.order_number || "—")}</span><span class="status-pill ${status}"><i class="fa-solid ${status === "success" ? "fa-circle-check" : status === "pending" ? "fa-clock" : status === "danger" ? "fa-circle-xmark" : "fa-circle-info"}"></i>${esc(statusLabel(o.status))}</span></div>
          <b>${esc(o.item_title || "Payment Link")}</b><strong>${money(o.amount)}</strong><small>${esc(dateTime(o.paid_at || o.created_at))}</small>
        </article>`;
      }).join("");
    }

    if (pager) {
      pager.hidden = totalPages <= 1;
      if (totalPages > 1) {
        const buttons = Array.from({length: totalPages}, (_, i) => `<button type="button" class="page-btn ${i + 1 === page ? "is-active" : ""}" data-page="${i + 1}">${i + 1}</button>`).join("");
        pager.innerHTML = `<button type="button" class="page-btn page-arrow" data-page="${page - 1}" ${page === 1 ? "disabled" : ""} aria-label="${esc(t("previous"))}"><i class="fa-solid fa-chevron-left"></i></button><span class="page-label">${esc(t("page"))} ${page} / ${totalPages}</span>${buttons}<button type="button" class="page-btn page-arrow" data-page="${page + 1}" ${page === totalPages ? "disabled" : ""} aria-label="${esc(t("next"))}"><i class="fa-solid fa-chevron-right"></i></button>`;
        pager.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => { const p = Number(btn.dataset.page); if (p >= 1 && p <= totalPages) { page = p; render(); window.scrollTo({top: 0, behavior: "smooth"}); }}));
      }
    }
  }

  async function init() {
    const sb = await window.ShowLinkSupabase.load();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return location.replace("/login.html?redirect=" + encodeURIComponent(location.pathname));
    const { data, error } = await sb.from("orders").select("id,order_number,item_title,amount,status,created_at,paid_at,payment_link_id").eq("seller_id", session.user.id).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    orders = data || [];
    $("#order-count").textContent = orders.length;
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    translate();
    init().catch(e => {
      console.error(e);
      const b = $("#orders-body");
      if (b) b.innerHTML = `<tr><td colspan="5" class="order-empty error"><span class="empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></span><b>${esc(e.message || t("failed"))}</b></td></tr>`;
    });
    window.addEventListener("showlink:language-change", translate);
  });
})();
