/* Paid Shortlink access: skip the access-choice screen only when the server confirms entitlement. */
document.addEventListener('DOMContentLoaded', async () => {
  const F = window.SLF, $ = F && F.$;
  const notice = document.getElementById('telegramNotice');
  const closeNotice = document.getElementById('closeTelegramNotice');
  try { if (sessionStorage.getItem('sl_go_telegram_notice_closed') === '1') notice.hidden = true; } catch {}
  closeNotice?.addEventListener('click', () => { notice.hidden = true; try { sessionStorage.setItem('sl_go_telegram_notice_closed', '1'); } catch {} });
  const lang = () => (window.ShowLinkLanguage?.getLanguage?.() || document.documentElement.lang || 'id').toLowerCase().startsWith('en') ? 'en' : 'id';
  const priceLabel = value => (lang() === 'en' ? 'Direct access price: ' : 'Harga akses langsung: ') + 'Rp ' + Number(value || 0).toLocaleString(lang() === 'en' ? 'en-US' : 'id-ID');
  try {
    const d = await F.get();
    const slug = F.slug();
    const price = Number(d.access_price || 0);

    // Free links must still go through the AdsLink/task flow.
    if (price > 0) {
      const cfg = window.SHOWLINK_SUPABASE || {};
      const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
      const token = sessionStorage.getItem('sl_guest_access_token') || null;
      const { data, error } = await sb.rpc('resolve_shortlink', {
        p_slug: slug,
        p_guest_access_token: token
      });
      if (error) throw error;
      const resolved = Array.isArray(data) ? data[0] : data;
      if (resolved && !resolved.payment_required && resolved.destination_url) {
        const dest = new URL(resolved.destination_url);
        if (!['http:', 'https:'].includes(dest.protocol)) throw new Error('URL tujuan tidak aman.');
        $('#title').textContent = lang() === 'en' ? 'Access verified' : 'Akses terverifikasi';
        $('#price').textContent = lang() === 'en' ? 'Payment verified. Redirecting…' : 'Pembayaran terverifikasi. Mengarahkan ke tujuan…';
        $('#free').hidden = true;
        $('#paid').hidden = true;
        $('#status').textContent = lang() === 'en' ? 'Direct access verified successfully.' : 'Akses langsung berhasil diverifikasi.';
        location.replace(dest.href);
        return;
      }
    }

    $('#title').textContent = d.title || (lang() === 'en' ? 'Choose Access' : 'Pilih Akses');
    $('#price').textContent = 'Rp ' + price.toLocaleString(lang() === 'en' ? 'en-US' : 'id-ID');
    $('#free').hidden = false;
    $('#paid').hidden = false;
    $('#free').onclick = () => F.go('task1.html');
    $('#paid').onclick = () => F.go('shortlink-payment.html');
  } catch (e) {
    $('#status').textContent = e.message || (lang() === 'en' ? 'Shortlink failed to load.' : 'Shortlink gagal dimuat.');
    $('#free').disabled = true;
    $('#paid').disabled = true;
    $('#status').setAttribute('role', 'alert');
  }
});
