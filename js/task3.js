(() => {
  'use strict';
  const OUTBOUND_URL = 'https://www.profitableratecpmnetwork.com/pkmkxfrmiy?key=5b5750804fb6a29007e75d321e567d75';
  const AD_SCRIPT_URL = 'https://pl31626285.profitableratecpmnetwork.com/1e/25/0c/1e250cc0da41c572970286fab29d5009.js';
  const COPY = {
    id: {eyebrow:'TAUTAN TERAKHIR',title:'Selesaikan Task 3',copy:'Klik tombol di bawah untuk melanjutkan. Halaman akan menampilkan proses loading sebelum membuka tautan.',statusTitle:'Langkah terakhir',statusCopy:'Pastikan halaman tetap terbuka selama proses berlangsung.',continue:'Lanjutkan',openLink:'Buka tautan',note:'Tombol akan membuka tautan tujuan setelah loading singkat.',info:'Jika tautan tidak terbuka otomatis, klik salah satu tombol di atas sekali lagi.',footer:'Task 3 · Halaman tugas',loadingTitle:'Menyiapkan tautan...',loadingCopy:'Mohon tunggu sebentar'},
    en: {eyebrow:'FINAL LINK',title:'Complete Task 3',copy:'Click a button below to continue. A short loading screen appears before the destination opens.',statusTitle:'Final step',statusCopy:'Keep this page open while the process is running.',continue:'Continue',openLink:'Open link',note:'The destination link opens after a short loading screen.',info:'If the link does not open automatically, click one of the buttons above again.',footer:'Task 3 · Task page',loadingTitle:'Preparing your link...',loadingCopy:'Please wait a moment'}
  };
  const $ = (selector) => document.querySelector(selector);
  const loading = $('#loadingOverlay');
  const ad = $('#floatingAd');
  const slot = $('#adSlot');
  const closeAd = $('#closeAd');
  const restoreAd = $('#restoreAd');
  const languageToggle = $('#languageToggle');
  let language = 'id';
  let adTimer = null;
  let loadingTimer = null;
  let adWasDismissed = false;

  $('#year').textContent = new Date().getFullYear();

  function setLanguage(next) {
    language = next;
    document.documentElement.lang = next;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      if (COPY[next][key]) element.textContent = COPY[next][key];
    });
    languageToggle.textContent = next === 'id' ? 'EN' : 'ID';
  }
  languageToggle.addEventListener('click', () => setLanguage(language === 'id' ? 'en' : 'id'));

  document.querySelectorAll('.outbound-button').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      document.querySelectorAll('.outbound-button').forEach((item) => { item.disabled = true; });
      loading.classList.add('visible');
      loading.setAttribute('aria-hidden', 'false');
      loadingTimer = window.setTimeout(() => {
        // Navigate in the current tab after the visible loading state.
        window.location.assign(OUTBOUND_URL);
      }, 1100);
    });
  });

  function injectAdScript() {
    if (adWasDismissed || document.hidden) return;
    // Recreate the slot for each refresh so ad markup from a previous run is cleared.
    slot.replaceChildren();
    const script = document.createElement('script');
    script.src = AD_SCRIPT_URL;
    script.async = true;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    slot.appendChild(script);
    ad.classList.add('visible');
    ad.setAttribute('aria-hidden', 'false');
    restoreAd.hidden = true;
  }
  function startAdCycle() {
    if (adTimer) window.clearInterval(adTimer);
    injectAdScript();
    adTimer = window.setInterval(injectAdScript, 3000);
  }
  function dismissAd() {
    adWasDismissed = true;
    ad.classList.remove('visible');
    ad.setAttribute('aria-hidden', 'true');
    slot.replaceChildren();
    restoreAd.hidden = false;
    if (adTimer) window.clearInterval(adTimer);
    adTimer = null;
  }
  closeAd.addEventListener('click', dismissAd);
  restoreAd.addEventListener('click', () => {
    adWasDismissed = false;
    restoreAd.hidden = true;
    startAdCycle();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (adTimer) window.clearInterval(adTimer);
      adTimer = null;
    } else if (!adWasDismissed) startAdCycle();
  });
  // Begin after a short delay so the page content is visible first.
  window.setTimeout(startAdCycle, 800);
  window.addEventListener('pagehide', () => {
    if (adTimer) window.clearInterval(adTimer);
    if (loadingTimer) window.clearTimeout(loadingTimer);
  });
})();
