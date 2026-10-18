/* ShowLink Task 2 — same transparent editorial flow as Task 1. */
(function () {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  function setBusy(button, busy) { if (button) button.disabled = Boolean(busy); }
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

    // Slot 7 is reserved for an admin-managed display/native creative in the dismissible overlay.
    // Popunder scripts belong in a separate admin slot and are never copied into the modal.
    overlayTimer = window.setTimeout(() => {
      const hasDisplayAd = overlaySlot && (overlaySlot.querySelector('.sl-admin-ad-slot > *, .sl-admin-image-ad, iframe, img, ins, a') || overlaySlot.dataset.slAdMounted === 'true' && !overlaySlot.classList.contains('sl-global-ad-loaded'));
      if (hasDisplayAd && overlay) {
        overlay.classList.add('is-visible'); overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; overlayClose?.focus({ preventScroll: true });
      }
    }, 11000);
    function closeOverlay() {
      overlay?.classList.remove('is-visible'); overlay?.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    overlayClose?.addEventListener('click', closeOverlay);
    overlay?.addEventListener('click', (event) => { if (event.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && overlay?.classList.contains('is-visible')) closeOverlay(); });

    first?.addEventListener('click', async () => {
      if (started || first.disabled) return;
      started = true; setBusy(first, true); first.classList.add('hide');
      await countdown(status, 10000, 'Menyiapkan langkah pertama');
      save?.classList.remove('hide'); down?.classList.remove('hide'); setBusy(first, false);
      if (status) status.textContent = 'Langkah pertama selesai. Tautan sponsor bersifat opsional.';
      scrollTo(save || down);
    });
    save?.addEventListener('click', async () => {
      if (saveStarted || save.disabled) return;
      saveStarted = true; setBusy(save, true); save.classList.add('hide');
      await countdown(statusSave || status, 10000, 'Menyiapkan langkah Download Save');
      setBusy(save, false); down?.classList.remove('hide');
      if (statusSave) statusSave.textContent = 'Langkah Download Save selesai.';
      scrollTo(down);
    });
    down?.addEventListener('click', () => {
      down.classList.add('hide'); scrollTo($('#bottom-step') || $('.magazine-story:last-of-type'));
      window.setTimeout(() => { summary?.classList.remove('hide'); scrollTo(summary); }, 450);
    });
    summary?.addEventListener('click', async () => {
      if (summaryStarted || summary.disabled) return;
      summaryStarted = true; setBusy(summary, true); summary.classList.add('hide');
      await countdown(status2, 10000, 'Memproses langkah download');
      up?.classList.remove('hide'); setBusy(summary, false);
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
      navigating = true; next.classList.add('hide'); if (success) success.classList.add('hide'); setBusy(next, true);
      await countdown(status, 5000, 'Menyiapkan pilihan berikutnya');
      const choices = document.createElement('div'); choices.className = 'sl-next-choices';
      const task3 = document.createElement('a'); task3.className = 'btn task2-btn task2-btn-blue';
      task3.href = '/task3.html' + (slug ? '?slug=' + encodeURIComponent(slug) : ''); task3.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Lanjut ke Task 3';
      const paid = document.createElement('a'); paid.className = 'btn task2-btn task2-btn-green';
      paid.href = directLink?.href || '/shortlink-payment.html'; paid.innerHTML = '<i class="fa-solid fa-bolt"></i> Akses Langsung (Berbayar)';
      choices.append(task3, paid); completionArea?.appendChild(choices); completionArea?.classList.add('is-visible'); navigating = false; setBusy(next, false);
    });
    noticeClose?.addEventListener('click', () => completionArea?.classList.remove('is-visible'));
    window.addEventListener('pagehide', () => { if (overlayTimer) window.clearTimeout(overlayTimer); document.body.style.overflow = ''; }, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
