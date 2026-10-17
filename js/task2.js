/* ShowLink Task 2 — page-specific flow. Shared data/navigation stays in shortlink-flow.js. */
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
    const flow = window.SLF;
    const status = $('#status'), status2 = $('#status2');
    const slug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
    const directLink = $('#sl-direct-access-link');
    const directNotice = $('#sl-direct-floating-notice');
    const directNoticeClose = $('#sl-direct-notice-close');
    const noticeClose = $('#task-notice-close');
    if (directLink && slug) directLink.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
    directNotice?.classList.add('is-visible');
    directNoticeClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));
    const first = $('#top'), sponsor = $('#save'), down = $('#down'), summary = $('#now'), up = $('#up'), next = $('#next');
    const success = $('#success'), completionArea = $('#task-completion-area');
    let started = false, summaryStarted = false, completed = false, navigating = false;
    flow.get().then((data) => { const title = $('#title'); if (title) title.textContent = `${data.title || 'Shortlink'} — Task 2`; })
      .catch((error) => { if (status) status.textContent = error.message || 'Data shortlink belum bisa dimuat.'; });

    first?.addEventListener('click', async () => {
      if (started || first.disabled) return; started = true; setBusy(first, true);
      await countdown(status, 10000, 'Menyiapkan Task 2');
      first.classList.add('hide'); sponsor?.classList.remove('hide'); down?.classList.remove('hide'); setBusy(first, false);
      if (status) status.textContent = 'Langkah pertama selesai. Sponsor opsional; klik iklan tidak diperlukan.';
      scrollTo(sponsor || down);
    });
    sponsor?.addEventListener('click', () => {
      const slot = $('[data-shortlink-ad-slot]');
      const link = slot?.querySelector('a[href]');
      if (link && /^https?:$/.test(new URL(link.href).protocol)) window.open(link.href, '_blank', 'noopener,noreferrer');
      else scrollTo(slot);
      if (status) status.textContent = 'Sponsor opsional. Klik iklan tidak diperlukan untuk menyelesaikan task.';
    });
    down?.addEventListener('click', () => {
      down.classList.add('hide'); scrollTo($('#bottom-step'));
      window.setTimeout(() => { summary?.classList.remove('hide'); scrollTo(summary); }, 450);
    });
    summary?.addEventListener('click', async () => {
      if (summaryStarted || summary.disabled) return; summaryStarted = true; setBusy(summary, true);
      await countdown(status2, 7000, 'Memproses langkah berikutnya');
      summary.classList.add('hide'); up?.classList.remove('hide'); setBusy(summary, false);
      if (status2) status2.textContent = 'Selesai. Tekan Next Up untuk menyelesaikan Task 2.';
      scrollTo(up);
    });
    up?.addEventListener('click', () => {
      if (completed) return; completed = true;
      up.classList.add('hide'); sponsor?.classList.add('hide'); down?.classList.add('hide'); summary?.classList.add('hide'); first?.classList.add('hide');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.setTimeout(() => {
        try { sessionStorage.setItem(`sl_task2_complete_${flow.slug()}`, 'true'); } catch (_) {}
        if (success) { success.textContent = '✓ Success — Task 2 Done'; success.classList.remove('hide'); }
        if (next) { next.textContent = 'Lanjut ke Task 3'; next.classList.remove('hide'); next.disabled = false; }
        completionArea?.classList.add('is-visible'); if (status) status.textContent = '';
        next?.focus({ preventScroll: true });
      }, 400);
    });
    next?.addEventListener('click', async () => {
      if (!completed || navigating || next.disabled) return; navigating = true; setBusy(next, true);
      await countdown(status, 5000, 'Membuka Task 3'); flow.go('task3.html');
    });
    noticeClose?.addEventListener('click', () => {
      completionArea?.classList.remove('is-visible');
      if (completed && next) { next.classList.remove('hide'); next.style.position='static'; next.style.width='100%'; next.style.marginTop='12px'; const card=document.querySelector('.card'); if(card&&!card.contains(next))card.appendChild(next); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
