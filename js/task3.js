/* ShowLink Task 3 — independent loading indicators beneath each action. */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const setBusy = (button, busy) => { if (button) button.disabled = Boolean(busy); };

  function countdown(status, duration, label) {
    return new Promise((resolve) => {
      if (!status) { window.setTimeout(resolve, duration); return; }
      status.replaceChildren();
      status.classList.add('is-loading');
      const wrap = document.createElement('div'); wrap.className = 'sl-countdown';
      const spinner = document.createElement('span'); spinner.className = 'sl-spinner'; spinner.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.className = 'sl-countdown-text';
      const track = document.createElement('span'); track.className = 'sl-progress';
      const fill = document.createElement('span'); track.appendChild(fill);
      wrap.append(spinner, text, track); status.appendChild(wrap);
      const start = Date.now();
      function tick() {
        const elapsed = Date.now() - start;
        text.textContent = `${label} · ${Math.max(0, Math.ceil((duration - elapsed) / 1000))} detik`;
        fill.style.width = `${Math.min(100, elapsed / duration * 100)}%`;
        if (elapsed >= duration) {
          text.textContent = `${label} selesai`;
          fill.style.width = '100%';
          status.classList.remove('is-loading');
          status.classList.add('is-complete');
          resolve();
          return;
        }
        window.requestAnimationFrame(tick);
      }
      tick();
    });
  }

  function scrollTo(element) {
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function init() {
    if (!window.SLF) return;
    const flow = window.SLF;
    const slug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
    const directLink = $('#sl-direct-access-link');
    const directNotice = $('#sl-direct-floating-notice');
    const directNoticeClose = $('#sl-direct-notice-close');
    if (directLink && slug) directLink.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
    directNotice?.classList.add('is-visible');
    directNoticeClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));

    const startButton = $('#top');
    const startStatus = $('#status-top');
    const steps = [1, 2, 3].map((number) => ({
      button: $(`[data-step="${number}"]`),
      status: $(`#status-step-${number}`),
      number
    }));
    const redirectButton = $('#redirect-final');
    const redirectStatus = $('#status-final');
    let started = false;
    let completedSteps = 0;
    let redirecting = false;

    flow.get().then((data) => {
      const title = $('#title');
      if (title) title.textContent = `${data.title || 'Shortlink'} — Task 3`;
    }).catch((error) => {
      if (startStatus) startStatus.textContent = error.message || 'Data shortlink belum bisa dimuat.';
    });

    startButton?.addEventListener('click', async () => {
      if (started || startButton.disabled) return;
      started = true;
      setBusy(startButton, true);
      await countdown(startStatus, 10000, 'Menyiapkan Task 3');
      startButton.classList.add('hide');
      setBusy(startButton, false);
      const first = steps[0];
      if (first?.button) {
        first.button.classList.remove('hide');
        first.button.disabled = false;
        scrollTo(first.button);
      }
    });

    steps.forEach(({ button, status, number }) => {
      button?.addEventListener('click', async () => {
        if (!started || number !== completedSteps + 1 || button.disabled) return;
        setBusy(button, true);
        await countdown(status, 5000, `Menyelesaikan langkah ${number}`);
        button.innerHTML = `<i class="fa-solid fa-circle-check"></i> Langkah ${number} selesai`;
        button.classList.add('is-done');
        button.setAttribute('aria-label', `Langkah ${number} selesai`);
        completedSteps = number;
        const next = steps[number];
        if (next?.button) {
          next.button.disabled = false;
          next.button.classList.remove('hide');
          scrollTo(next.button);
        } else if (completedSteps === steps.length) {
          redirectButton?.classList.remove('hide');
          if (redirectButton) redirectButton.disabled = false;
          if (redirectStatus) redirectStatus.textContent = 'Semua langkah selesai. Kamu sekarang dapat membuka halaman Final.';
          scrollTo(redirectButton);
        }
      });
    });

    redirectButton?.addEventListener('click', async () => {
      if (redirecting || completedSteps !== steps.length || redirectButton.disabled) return;
      redirecting = true;
      setBusy(redirectButton, true);
      await countdown(redirectStatus, 2500, 'Membuka halaman Final');
      flow.go('shortlink-final.html');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
