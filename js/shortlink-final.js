/* ShowLink Final gate: wait, then check completion of all three tasks. */
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (selector) => document.querySelector(selector);
  const status = $('#final-verify-status');
  const initialStatus = $('#final-initial-loading');
  const initialProgress = $('#final-initial-progress');
  const goButton = $('#final-go');
  const restartButton = $('#final-start-over');
  const result = $('#final-result');
  const directLink = $('#sl-direct-access-link');
  const directNotice = $('#sl-direct-floating-notice');
  const directClose = $('#sl-direct-notice-close');
  const slug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
  const flow = window.SLF;
  let destination = '';

  if (directLink && slug) directLink.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
  directNotice?.classList.add('is-visible');
  directClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));
  document.documentElement.dataset.theme = 'light';
  document.documentElement.style.colorScheme = 'light';

  function countdown(target, duration, label) {
    return new Promise((resolve) => {
      if (!target) { window.setTimeout(resolve, duration); return; }
      target.replaceChildren();
      const wrap = document.createElement('span'); wrap.className = 'sl-countdown';
      const spinner = document.createElement('span'); spinner.className = 'sl-spinner'; spinner.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.className = 'sl-countdown-text';
      const track = document.createElement('span'); track.className = 'sl-progress';
      const fill = document.createElement('span'); fill.id = 'final-initial-progress'; track.appendChild(fill);
      wrap.append(spinner, text, track); target.appendChild(wrap);
      const start = Date.now();
      function tick() {
        const elapsed = Date.now() - start;
        text.textContent = `${label} · ${Math.max(0, Math.ceil((duration - elapsed) / 1000))} detik`;
        fill.style.width = `${Math.min(100, elapsed / duration * 100)}%`;
        if (elapsed >= duration) { text.textContent = `${label} selesai`; fill.style.width = '100%'; resolve(); return; }
        window.requestAnimationFrame(tick);
      }
      tick();
    });
  }
  function setResult(message, isError = false) {
    if (!result) return;
    result.hidden = false; result.classList.toggle('is-error', isError); result.replaceChildren();
    const icon = document.createElement('i'); icon.className = isError ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    const text = document.createElement('span'); text.textContent = ` ${message}`;
    result.append(icon, text);
  }
  function completeForTask(task) {
    if (!slug) return false;
    try { return sessionStorage.getItem(`sl_task${task}_complete_${slug}`) === 'true'; } catch (_) { return false; }
  }
  function showRestart(message, isError = true) {
    setResult(message, isError);
    if (status) status.textContent = 'Selesaikan semua task di browser dan tab sesi yang sama, lalu buka kembali halaman Final.';
    if (restartButton) {
      restartButton.href = `/task1.html${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`;
      restartButton.hidden = false;
    }
    if (goButton) goButton.hidden = true;
  }

  function ensureEndorsementSlots() {
    const card = document.querySelector('.final-card');
    if (!card) return;
    let top = card.querySelector('[data-shortlink-endorsements="top"]');
    if (!top) {
      top = document.createElement('div');
      top.className = 'sl-endorsement-grid final-endorsement-top';
      top.dataset.shortlinkEndorsements = 'top';
      top.setAttribute('aria-label', 'Endorsement sponsor bagian atas');
      const firstAds = card.querySelector('.final-ad-grid');
      card.insertBefore(top, firstAds || card.firstChild);
    }
    let bottom = card.querySelector('[data-shortlink-endorsements="bottom"]');
    if (!bottom) {
      bottom = document.createElement('div');
      bottom.className = 'sl-endorsement-grid final-endorsement-bottom';
      bottom.dataset.shortlinkEndorsements = 'bottom';
      bottom.setAttribute('aria-label', 'Endorsement sponsor bagian bawah');
      const adGrids = card.querySelectorAll('.final-ad-grid');
      const lastAds = adGrids[adGrids.length - 1];
      if (lastAds) lastAds.insertAdjacentElement('afterend', bottom);
      else card.appendChild(bottom);
    }
    [top, bottom].forEach((area) => {
      if (!area.children.length) {
        const placeholder = document.createElement('div');
        placeholder.className = 'final-endorsement-placeholder';
        placeholder.innerHTML = '<i class="fa-solid fa-bullhorn" aria-hidden="true"></i><span>Slot Endorsement Sponsor</span><small>Tempat promosi sponsor akan tampil di sini.</small>';
        area.appendChild(placeholder);
      }
    });
  }

  try {
    if (!flow) throw new Error('Modul shortlink belum dimuat.');
    const data = await flow.get();
    const title = $('#title');
    if (title) title.textContent = `${data.title || 'Shortlink'} — Final`;
    destination = String(data.content_url || data.destination_url || '').trim();
    if (!/^https?:\/\//i.test(destination)) destination = '';
  } catch (error) {
    await countdown(initialStatus, 5000, 'Memeriksa akses');
    if (initialStatus) initialStatus.hidden = true;
    ensureEndorsementSlots();
    showRestart(error?.message || 'Data shortlink belum dapat dimuat. Buka kembali dari tautan lengkap.');
    return;
  }

  await countdown(initialStatus, 5000, 'Memeriksa penyelesaian Task 1, Task 2, dan Task 3');
  if (initialStatus) initialStatus.hidden = true;
  ensureEndorsementSlots();
  const missing = [1, 2, 3].filter((task) => !completeForTask(task));
  if (missing.length) {
    const label = missing.map((n) => `Task ${n}`).join(', ');
    showRestart(`Belum semua tahapan selesai. Belum terdeteksi: ${label}. Silakan mulai kembali dari Task 1.`);
    return;
  }
  if (!destination) {
    showRestart('Semua task tercatat, tetapi URL tujuan asli belum tersedia. Coba mulai ulang atau hubungi pemilik link.');
    return;
  }
  if (status) status.textContent = '';
  setResult('Semua tahapan berhasil terdeteksi. Tombol GO sudah siap.', false);
  if (restartButton) restartButton.hidden = true;
  if (goButton) goButton.hidden = false;

  goButton?.addEventListener('click', () => {
    if (!destination || [1, 2, 3].some((task) => !completeForTask(task))) {
      showRestart('Pemeriksaan ulang menemukan tahapan yang belum selesai. Silakan mulai kembali dari Task 1.');
      return;
    }
    const configured = String(goButton.dataset.adminDestination || '').trim();
    const target = /^https?:\/\//i.test(configured) ? configured : destination;
    location.assign(target);
  });

});
