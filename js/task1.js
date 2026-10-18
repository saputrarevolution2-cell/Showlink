/* ShowLink Task 1 — editorial flow with transparent sponsor links. */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  function countdown(status, duration, label) {
    return new Promise((resolve) => {
      if (!status) { window.setTimeout(resolve, duration); return; }
      status.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className = 'sl-countdown';
      const spinner = document.createElement('span'); spinner.className = 'sl-spinner'; spinner.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.className = 'sl-countdown-text';
      const track = document.createElement('span'); track.className = 'sl-progress';
      const fill = document.createElement('span'); track.appendChild(fill); wrap.append(spinner, text, track); status.appendChild(wrap);
      const start = Date.now();
      function tick() {
        const elapsed = Date.now() - start; const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        text.textContent = `${label} ${remaining} detik`; fill.style.width = `${Math.min(100, (elapsed / duration) * 100)}%`;
        if (elapsed >= duration) { text.textContent = `${label} selesai`; fill.style.width = '100%'; resolve(); return; }
        requestAnimationFrame(tick);
      }
      tick();
    });
  }
  function scrollToElement(element) { if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function setBusy(button, busy) { if (button) button.disabled = busy; }
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
    let firstClickAdHandled = false;
    const closeFirstClickAd = () => { if (adBackdrop) adBackdrop.hidden = true; };
    firstClickAdClose?.addEventListener('click', closeFirstClickAd);
    adBackdrop?.addEventListener('click', (event) => { if (event.target === adBackdrop) closeFirstClickAd(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && adBackdrop && !adBackdrop.hidden) closeFirstClickAd(); });
    document.addEventListener('pointerdown', (event) => {
      if (firstClickAdHandled || !firstClickAd || window.scrollY > 100 || event.clientY > window.innerHeight) return;
      if (event.target.closest('a,button,input,textarea,select,[role="button"]')) return;
      const pendingCode = firstClickAd.dataset.slPendingCode;
      if (!pendingCode || typeof window.SL_MOUNT_ADMIN_AD !== 'function') return;
      firstClickAdHandled = true;
      window.SL_MOUNT_ADMIN_AD(firstClickAd, pendingCode);
      delete firstClickAd.dataset.slPendingCode;
      if (!firstClickAd.hidden && firstClickAd.querySelector('.sl-admin-ad-slot')) {
        adBackdrop.hidden = false;
        firstClickAdClose?.focus({ preventScroll: true });
      }
    }, { once: false, passive: true });
    const firstDownload = $('#top'), sponsorButton = $('#save'), scrollDownButton = $('#down');
    const summaryDownload = $('#now'), scrollUpButton = $('#up'), continueButton = $('#next');
    const successMessage = $('#success'), notice = $('#task-completion-area'), noticeClose = $('#task-notice-close');
    let started = false, sponsorStarted = false, summaryStarted = false, completing = false, navigating = false;
    flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 1`; })
      .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });

    firstDownload?.addEventListener('click', async () => {
      if (started || firstDownload.disabled) return; started = true; setBusy(firstDownload, true); firstDownload.classList.add('hide');
      await countdown(status, 10000, 'Menyiapkan langkah pertama');
      sponsorButton?.classList.remove('hide'); scrollDownButton?.classList.remove('hide'); setBusy(firstDownload, false);
      if (status) status.textContent = 'Langkah pertama selesai. Kamu bisa melanjutkan ke bawah atau membuka sponsor secara opsional.';
      scrollToElement(sponsorButton || scrollDownButton);
    });
    // Download Save is a local step timer; ad links remain separately labelled and optional.
    sponsorButton?.addEventListener('click', async () => {
      if (sponsorStarted || sponsorButton.disabled) return; sponsorStarted = true; setBusy(sponsorButton, true); sponsorButton.classList.add('hide');
      await countdown(statusSave, 10000, 'Menyiapkan langkah Download Save');
      setBusy(sponsorButton, false); scrollDownButton?.classList.remove('hide');
      if (statusSave) statusSave.textContent = 'Langkah Download Save selesai.';
      scrollToElement(scrollDownButton);
    });
    scrollDownButton?.addEventListener('click', () => {
      scrollDownButton.classList.add('hide'); scrollToElement($('.magazine-side-card') || $('#bottom-step'));
      window.setTimeout(() => { summaryDownload?.classList.remove('hide'); scrollToElement(summaryDownload); }, 500);
    });
    summaryDownload?.addEventListener('click', async () => {
      if (summaryStarted || summaryDownload.disabled) return; summaryStarted = true; setBusy(summaryDownload, true); summaryDownload.classList.add('hide');
      await countdown(status2, 10000, 'Memproses langkah download');
      scrollUpButton?.classList.remove('hide'); setBusy(summaryDownload, false);
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
      continueButton.classList.add('hide'); if (successMessage) successMessage.classList.add('hide'); setBusy(continueButton, true);
      await countdown(status, 5000, 'Menyiapkan pilihan berikutnya');
      const choices = document.createElement('div'); choices.className = 'sl-next-choices';
      const task2 = document.createElement('a'); task2.className = 'btn task1-btn task1-btn-blue'; task2.href = '/task2.html' + (directSlug ? '?slug=' + encodeURIComponent(directSlug) : ''); task2.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Lanjut ke Task 2';
      const paid = document.createElement('a'); paid.className = 'btn task1-btn task1-btn-green'; paid.href = directAccessLink?.href || '/shortlink-payment.html'; paid.innerHTML = '<i class="fa-solid fa-bolt"></i> Akses Langsung (Berbayar)';
      choices.append(task2, paid); notice?.appendChild(choices); notice?.classList.add('is-visible'); navigating = false;
    });
    noticeClose?.addEventListener('click', () => notice?.classList.remove('is-visible'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
