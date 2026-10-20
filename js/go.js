/* Paid Shortlink access: skip the access-choice screen only when the server confirms entitlement. */
document.addEventListener('DOMContentLoaded', async () => {
  const F = window.SLF, $ = F && F.$;
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
        $('#title').textContent = 'Akses terverifikasi';
        $('#price').textContent = 'Pembayaran terverifikasi. Mengarahkan ke tujuan…';
        $('#free').hidden = true;
        $('#paid').hidden = true;
        $('#status').textContent = 'Akses langsung berhasil diverifikasi.';
        location.replace(dest.href);
        return;
      }
    }

    $('#title').textContent = d.title || 'Pilih cara melanjutkan';
    $('#price').textContent = 'Harga akses langsung: Rp ' + price.toLocaleString('id-ID');
    $('#free').hidden = false;
    $('#paid').hidden = false;
    $('#free').onclick = () => F.go('task1.html');
    $('#paid').onclick = () => F.go('shortlink-payment.html');
  } catch (e) {
    $('#status').textContent = e.message || 'Shortlink gagal dimuat.';
    $('#free').disabled = true;
    $('#paid').disabled = true;
    $('#status').setAttribute('role', 'alert');
  }
});
