/* ShowLink Task 1 — editorial flow with transparent sponsor links. */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  function countdownButton(button, duration, label) {
    return new Promise((resolve) => {
      if (!button) { window.setTimeout(resolve, duration); return; }
      const original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="sl-button-loading"><span class="sl-spinner" aria-hidden="true"></span><span class="sl-button-loading-text"></span></span>';
      const text = button.querySelector('.sl-button-loading-text');
      const start = Date.now();
      function tick() {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        if (text) text.textContent = `${label} ${remaining} dtk`;
        if (elapsed >= duration) {
          button.innerHTML = original;
          button.disabled = false;
          button.setAttribute('data-step-ready', 'true');
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      }
      tick();
    });
  }
  function scrollToElement(element) { if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function init() {
    if (!window.SLF) return;
    const flow = window.SLF, status = $('#status'), statusSave = $('#save-status'), status2 = $('#status2');
    const directSlug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
    const directAccessLink = document.getElementById('sl-direct-access-link');
    const directNotice = $('#sl-direct-floating-notice'), directNoticeClose = $('#sl-direct-notice-close');
    if (directAccessLink && directSlug) directAccessLink.href = '/shortlink-payment.html?slug=' + encodeURIComponent(directSlug);
    directNotice?.classList.add('is-visible');
    directNoticeClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));
    const adBackdrop = $('#sl-first-click-ad-backdrop');
    const firstClickAd = adBackdrop?.querySelector('[data-shortlink-ad-slot="7"]');
    const firstClickAdClose = $('#sl-first-click-ad-close');
    let adMounted = false, adTimer = 0;
    const fallbackAdCode = `<script>atOptions = {'key':'9040f068da4e9c10ece09b284e9903d1','format':'iframe','height':50,'width':320,'params':{}};<\/script><script src="https://www.highrevenueformat.com/9040f068da4e9c10ece09b284e9903d1/invoke.js"><\/script>`;
    const scheduleFloatingAd = (delay = 11000) => {
      window.clearTimeout(adTimer);
      adTimer = window.setTimeout(showFloatingAd, delay);
    };
    const showFloatingAd = () => {
      if (!adBackdrop || !firstClickAd) return;
      if (!adMounted) {
        const configuredCode = firstClickAd.dataset.slPendingCode || '';
        const codeToMount = configuredCode.includes('9040f068da4e9c10ece09b284e9903d1') ? configuredCode : fallbackAdCode;
        if (typeof window.SL_MOUNT_ADMIN_AD === 'function') {
          window.SL_MOUNT_ADMIN_AD(firstClickAd, codeToMount);
        }
        delete firstClickAd.dataset.slPendingCode;
        adMounted = firstClickAd.dataset.slAdMounted === 'true' || firstClickAd.classList.contains('sl-atoptions-banner-loaded');
      }
      if (adMounted) adBackdrop.hidden = false;
      else scheduleFloatingAd(11000);
    };
    const hideFloatingAd = () => {
      if (adBackdrop) adBackdrop.hidden = true;
      scheduleFloatingAd(11000);
    };
    firstClickAdClose?.addEventListener('click', hideFloatingAd);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && adBackdrop && !adBackdrop.hidden) hideFloatingAd();
    });
    // First appearance is after 11 seconds. The same loaded banner is reused after hiding;
    // it is not re-requested every cycle, avoiding artificial repeated ad impressions.
    scheduleFloatingAd(11000);
    const firstDownload = $('#top'), sponsorButton = $('#save'), scrollDownButton = $('#down');
    const summaryDownload = $('#now'), scrollUpButton = $('#up'), continueButton = $('#next');
    const successMessage = $('#success'), notice = $('#task-completion-area'), noticeClose = $('#task-notice-close');
    let started = false, sponsorStarted = false, summaryStarted = false, completing = false, navigating = false;
    flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 1`; })
      .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });

    firstDownload?.addEventListener('click', async () => {
      if (started || firstDownload.disabled) return; started = true;
      await countdownButton(firstDownload, 10000, 'Loading');
      firstDownload.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Selesai'; firstDownload.disabled = true;
      sponsorButton?.classList.remove('hide'); scrollDownButton?.classList.remove('hide');
      if (status) status.textContent = 'Langkah pertama selesai. Lanjutkan ke bawah atau buka tautan sponsor secara opsional.';
      scrollToElement(sponsorButton || scrollDownButton);
    });
    // Loading stays inside the button that the visitor pressed.
    sponsorButton?.addEventListener('click', async () => {
      if (sponsorStarted || sponsorButton.disabled) return; sponsorStarted = true;
      await countdownButton(sponsorButton, 10000, 'Loading');
      sponsorButton.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Selesai'; sponsorButton.disabled = true;
      scrollDownButton?.classList.remove('hide');
      if (statusSave) statusSave.textContent = 'Langkah Download Save selesai.';
      scrollToElement(scrollDownButton);
    });
    scrollDownButton?.addEventListener('click', () => {
      scrollDownButton.classList.add('hide'); scrollToElement($('.magazine-side-card') || $('#bottom-step'));
      window.setTimeout(() => { summaryDownload?.classList.remove('hide'); scrollToElement(summaryDownload); }, 500);
    });
    summaryDownload?.addEventListener('click', async () => {
      if (summaryStarted || summaryDownload.disabled) return; summaryStarted = true;
      await countdownButton(summaryDownload, 10000, 'Loading');
      summaryDownload.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Selesai'; summaryDownload.disabled = true;
      scrollUpButton?.classList.remove('hide');
      if (status2) status2.textContent = 'Selesai. Tekan Next Up untuk kembali ke atas dan menyelesaikan Task 1.';
      scrollToElement(scrollUpButton);
    });
    scrollUpButton?.addEventListener('click', () => {
      if (completing) return; completing = true;
      scrollUpButton.classList.add('hide'); sponsorButton?.classList.add('hide'); scrollDownButton?.classList.add('hide'); summaryDownload?.classList.add('hide'); firstDownload?.classList.add('hide');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => {
        try { sessionStorage.setItem(`sl_task1_complete_${flow.slug()}`, 'true'); } catch (_) {}
        if (successMessage) { successMessage.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Gass Kuyy Lanjut Cok! Task 1 selesai.'; successMessage.classList.remove('hide'); }
        if (continueButton) { continueButton.textContent = 'Gass Kuyy Lanjut Cok'; continueButton.classList.remove('hide'); continueButton.disabled = false; }
        notice?.classList.add('is-visible'); if (status) status.textContent = ''; continueButton?.focus({ preventScroll: true });
      }, 450);
    });
    continueButton?.addEventListener('click', async () => {
      if (!completing || navigating || continueButton.disabled) return; navigating = true;
      if (successMessage) successMessage.classList.add('hide');
      await countdownButton(continueButton, 5000, 'Loading');
      continueButton.classList.add('hide');
      const choices = document.createElement('div'); choices.className = 'sl-next-choices';
      const task2 = document.createElement('a'); task2.className = 'btn task1-btn task1-btn-blue'; task2.href = '/task2.html' + (directSlug ? '?slug=' + encodeURIComponent(directSlug) : ''); task2.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Lanjut ke Task 2';
      const paid = document.createElement('a'); paid.className = 'btn task1-btn task1-btn-green'; paid.href = directAccessLink?.href || '/shortlink-payment.html'; paid.innerHTML = '<i class="fa-solid fa-bolt"></i> Akses Langsung (Berbayar)';
      choices.append(task2, paid); notice?.appendChild(choices); notice?.classList.add('is-visible'); navigating = false;
    });
    noticeClose?.addEventListener('click', () => notice?.classList.remove('is-visible'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
