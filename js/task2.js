/* ShowLink Task 2 — same transparent editorial flow as Task 1. */
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
        if (text) text.textContent = `${label} ${Math.max(0, Math.ceil((duration - elapsed) / 1000))} dtk`;
        if (elapsed >= duration) { button.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Selesai'; button.disabled = true; button.classList.add('is-done'); resolve(); return; }
        window.requestAnimationFrame(tick);
      }
      tick();
    });
  }
  function scrollTo(element) { if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function init() {
    if (!window.SLF) return;
    const flow = window.SLF;
    const status = $('#status'), statusSave = $('#save-status'), status2 = $('#status2');
    const slug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
    const directLink = $('#sl-direct-access-link'), directNotice = $('#sl-direct-floating-notice');
    const directClose = $('#sl-direct-notice-close'), noticeClose = $('#task-notice-close');
    if (directLink && slug) directLink.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
    directNotice?.classList.add('is-visible');
    directClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));

    const first = $('#top'), save = $('#save'), down = $('#down'), summary = $('#now'), up = $('#up'), next = $('#next');
    const success = $('#success'), completionArea = $('#task-completion-area');
    const overlay = $('#task2-ad-overlay'), overlayClose = $('#task2-ad-overlay-close'), overlaySlot = $('[data-shortlink-ad-page="task2"][data-shortlink-ad-slot="7"]');
    let started = false, saveStarted = false, summaryStarted = false, completed = false, navigating = false;
    let overlayTimer = null;

    flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 2`; })
      .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });

    // A clearly labeled, dismissible 300x250 sponsor unit. The requested Adsterra
    // code is injected only when the notice is visible and reloaded on the next cycle.
    function mountRequestedAd() {
      if (!overlaySlot) return;
      overlaySlot.replaceChildren();
      const options = document.createElement('script');
      options.textContent = "atOptions = { 'key' : '995976d1f84651e529f61b1fec35968c', 'format' : 'iframe', 'height' : 250, 'width' : 300, 'params' : {} };";
      const loader = document.createElement('script');
      loader.src = 'https://www.highrevenueformat.com/995976d1f84651e529f61b1fec35968c/invoke.js';
      loader.async = true;
      loader.onerror = () => { if (overlaySlot && !overlaySlot.querySelector('iframe')) overlaySlot.innerHTML = '<span class="task2-ad-fallback"><i class="fa-solid fa-rectangle-ad"></i> Iklan sponsor belum tersedia.</span>'; };
      overlaySlot.append(options, loader);
    }
    function scheduleOverlay(delay = 6000) {
      window.clearTimeout(overlayTimer);
      overlayTimer = window.setTimeout(() => {
        if (overlay) {
          overlay.classList.add('is-visible'); overlay.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
          mountRequestedAd();
          overlayClose?.focus({ preventScroll: true });
        }
      }, delay);
    }
    scheduleOverlay(6000);
    function closeOverlay() {
      overlay?.classList.remove('is-visible'); overlay?.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      scheduleOverlay(6000);
    }
    overlayClose?.addEventListener('click', closeOverlay);
    overlay?.addEventListener('click', (event) => { if (event.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && overlay?.classList.contains('is-visible')) closeOverlay(); });

    first?.addEventListener('click', async () => {
      if (started || first.disabled) return;
      started = true;
      await countdownButton(first, 10000, 'Loading');
      save?.classList.remove('hide'); down?.classList.remove('hide');
      if (status) status.textContent = 'Langkah pertama selesai. Tautan sponsor bersifat opsional.';
      scrollTo(save || down);
    });
    save?.addEventListener('click', async () => {
      if (saveStarted || save.disabled) return;
      saveStarted = true;
      await countdownButton(save, 10000, 'Loading');
      down?.classList.remove('hide');
      if (statusSave) statusSave.textContent = 'Langkah Download Save selesai.';
      scrollTo(down);
    });
    down?.addEventListener('click', () => {
      down.classList.add('hide'); scrollTo($('#bottom-step') || $('.magazine-story:last-of-type'));
      window.setTimeout(() => { summary?.classList.remove('hide'); scrollTo(summary); }, 450);
    });
    summary?.addEventListener('click', async () => {
      if (summaryStarted || summary.disabled) return;
      summaryStarted = true;
      await countdownButton(summary, 10000, 'Loading');
      up?.classList.remove('hide');
      if (status2) status2.textContent = 'Selesai. Tekan Next Up untuk kembali ke atas dan menyelesaikan Task 2.';
      scrollTo(up);
    });
    up?.addEventListener('click', () => {
      if (completed) return; completed = true;
      up.classList.add('hide'); save?.classList.add('hide'); down?.classList.add('hide'); summary?.classList.add('hide'); first?.classList.add('hide');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => {
        try { sessionStorage.setItem(`sl_task2_complete_${flow.slug()}`, 'true'); } catch (_) {}
        if (success) { success.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Gass Kuyy Lanjut Cok! Task 2 selesai.'; success.classList.remove('hide'); }
        if (next) { next.textContent = 'Gass Kuyy Lanjut Cok'; next.classList.remove('hide'); next.disabled = false; }
        completionArea?.classList.add('is-visible'); if (status) status.textContent = '';
        next?.focus({ preventScroll: true });
      }, 450);
    });
    next?.addEventListener('click', async () => {
      if (!completed || navigating || next.disabled) return;
      navigating = true; if (success) success.classList.add('hide');
      await countdownButton(next, 5000, 'Loading');
      const choices = document.createElement('div'); choices.className = 'sl-next-choices';
      const task3 = document.createElement('a'); task3.className = 'btn task2-btn task2-btn-blue';
      task3.href = '/task3.html' + (slug ? '?slug=' + encodeURIComponent(slug) : ''); task3.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Lanjut ke Task 3';
      const paid = document.createElement('a'); paid.className = 'btn task2-btn task2-btn-green';
      paid.href = directLink?.href || '/shortlink-payment.html'; paid.innerHTML = '<i class="fa-solid fa-bolt"></i> Akses Langsung (Berbayar)';
      choices.append(task3, paid); completionArea?.appendChild(choices); completionArea?.classList.add('is-visible'); navigating = false;
    });
    noticeClose?.addEventListener('click', () => completionArea?.classList.remove('is-visible'));
    window.addEventListener('pagehide', () => { if (overlayTimer) window.clearTimeout(overlayTimer); document.body.style.overflow = ''; }, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
