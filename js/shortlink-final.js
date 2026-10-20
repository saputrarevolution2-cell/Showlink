/* ShowLink Final gate: initial wait, user acknowledgement, and task completion check. */
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (selector) => document.querySelector(selector);
  const status = $('#final-verify-status');
  const initialStatus = $('#final-initial-loading');
  const initialProgress = $('#final-initial-progress');
  const humanWrap = $('#final-human-check-wrap');
  const humanCheck = $('#final-human-check');
  const downloadButton = $('#final-download-check');
  const goButton = $('#final-go');
  const restartButton = $('#final-start-over');
  const result = $('#final-result');
  const directLink = $('#sl-direct-access-link');
  const directNotice = $('#sl-direct-floating-notice');
  const directClose = $('#sl-direct-notice-close');
  const slug = new URLSearchParams(location.search).get('slug') || sessionStorage.getItem('sl_slug') || '';
  const flow = window.SLF;
  let destination = '';
  let verifying = false;
  let verified = false;

  if (directLink && slug) directLink.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
  directNotice?.classList.add('is-visible');
  directClose?.addEventListener('click', () => directNotice?.classList.remove('is-visible'));
  document.querySelectorAll('[data-task-theme-toggle]').forEach((button) => {
    const icon = button.querySelector('i');
    const apply = (theme) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      try { localStorage.setItem('showlink-theme', theme); } catch (_) {}
      const dark = theme === 'dark';
      button.setAttribute('aria-label', dark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
      if (icon) { icon.classList.toggle('fa-moon', !dark); icon.classList.toggle('fa-sun', dark); }
    };
    let theme = 'light';
    try { theme = localStorage.getItem('showlink-theme') || 'light'; } catch (_) {}
    apply(theme);
    button.addEventListener('click', () => apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  });

  function countdown(target, duration, label) {
    return new Promise((resolve) => {
      if (!target) { window.setTimeout(resolve, duration); return; }
      target.replaceChildren();
      const wrap = document.createElement('span'); wrap.className = 'sl-countdown';
      const spinner = document.createElement('span'); spinner.className = 'sl-spinner'; spinner.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.className = 'sl-countdown-text';
      const track = document.createElement('span'); track.className = 'sl-progress';
      const fill = document.createElement('span'); track.appendChild(fill); wrap.append(spinner, text, track); target.appendChild(wrap);
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

  function eventId(eventName) {
    // Reuse one receipt per event type and Shortlink in this tab session.
    // The database has a UNIQUE receipt constraint, so network retries cannot credit twice.
    const key = `sl_final_event_id_${eventName}_${slug}`;
    try {
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = (window.crypto && typeof window.crypto.randomUUID === 'function')
          ? window.crypto.randomUUID()
          : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
        sessionStorage.setItem(key, id);
      }
      return id;
    } catch (_) {
      return (window.crypto && typeof window.crypto.randomUUID === 'function')
        ? window.crypto.randomUUID()
        : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
    }
  }
  async function recordFinalEvent(eventName) {
    if (!slug || !window.ShowLinkSupabase?.load) return false;
    try {
      const sb = await window.ShowLinkSupabase.load();
      const { data, error } = await sb.rpc('record_shortlink_final_event', {
        p_slug: slug,
        p_event: eventName,
        p_event_id: eventId(eventName)
      });
      if (error) throw error;
      return data?.ok === true;
    } catch (error) {
      console.warn('Shortlink Final analytics unavailable:', error?.message || error);
      return false;
    }
  }
  try {
    const viewKey = `sl_final_view_recorded_${slug}`;
    if (slug && sessionStorage.getItem(viewKey) !== 'true') {
      await recordFinalEvent('view');
      sessionStorage.setItem(viewKey, 'true');
    }
  } catch (_) { if (slug) await recordFinalEvent('view'); }

  const initialLoading = countdown(initialStatus, 5000, 'Menyiapkan pemeriksaan awal');

  try {
    if (!flow) throw new Error('Modul shortlink belum dimuat.')
    const data = await flow.get();
    const title = $('#title');
    if (title) title.textContent = `${data.title || 'Shortlink'} — Final`;
    destination = Number(data.access_price || 0) > 0 ? '' : String(data.content_url || data.destination_url || '').trim();
    if (!/^https?:\/\//i.test(destination)) destination = '';
    if (Number(data.access_price || 0) > 0) {
      const directLink = $('#sl-direct-access-link');
      if (directLink) directLink.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
    }
  } catch (error) {
    if (status) status.textContent = error.message || 'Data shortlink belum dapat dimuat.';
  }

  await initialLoading;
  if (initialStatus) initialStatus.hidden = true;
  if (humanWrap) humanWrap.hidden = false;
  if (status) status.textContent = 'Centang konfirmasi untuk menampilkan tombol Download.';
  humanCheck?.addEventListener('change', () => {
    if (downloadButton) { downloadButton.hidden = !humanCheck.checked; downloadButton.disabled = !humanCheck.checked; }
    if (status) status.textContent = humanCheck.checked ? 'Konfirmasi diterima. Tekan Download untuk memeriksa tahapan.' : 'Centang konfirmasi untuk menampilkan tombol Download.';
  });

  downloadButton?.addEventListener('click', async () => {
    if (verifying || verified || !humanCheck?.checked) return;
    verifying = true; downloadButton.disabled = true; downloadButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa tahapan';
    await recordFinalEvent('click');
    await countdown(status, 10000, 'Memeriksa Task 1, Task 2, dan Task 3');
    const missing = [1, 2, 3].filter((task) => !completeForTask(task));
    verifying = false;
    if (missing.length) {
      const missingLabel = missing.map((n) => `Task ${n}`).join(', ');
      setResult(`Belum semua tahapan selesai. Belum terdeteksi: ${missingLabel}. Mulai kembali dari Task 1.`, true);
      if (restartButton) { restartButton.href = `/task1.html${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`; restartButton.hidden = false; }
      downloadButton.hidden = true;
      if (status) status.textContent = 'Selesaikan tiap task di browser dan tab sesi yang sama, lalu kembali ke halaman Final.';
      return;
    }
    if (!destination) {
      if (Number((JSON.parse(sessionStorage.getItem('sl_data') || '{}')).access_price || 0) > 0) {
        location.href = `/shortlink-payment.html?slug=${encodeURIComponent(slug)}`;
        return;
      }
      setResult('URL tujuan asli belum tersedia untuk shortlink ini. Hubungi pemilik link.', true);
      downloadButton.disabled = false; downloadButton.innerHTML = '<i class="fa-solid fa-download"></i> Coba periksa lagi';
      return;
    }
    verified = true;
    setResult('Semua tahapan terdeteksi selesai. Kamu bisa membuka link tujuan asli.', false);
    downloadButton.hidden = true;
    if (goButton) goButton.hidden = false;
    if (status) status.textContent = '';
  });

  goButton?.addEventListener('click', async () => {
    if (!verified || !destination || goButton.disabled) return;
    goButton.disabled = true;
    goButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membuka tujuan…';
    // A redirect and its CPM-based revenue are recorded only after the visitor presses GO.
    // Wait for the database receipt before leaving; only this explicit GO action can accrue CPM.
    // If recording fails, do not silently redirect and lose the earning event.
    const recorded = await recordFinalEvent('redirect');
    if (!recorded) {
      goButton.disabled = false;
      goButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Coba lagi';
      setResult('Pencatatan redirect belum berhasil. Periksa koneksi lalu tekan GO lagi.', true);
      return;
    }
    const configured = String(goButton.dataset.adminDestination || '').trim();
    const target = /^https?:\/\//i.test(configured) ? configured : destination;
    location.assign(target);
  });
});
