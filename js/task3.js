/* ShowLink Task 3 — page-specific steps and final redirect. */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const setBusy = (button, busy) => { if (button) button.disabled = Boolean(busy); };
  function countdown(status, duration, label) {
    return new Promise((resolve) => {
      if (!status) { window.setTimeout(resolve, duration); return; }
      status.replaceChildren();
      const wrap = document.createElement('div'); wrap.className = 'sl-countdown';
      const spinner = document.createElement('span'); spinner.className = 'sl-spinner'; spinner.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.className = 'sl-countdown-text';
      const track = document.createElement('span'); track.className = 'sl-progress';
      const fill = document.createElement('span'); track.appendChild(fill); wrap.append(spinner, text, track); status.appendChild(wrap);
      const start = Date.now();
      function tick() {
        const elapsed = Date.now() - start;
        text.textContent = `${label} ${Math.max(0, Math.ceil((duration - elapsed) / 1000))} detik`;
        fill.style.width = `${Math.min(100, elapsed / duration * 100)}%`;
        if (elapsed >= duration) { text.textContent = `${label} selesai`; fill.style.width = '100%'; resolve(); return; }
        window.requestAnimationFrame(tick);
      }
      tick();
    });
  }
  function scrollTo(element) { if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function init() {
    if (!window.SLF) return;
    const flow = window.SLF, status = $('#status'), startButton = $('#top'), redirectButton = $('#redirect-final');
    const slug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
    const directLink = $('#sl-direct-access-link');
    if (directLink && slug) directLink.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
    const steps = Array.from(document.querySelectorAll('[data-step]'));
    let started = false, completedSteps = 0, redirecting = false;
    flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 3`; })
      .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });
    startButton?.addEventListener('click', async () => {
      if (started || startButton.disabled) return; started = true; setBusy(startButton, true);
      await countdown(status, 10000, 'Menyiapkan Task 3');
      startButton.classList.add('hide'); steps[0]?.classList.remove('hide'); setBusy(startButton, false);
      if (status) status.textContent = 'Mulai langkah satu per satu. Klik iklan sponsor tidak diperlukan.';
      scrollTo(steps[0]);
    });
    steps.forEach((button, index) => {
      button.addEventListener('click', async () => {
        if (index !== completedSteps || button.disabled || !started) return;
        setBusy(button, true);
        await countdown(status, 5000, `Menyelesaikan langkah ${index + 1}`);
        button.textContent = `Langkah ${index + 1} selesai`;
        button.classList.add('is-done'); button.setAttribute('aria-label', `Langkah ${index + 1} selesai`); setBusy(button, true);
        completedSteps += 1;
        const nextStep = steps[completedSteps];
        if (nextStep) { nextStep.disabled = false; nextStep.classList.remove('hide'); scrollTo(nextStep); }
        else { redirectButton?.classList.remove('hide'); scrollTo(redirectButton); if (status) status.textContent = 'Semua langkah selesai. Kamu bisa melanjutkan ke halaman Final.'; }
      });
    });
    redirectButton?.addEventListener('click', async () => {
      if (redirecting || completedSteps !== steps.length) return; redirecting = true; setBusy(redirectButton, true);
      await countdown(status, 2500, 'Membuka halaman Final'); flow.go('shortlink-final.html');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
