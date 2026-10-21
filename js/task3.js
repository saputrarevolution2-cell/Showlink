/* ShowLink Task 3 — sequential, compact flow. */
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
    const flow = window.SLF || null;
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
    const joinGate = $('#telegram-join-gate'), joinButton = $('#join-telegram'), joinStatus = $('#join-status');
    const footer = $('.sl-task-footer');
    let firstStarted = false, saveStarted = false, finalStarted = false, continueStarted = false, adScriptLoaded = false;

    if (flow && typeof flow.get === 'function') {
      flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 3`; })
        .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });
    }

    // Step 1: tombol Download di bawah judul Task 3 berubah menjadi loading.
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

    // Step 5: kembali ke atas, lalu tombol untuk memulai perpindahan ke Task 3.
    scrollUpButton?.addEventListener('click', () => {
      conceal(scrollUpButton);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => { reveal(continueButton); notice?.classList.add('is-visible'); scrollToElement(continueButton); }, 450);
    });

    // Sebelum selesai, tampilkan syarat bergabung ke grup Telegram.
    continueButton?.addEventListener('click', () => {
      if (continueStarted || continueButton.disabled) return;
      continueStarted = true;
      conceal(continueButton);
      reveal(joinGate);
      if (joinStatus) joinStatus.textContent = '';
      scrollToElement(joinGate, 'center');
    });

    // Tombol Join Now membuka grup dan memulai hitung mundur 3 detik.
    // Klik ini tidak memverifikasi keanggotaan Telegram secara otomatis.
    joinButton?.addEventListener('click', async () => {
      if (!joinButton || joinButton.disabled) return;
      setBusy(joinButton, true);
      window.open('https://t.me/+3u6SmGI90PJhMmFl', '_blank', 'noopener,noreferrer');
      await countdown(joinStatus, 3000, 'Menyiapkan langkah berikutnya');
      conceal(joinGate);
      try { if (flow && typeof flow.slug === 'function') sessionStorage.setItem(`sl_task3_complete_${flow.slug()}`, 'true'); } catch (_) {}
      if (successMessage) {
        successMessage.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Success — Task 3 Done';
        successMessage.classList.remove('hide');
      }
      reveal(finalNextButton);
      notice?.classList.add('is-visible');
      setBusy(joinButton, false);
      finalNextButton?.focus({ preventScroll: true });
    });
    finalNextButton?.addEventListener('click', () => {
      if (finalNextButton.disabled) return;
      setBusy(finalNextButton, true);
      finalNextButton.innerHTML = '<span class="sl-spinner" aria-hidden="true"></span> Membuka halaman Final…';
      window.setTimeout(() => { if (flow && typeof flow.go === 'function') flow.go('shortlink-final.html'); else location.href = 'shortlink-final.html'; }, 300);
    });
    noticeClose?.addEventListener('click', () => notice?.classList.remove('is-visible'));

    // Dua unit iklan dengan jalur animasi berbeda: iklan pertama turun dari atas, iklan kedua naik dari bawah.
    // Unit pertama muncul tiap 5 detik, unit kedua tiap 7 detik.
    const adPopup1 = $('#sl-adsterra-popup'), adClose1 = $('#sl-adsterra-close'), adContent1 = $('#sl-adsterra-content');
    const adPopup2 = $('#sl-adsterra-popup-2'), adClose2 = $('#sl-adsterra-close-2'), adContent2 = $('#sl-adsterra-content-2'), adRestore2 = $('#sl-adsterra-restore-2');
    let ad1Loaded = false, ad2Loaded = false, ad2Collapsed = false;
    function loadAd1() {
      if (ad1Loaded || !adContent1) return;
      ad1Loaded = true;
      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://pl31626334.profitableratecpmnetwork.com/ef7f0e942fbcf5b02dd491deb0f7ac5f/invoke.js';
      adContent1.appendChild(script);
    }
    function loadAd2() {
      if (ad2Loaded || !adContent2) return;
      ad2Loaded = true;
      // Set the provider config on window so the external invoke.js can always read it.
      window.atOptions = { key: 'b2fb4d9766519ed2c5073f02f6610543', format: 'iframe', height: 300, width: 160, params: {} };
      const config = document.createElement('script');
      config.textContent = "window.atOptions = { key: 'b2fb4d9766519ed2c5073f02f6610543', format: 'iframe', height: 300, width: 160, params: {} };";
      adContent2.appendChild(config);
      const script = document.createElement('script');
      script.src = 'https://www.highrevenueformat.com/b2fb4d9766519ed2c5073f02f6610543/invoke.js';
      script.async = false;
      script.setAttribute('data-cfasync', 'false');
      adContent2.appendChild(script);
      if (!adContent2.querySelector('.sl-ad2-fallback')) {
        const fallback = document.createElement('div');
        fallback.className = 'sl-ad2-fallback';
        fallback.textContent = 'Iklan sponsor sedang dimuat…';
        adContent2.appendChild(fallback);
        window.setTimeout(() => { if (fallback.isConnected && adContent2.querySelector('iframe')) fallback.remove(); }, 2500);
      }
    }
    function showAd1() {
      if (!adPopup1 || document.visibilityState === 'hidden') return;
      if (adPopup2) { adPopup2.hidden = true; adPopup2.classList.remove('sl-ad2-slide-in'); }
      adPopup1.hidden = true;
      adPopup1.classList.remove('sl-ad1-slide-in');
      void adPopup1.offsetWidth;
      adPopup1.hidden = false;
      void adPopup1.offsetWidth;
      adPopup1.classList.add('sl-ad1-slide-in');
      loadAd1();
    }
    function showAd2() {
      if (!adPopup2 || document.visibilityState === 'hidden') return;
      // Kemunculan otomatis berikutnya mengembalikan iklan meskipun sebelumnya diminimalkan.
      ad2Collapsed = false;
      if (adRestore2) adRestore2.hidden = true;
      if (adPopup1) adPopup1.hidden = true;
      adPopup2.hidden = true;
      // Reset the entrance animation so every 7-second appearance slides up again.
      void adPopup2.offsetWidth;
      adPopup2.hidden = false;
      adPopup2.classList.remove('sl-ad2-slide-in');
      void adPopup2.offsetWidth;
      adPopup2.classList.add('sl-ad2-slide-in');
      loadAd2();
    }
    // Tombol X benar-benar independen: X pertama hanya menutup popup pertama.
    adClose1?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (adPopup1) { adPopup1.hidden = true; adPopup1.classList.remove('sl-ad1-slide-in'); }
    });
    // X kedua meminimalkan iklan kedua ke tombol ^ di bawah; iklan pertama tidak terpengaruh.
    adClose2?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      ad2Collapsed = true;
      if (adPopup2) { adPopup2.hidden = true; adPopup2.classList.remove('sl-ad2-slide-in'); }
      if (adRestore2) adRestore2.hidden = false;
    });
    // Tombol ^ di bawah menampilkan kembali iklan kedua.
    adRestore2?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      ad2Collapsed = false;
      if (adRestore2) adRestore2.hidden = true;
      showAd2();
    });
    // Jika iklan kedua sedang diminimalkan, sentuhan/klik di halaman juga menampilkannya lagi.
    document.addEventListener('pointerdown', (event) => {
      if (!ad2Collapsed) return;
      if (event.target?.closest?.('#sl-adsterra-restore-2, #sl-adsterra-close-2')) return;
      showAd2();
    }, { passive: true });
    window.setTimeout(showAd1, 5000);
    window.setInterval(showAd1, 5000);
    window.setTimeout(showAd2, 7000);
    window.setInterval(showAd2, 7000);

    // Iklan sponsor layar penuh: muncul setiap 3 detik, dapat ditutup, tidak mengambil alih tautan tombol.
    const fullAd = $('#sl-task3-fullscreen-ad');
    const fullAdClose = $('#sl-task3-full-ad-close');
    const fullAdContent = $('#sl-task3-full-ad-content');
    let fullAdScriptLoaded = false;
    function loadFullscreenAdScript() {
      if (fullAdScriptLoaded || !fullAdContent) return;
      fullAdScriptLoaded = true;
      fullAdContent.replaceChildren();
      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://pl31626285.profitableratecpmnetwork.com/1e/25/0c/1e250cc0da41c572970286fab29d5009.js';
      fullAdContent.appendChild(script);
    }
    function showFullscreenAd() {
      if (!fullAd || document.visibilityState === 'hidden') return;
      fullAd.hidden = false;
      if (fullAdClose) { fullAdClose.style.display = 'flex'; fullAdClose.style.visibility = 'visible'; fullAdClose.style.opacity = '1'; fullAdClose.style.zIndex = '2147483647'; }
      loadFullscreenAdScript();
    }
    function hideFullscreenAd() {
      if (fullAd) fullAd.hidden = true;
    }
    fullAdClose?.addEventListener('click', hideFullscreenAd);
    fullAd?.addEventListener('click', (event) => {
      if (event.target === fullAd) hideFullscreenAd();
    });
    window.setTimeout(showFullscreenAd, 3000);
    window.setInterval(showFullscreenAd, 3000);

  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
