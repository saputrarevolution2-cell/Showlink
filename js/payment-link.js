(() => {
  "use strict";

  const MIN_PRICE = 2000;
  const MAX_PRICE = 100000;
  const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+)/gi;

  const $ = (selector, root = document) => root.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeUrl(value) {
    const url = String(value || "").trim();
    return /^www\./i.test(url) ? `https://${url}` : url;
  }

  function linkifyContent(text) {
    return escapeHtml(text).replace(URL_RE, (match) => {
      const trailing = match.match(/[.,!?;:)\]}]+$/)?.[0] || "";
      const clean = trailing ? match.slice(0, -trailing.length) : match;
      return `<a href="${escapeHtml(normalizeUrl(clean))}" target="_blank" rel="noopener noreferrer">${escapeHtml(clean)}</a>${escapeHtml(trailing)}`;
    }).replace(/\r?\n/g, "<br>");
  }

  function rupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value);
  }

  function showError(selector, show) {
    const el = $(selector);
    if (el) el.hidden = !show;
  }

  function setResult(message, type = "info", link = "", price = null) {
    const box = $("#create-result");
    if (!box) return;
    box.hidden = false;
    box.className = `payment-result ${type}`;

    if (type === "success" && link) {
      const safeLink = escapeHtml(link);
      const priceHtml = price != null ? `<div class="payment-result-price"><span>Harga Payment Link</span><strong>${escapeHtml(rupiah(price))}</strong></div>` : "";
      box.innerHTML = `
        <div class="payment-result-head">
          <div class="payment-result-icon"><i class="fa-solid fa-circle-check"></i></div>
          <div><strong>${escapeHtml(message)}</strong><span>Link siap dibagikan dan dibuka oleh buyer.</span></div>
        </div>
        ${priceHtml}
        <div class="payment-result-url-wrap">
          <span class="payment-result-label"><i class="fa-solid fa-link"></i> URL Payment Link</span>
          <div class="payment-result-url" title="${safeLink}">${safeLink}</div>
        </div>
        <div class="payment-result-actions">
          <button type="button" class="payment-result-btn primary" data-copy-payment-link="${safeLink}"><i class="fa-solid fa-copy"></i><span>Salin Link</span></button>
          <a class="payment-result-btn" href="${safeLink}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i><span>Buka Link</span></a>
        </div>`;

      box.querySelector('[data-copy-payment-link]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        try {
          await navigator.clipboard.writeText(link);
          button.innerHTML = '<i class="fa-solid fa-check"></i><span>Tersalin</span>';
          button.classList.add('copied');
          setTimeout(() => {
            button.innerHTML = '<i class="fa-solid fa-copy"></i><span>Salin Link</span>';
            button.classList.remove('copied');
          }, 1800);
        } catch (_) {
          const ta = document.createElement('textarea');
          ta.value = link; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (_) {}
          ta.remove();
          button.innerHTML = '<i class="fa-solid fa-check"></i><span>Tersalin</span>';
        }
      });
      return;
    }

    box.innerHTML = message + (link ? ` <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a>` : "");
  }

  function validate(form) {
    const title = form.elements.title.value.trim();
    const content = form.elements.content.value.trim();
    const price = Number(form.elements.price.value);

    const badTitle = title.length < 1;
    const badContent = content.length < 1;
    const badPrice = !Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE;

    showError("[data-title-warning]", badTitle);
    showError("[data-content-warning]", badContent);
    showError("[data-price-warning]", badPrice);

    return !badTitle && !badContent && !badPrice;
  }

  function normalizePaymentUrl(url) {
    const value = String(url || "");
    return value.replace("/d/", "/p/");
  }

  async function createPaymentLink(form) {
    const sb = await window.ShowLinkSupabase.load();
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !sessionData?.session) {
      throw new Error(t("payment.session_error"));
    }

    const title = form.elements.title.value.trim();
    const description = form.elements.description.value.trim();
    const content = form.elements.content.value.trim();
    const price = Number(form.elements.price.value);

    const contentHtml = linkifyContent(content);

    const { data, error } = await sb.rpc("create_payment_link", {
      p_title: title,
      p_description: description || null,
      p_price: price,
      p_content_html: contentHtml,
      p_content_text: content,
      p_thumbnail_url: null
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.url) throw new Error(t("payment.url_error"));
    if (row?.url) row.url = normalizePaymentUrl(row.url);
    return row;
  }


  function currentLanguage() {
    const raw = localStorage.getItem("showlink-language") ||
      localStorage.getItem("showlink-lang") ||
      document.documentElement.lang || "id";
    return /^en/i.test(raw) ? "en" : "id";
  }

  function t(key) {
    const lang = currentLanguage();
    return window.SHOWLINK_PAYMENT_I18N?.[lang]?.[key] ??
      window.SHOWLINK_PAYMENT_I18N?.id?.[key] ?? key;
  }

  function applyPaymentLanguage() {
    const lang = currentLanguage();
    const dict = window.SHOWLINK_PAYMENT_I18N?.[lang] || window.SHOWLINK_PAYMENT_I18N.id;
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.dataset.i18nHtml;
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key] != null) el.setAttribute("placeholder", String(dict[key]).replace(/\\n/g, "\n"));
    });
  }

  async function applyPaymentPlanGate() { return; }

  function init() {
    const form = $("#create-link-form");
    if (!form) return;

    const price = $("#payment-price");
    price?.addEventListener("input", () => {
      const value = Number(price.value);
      showError("[data-price-warning]", !Number.isFinite(value) || value < MIN_PRICE || value > MAX_PRICE);
    });

    form.elements.title?.addEventListener("input", () => showError("[data-title-warning]", !form.elements.title.value.trim()));
    form.elements.content?.addEventListener("input", () => showError("[data-content-warning]", !form.elements.content.value.trim()));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validate(form)) return;

      const button = form.querySelector("button[type=submit]");
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Membuat link...</span>';
      setResult(t("payment.loading"), "loading");

      try {
        const result = await createPaymentLink(form);
        const priceText = rupiah(Number(form.elements.price.value));
        setResult(t("payment.success"), "success", result.url, Number(form.elements.price.value));
        form.reset();
      } catch (error) {
        console.error(error);
        setResult(error?.message || t("payment.generic_error"), "error");
      } finally {
        button.disabled = false;
        button.innerHTML = original;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyPaymentLanguage();
    init();
    applyPaymentPlanGate();

    window.addEventListener("showlink:language-change", applyPaymentLanguage);
    window.addEventListener("languagechange", applyPaymentLanguage);
    window.addEventListener("storage", (event) => {
      if (event.key === "showlink-language" || event.key === "showlink-lang") {
        applyPaymentLanguage();
      }
    });
  });
})();
