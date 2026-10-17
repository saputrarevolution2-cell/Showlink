/* ShowLink Task 1 — clear, single-pass user flow. */
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
    const flow = window.SLF, status = $('#status'), status2 = $('#status2');
    const directSlug = new URLSearchParams(location.search).get("slug") || sessionStorage.getItem("sl_slug") || "";
    const directAccessLink = document.getElementById("sl-direct-access-link");
    const directNotice = $('#sl-direct-floating-notice'), directNoticeClose = $('#sl-direct-notice-close');
    if (directAccessLink && directSlug) directAccessLink.href = "/shortlink-payment.html?slug=" + encodeURIComponent(directSlug);
    // Akses langsung adalah notifikasi mandiri: tampil sejak halaman dibuka,
    // tidak menunggu Task 1 selesai dan tidak bergantung pada notifikasi sukses.
    directNotice?.classList.add('is-visible');
    directNoticeClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));
    const firstDownload = $('#top'), sponsorButton = $('#save'), scrollDownButton = $('#down');
    const summaryDownload = $('#now'), scrollUpButton = $('#up'), continueButton = $('#next');
    const successMessage = $('#success'), notice = $('#task-completion-area'), noticeClose = $('#task-notice-close');
    const sponsorSlot = $('[data-shortlink-ad-slot="1"]');
    let started = false, summaryStarted = false, completing = false, navigating = false;
    flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 1`; })
      .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });

    // 1) Download awal: 10 detik, lalu munculkan Download Save dan Next ke bawah.
    firstDownload?.addEventListener('click', async () => {
      if (started || firstDownload.disabled) return; started = true; setBusy(firstDownload, true);
      await countdown(status, 10000, 'Menyiapkan langkah pertama');
      firstDownload.classList.add('hide'); sponsorButton?.classList.remove('hide'); scrollDownButton?.classList.remove('hide');
      setBusy(firstDownload, false);
      if (status) status.textContent = 'Langkah pertama selesai. Pilih Download Save atau lanjut ke bawah.';
      scrollToElement(sponsorButton || scrollDownButton);
    });
    // Sponsor opsional: buka URL sponsor yang dikonfigurasi admin jika tersedia.
    sponsorButton?.addEventListener('click', () => {
      const anchor = sponsorSlot?.querySelector('a[href]');
      if (anchor && /^https?:$/.test(new URL(anchor.href).protocol)) window.open(anchor.href, '_blank', 'noopener,noreferrer');
      else scrollToElement(sponsorSlot);
      if (status) status.textContent = 'Sponsor dibuka jika tautannya tersedia. Klik iklan tidak diwajibkan.';
    });
    // 2) Scroll ke bawah menuju ringkasan, lalu tampilkan tombol Download.
    scrollDownButton?.addEventListener('click', () => {
      scrollDownButton.classList.add('hide'); scrollToElement($('.magazine-side-card') || $('#bottom-step'));
      window.setTimeout(() => { summaryDownload?.classList.remove('hide'); scrollToElement(summaryDownload); }, 500);
    });
    // 3) Download ringkasan: 7 detik, lalu tampilkan Next Up.
    summaryDownload?.addEventListener('click', async () => {
      if (summaryStarted || summaryDownload.disabled) return; summaryStarted = true; setBusy(summaryDownload, true);
      await countdown(status2, 7000, 'Memproses download');
      summaryDownload.classList.add('hide'); scrollUpButton?.classList.remove('hide'); setBusy(summaryDownload, false);
      if (status2) status2.textContent = 'Selesai. Tekan Next Up untuk kembali ke atas dan menyelesaikan Task 1.';
      scrollToElement(scrollUpButton);
    });
    // 4) Next Up: kembali ke atas dan munculkan notifikasi sukses beserta tombol lanjut.
    scrollUpButton?.addEventListener('click', () => {
      if (completing) return; completing = true;
      scrollUpButton.classList.add('hide'); sponsorButton?.classList.add('hide'); scrollDownButton?.classList.add('hide');
      summaryDownload?.classList.add('hide'); firstDownload?.classList.add('hide');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => {
        if (successMessage) { successMessage.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Success — Task 1 Done'; successMessage.classList.remove('hide'); }
        if (continueButton) { continueButton.textContent = 'Lanjut ke Task 2'; continueButton.classList.remove('hide'); continueButton.disabled = false; }
        notice?.classList.add('is-visible'); if (status) status.textContent = ''; continueButton?.focus({ preventScroll: true });
      }, 450);
    });
    // 5) Satu klik pada Lanjut ke Task 2 memulai loading 5 detik, lalu berpindah.
    continueButton?.addEventListener('click', async () => {
      if (!completing || navigating || continueButton.disabled) return; navigating = true; setBusy(continueButton, true);
      await countdown(status, 5000, 'Membuka Task 2'); flow.go('task2.html');
    });
    // Menutup notifikasi tidak mengunci alur: tombol lanjut tetap tersedia di kartu utama.
    noticeClose?.addEventListener('click', () => {
      notice?.classList.remove('is-visible');
      if (completing && continueButton) {
        continueButton.classList.remove('hide'); continueButton.style.position = 'static'; continueButton.style.width = '100%'; continueButton.style.marginTop = '12px';
        const card = $('.card'); if (card && !card.contains(continueButton)) card.appendChild(continueButton);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
