/* ShowLink Task 2 — sequential, compact flow. */
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
      wrap.append(spinner, text); status.appendChild(wrap);
      const start = Date.now();
      function tick() {
        const elapsed = Date.now() - start; const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        text.textContent = `${label} ${remaining} detik`;
        if (elapsed >= duration) { text.textContent = `${label} selesai`; resolve(); return; }
        window.setTimeout(tick, 150);
      }
      tick();
    });
  }
  function reveal(el) { if (el) el.classList.remove('hide'); }
  function conceal(el) { if (el) el.classList.add('hide'); }
  function setBusy(button, busy) { if (button) button.disabled = busy; }
  function scrollToElement(element, block = 'center') { if (element) element.scrollIntoView({ behavior: 'smooth', block }); }
  function init() {
    if (!window.SLF) return;
    const flow = window.SLF;
    const status = $('#status'), status2 = $('#status2'), saveStatus = $('#save-status');
    const directSlug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
    const directAccessLink = $('#sl-direct-access-link');
    const directNotice = $('#sl-direct-floating-notice'), directNoticeClose = $('#sl-direct-notice-close');
    if (directAccessLink && directSlug) directAccessLink.href = '/shortlink-payment.html?slug=' + encodeURIComponent(directSlug);
    directNotice?.classList.add('is-visible');
    directNoticeClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));

    const firstDownload = $('#top'), saveButton = $('#save'), scrollDownButton = $('#down');
    const finalDownload = $('#now'), scrollUpButton = $('#up'), continueButton = $('#next'), finalNextButton = $('#next-final');
    const successMessage = $('#success'), notice = $('#task-completion-area'), noticeClose = $('#task-notice-close');
    const footer = $('.sl-task-footer');
    let firstStarted = false, saveStarted = false, finalStarted = false, continueStarted = false, adScriptLoaded = false;

    flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 2`; })
      .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });

    // Step 1: tombol Download di bawah judul Task 2 berubah menjadi loading.
    firstDownload?.addEventListener('click', async () => {
      if (firstStarted || firstDownload.disabled) return;
      firstStarted = true; setBusy(firstDownload, true);
      await countdown(status, 10000, 'Menyiapkan langkah pertama');
      conceal(firstDownload); reveal(saveButton);
      if (status) status.textContent = '';
      scrollToElement($('.sl-article-controls'), 'start');
      scrollToElement(saveButton);
    });

    // Step 2: Download Save loading, lalu munculkan tombol scroll ke footer.
    saveButton?.addEventListener('click', async () => {
      if (saveStarted || saveButton.disabled) return;
      saveStarted = true; setBusy(saveButton, true);
      await countdown(saveStatus || status, 7000, 'Memproses Download Save');
      conceal(saveButton); reveal(scrollDownButton); setBusy(saveButton, false);
      if (saveStatus) saveStatus.textContent = '';
      scrollToElement(scrollDownButton);
    });

    // Step 3: scroll ke footer dan munculkan Download Now.
    scrollDownButton?.addEventListener('click', () => {
      conceal(scrollDownButton);
      if (footer) footer.scrollIntoView({ behavior: 'smooth', block: 'end' });
      window.setTimeout(() => { reveal(finalDownload); scrollToElement(finalDownload); }, 650);
    });

    // Step 4: Download Now loading, lalu munculkan Next Up.
    finalDownload?.addEventListener('click', async () => {
      if (finalStarted || finalDownload.disabled) return;
      finalStarted = true; setBusy(finalDownload, true);
      await countdown(status2, 7000, 'Memproses Download');
      conceal(finalDownload); reveal(scrollUpButton); setBusy(finalDownload, false);
      if (status2) status2.textContent = '';
      scrollToElement(scrollUpButton);
    });

    // Step 5: kembali ke atas, lalu tombol untuk memulai perpindahan ke Task 2.
    scrollUpButton?.addEventListener('click', () => {
      conceal(scrollUpButton);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => { reveal(continueButton); notice?.classList.add('is-visible'); scrollToElement(continueButton); }, 450);
    });

    // Klik lanjut: loading 3 detik, lalu tampilkan notifikasi sukses dan tombol Next final.
    continueButton?.addEventListener('click', async () => {
      if (continueStarted || continueButton.disabled) return;
      continueStarted = true; setBusy(continueButton, true);
      await countdown(status, 3000, 'Menyelesaikan Task 2');
      conceal(continueButton);
      try { sessionStorage.setItem(`sl_task2_complete_${flow.slug()}`, 'true'); } catch (_) {}
      if (successMessage) {
        successMessage.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Success — Task 2 Done';
        successMessage.classList.remove('hide');
      }
      reveal(finalNextButton);
      notice?.classList.add('is-visible');
      setBusy(continueButton, false);
      finalNextButton?.focus({ preventScroll: true });
    });
    finalNextButton?.addEventListener('click', () => {
      if (finalNextButton.disabled) return;
      setBusy(finalNextButton, true);
      finalNextButton.innerHTML = '<span class="sl-spinner" aria-hidden="true"></span> Membuka Task 3…';
      window.setTimeout(() => flow.go('task3.html'), 300);
    });
    noticeClose?.addEventListener('click', () => notice?.classList.remove('is-visible'));

    // Adsterra floating popup, muncul setiap 11 detik. Script iklan dimuat sekali.
    const adPopup = $('#sl-adsterra-popup'), adClose = $('#sl-adsterra-close'), adContent = $('#sl-adsterra-content');
    function loadAdsterra() {
      if (adScriptLoaded || !adContent) return;
      adScriptLoaded = true;
      const config = document.createElement('script');
      config.text = "atOptions = {'key':'995976d1f84651e529f61b1fec35968c','format':'iframe','height':250,'width':300,'params':{}};";
      adContent.appendChild(config);
      const adScript = document.createElement('script');
      adScript.src = 'https://www.highrevenueformat.com/995976d1f84651e529f61b1fec35968c/invoke.js';
      adScript.async = true;
      adContent.appendChild(adScript);
    }
    function showAdPopup() {
      if (!adPopup || document.visibilityState === 'hidden') return;
      adPopup.hidden = false;
      loadAdsterra();
    }
    adClose?.addEventListener('click', () => { if (adPopup) adPopup.hidden = true; });
    window.setTimeout(showAdPopup, 11000);
    window.setInterval(showAdPopup, 11000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
