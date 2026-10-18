document.addEventListener('DOMContentLoaded', async () => {
  const F = window.SLF;
  const $ = (selector) => document.querySelector(selector);
  const status = $('#status');
  const title = $('#title');
  const price = $('#price');
  const free = $('#free');
  const paid = $('#paid');
  const toast = $('#go-empty-toast');
  let toastShown = false;

  function showEmptyToast() {
    if (!toast || toastShown) return;
    toastShown = true;
    toast.hidden = false;
    window.setTimeout(() => { if (toast && !toast.matches(':hover')) toast.hidden = true; }, 9000);
  }

  $('#go-toast-close')?.addEventListener('click', () => { if (toast) toast.hidden = true; });

  // The admin renderer fills each slot when a sponsor is configured. If it is
  // empty, keep the standard placeholder and show one unobtrusive notification.
  const slotAreas = [...document.querySelectorAll('[data-shortlink-endorsements]')];
  const observer = new MutationObserver(() => {
    slotAreas.forEach((area) => {
      if (!area.children.length) {
        area.innerHTML = '<div class="sl-endorsement-empty"><span class="sl-endorsement-empty-icon"><i class="fa-solid fa-bullhorn" aria-hidden="true"></i></span><strong>Slot endorse sedang kosong</strong><p>Mau pasang promosi di ShowLink? Klik tombol buat endorse di bawah ini.</p><a class="sl-endorsement-cta" href="/endorse.html"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Buat endorse di sini</a></div>';
      }
      if (area.querySelector('.sl-endorsement-empty')) showEmptyToast();
    });
  });
  slotAreas.forEach((area) => observer.observe(area, { childList: true, subtree: true }));
  window.setTimeout(() => {
    slotAreas.forEach((area) => {
      if (!area.children.length) {
        area.innerHTML = '<div class="sl-endorsement-empty"><span class="sl-endorsement-empty-icon"><i class="fa-solid fa-bullhorn" aria-hidden="true"></i></span><strong>Slot endorse sedang kosong</strong><p>Mau pasang promosi di ShowLink? Klik tombol buat endorse di bawah ini.</p><a class="sl-endorsement-cta" href="/endorse.html"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Buat endorse di sini</a></div>';
      }
      if (area.querySelector('.sl-endorsement-empty')) showEmptyToast();
    });
  }, 2200);

  try {
    if (!F) throw new Error('Modul Shortlink belum dimuat. Muat ulang halaman atau buka kembali tautan lengkap.');
    const data = await F.get();
    if (title) title.textContent = data.title || 'Judul Shortlink';
    if (price) price.textContent = 'Rp ' + Number(data.access_price || 0).toLocaleString('id-ID');
    if (free) free.addEventListener('click', () => F.go('task1.html'));
    if (paid) paid.addEventListener('click', () => F.go('shortlink-payment.html'));
  } catch (error) {
    if (status) status.textContent = error?.message || 'Data Shortlink gagal dimuat.';
    if (free) free.disabled = true;
    if (paid) paid.disabled = true;
    if (status) status.setAttribute('role', 'alert');
  }
});
