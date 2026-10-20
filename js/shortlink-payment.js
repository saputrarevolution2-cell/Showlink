/* ShowLink Shortlink checkout — uses the same trusted Cashi/BayarGG Edge Functions as Payment Link. */
(() => {
  const $ = (s) => document.querySelector(s);
  const cfg = () => window.SHOWLINK_SUPABASE || {};
  let sb, link, orderId = '', guestToken = '', isUser = false, activeGateway = '';
  let pollTimer = null;

  function slug() {
    const q = new URLSearchParams(location.search);
    return String(q.get('slug') || sessionStorage.getItem('sl_slug') || '').trim();
  }
  function money(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function status(message, error = false) {
    const node = $('#status'); if (!node) return;
    node.textContent = message; node.classList.toggle('error', !!error); node.setAttribute('role', 'status');
  }
  function guestAccessToken() {
    let token = sessionStorage.getItem('sl_guest_access_token');
    if (!token) {
      const bytes = new Uint8Array(24);
      if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
      else for (let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
      token = Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
      sessionStorage.setItem('sl_guest_access_token', token);
    }
    return token;
  }
  async function headers() {
    const { data } = await sb.auth.getSession();
    return { 'Content-Type':'application/json', apikey:cfg().anonKey, Authorization:`Bearer ${data?.session?.access_token || cfg().anonKey}` };
  }
  async function edge(name, body) {
    const resp = await fetch(`${cfg().url}/functions/v1/${name}`, { method:'POST', headers:await headers(), body:JSON.stringify(body) });
    const raw = await resp.text(); let result = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch (_) { result = { message:raw }; }
    if (!resp.ok || result.success === false) throw new Error(result.error || result.message || `${name} gagal (${resp.status})`);
    return result;
  }
  function showGatewayOptions(settings) {
    const app = document.querySelector('.card');
    app.querySelectorAll('.sl-gateways,.sl-payment-detail').forEach(n=>n.remove());
    const wrap = document.createElement('div'); wrap.className='sl-gateways';
    const enabled = [];
    if (settings?.cashi_enabled) enabled.push(['CASHI','Cashi — QRIS / checkout']);
    if (settings?.bayargg_enabled) enabled.push(['BAYAR_GG','BayarGG — QRIS / checkout']);
    if (!enabled.length) { status('Gateway pembayaran sedang tidak tersedia. Periksa pengaturan gateway di Supabase.', true); return; }
    const note = document.createElement('p'); note.className='notice'; note.textContent='Pilih metode pembayaran. Akses hanya dibuka setelah status pembayaran diverifikasi oleh ShowLink.'; wrap.append(note);
    for (const [key,label] of enabled) {
      const b=document.createElement('button'); b.type='button'; b.className='btn'; b.textContent=label; b.style.marginTop='8px'; b.addEventListener('click',()=>startCheckout(key,b)); wrap.append(b);
    }
    app.insertBefore(wrap, $('#status'));
    $('#pay').hidden = true;
  }
  async function startCheckout(gateway, button) {
    button.disabled=true; status('Membuat order pembayaran…'); activeGateway=gateway;
    try {
      const { data:userData } = await sb.auth.getUser(); isUser=!!userData?.user;
      guestToken = isUser ? '' : guestAccessToken();
      const {data:order,error}=await sb.rpc('create_shortlink_checkout_order', { p_slug:slug(), p_guest_access_token:isUser ? null : guestToken });
      if(error) throw error;
      if(order?.already_accessible) { status('Akses sudah tersedia. Membuka tautan…'); location.href='/d/'+encodeURIComponent(slug()); return; }
      orderId=order?.order_id;
      if(!orderId) throw new Error('Order tidak berhasil dibuat.');
      const body={order_id:orderId, ...(isUser?{}:{guest_access_token:guestToken})};
      const result=await edge(gateway==='CASHI'?'cashi-create-payment':'bayar-gg-create-payment',body);
      if(result.already_paid){status('Pembayaran sudah terverifikasi. Membuka tautan…');location.href='/d/'+encodeURIComponent(slug());return;}
      renderPayment(result, order);
      pollStatus();
    } catch(e) { status(e.message || 'Checkout gagal dibuat.',true); button.disabled=false; }
  }
  function renderPayment(result, order) {
    const app=document.querySelector('.card');
    const wrap=document.createElement('div'); wrap.className='sl-payment-detail';
    const heading=document.createElement('h2'); heading.textContent='Selesaikan pembayaran'; wrap.append(heading);
    const amount=document.createElement('p'); amount.textContent='Total: '+money(result.amount ?? result.final_amount ?? order.amount); wrap.append(amount);
    const qr=result.qr_url || result.qrUrl || result.qr_image_url;
    if(qr) { const img=document.createElement('img'); img.src=qr; img.alt='QR pembayaran'; img.style.cssText='display:block;max-width:280px;width:100%;height:auto;margin:12px auto;background:#fff;padding:8px;border-radius:12px'; img.referrerPolicy='no-referrer'; wrap.append(img); }
    const qrText=String(result.qris_string || result.qr_string || '').trim();
    if(qrText && !qr) { const p=document.createElement('p'); p.textContent='Kode QRIS diterima. Jika QR tidak tampil, gunakan halaman pembayaran gateway.'; wrap.append(p); }
    const checkout=result.checkout_url || result.payment_url;
    if(checkout) { const a=document.createElement('a'); a.href=checkout; a.target='_blank'; a.rel='noopener noreferrer'; a.className='btn'; a.textContent='Buka halaman pembayaran'; a.style.display='block'; a.style.textAlign='center'; a.style.marginTop='10px'; wrap.append(a); }
    const check=document.createElement('button'); check.type='button'; check.className='btn'; check.textContent='Cek Pembayaran'; check.style.marginTop='10px'; check.addEventListener('click',()=>checkStatus()); wrap.append(check);
    app.querySelectorAll('.sl-gateways').forEach(n=>n.remove()); app.insertBefore(wrap,$('#status')); status('Menunggu konfirmasi pembayaran dari gateway…');
  }
  async function checkStatus() {
    if(!orderId || !activeGateway) return false;
    try {
      const result=await edge(activeGateway==='CASHI'?'cashi-check-status':'bayar-gg-check-status',{order_id:orderId,...(isUser?{}:{guest_access_token:guestToken})});
      if(result.paid===true || String(result.status||'').toUpperCase()==='SETTLED') {
        status('Pembayaran terverifikasi. Membuka tautan…');
        if(pollTimer) clearTimeout(pollTimer);
        location.href='/d/'+encodeURIComponent(slug()); return true;
      }
      status('Status pembayaran: '+(result.status||'PENDING')+'. Menunggu konfirmasi…');
    } catch(e) { status(e.message || 'Pengecekan pembayaran gagal.',true); }
    return false;
  }
  async function pollStatus() {
    if(await checkStatus()) return;
    pollTimer=setTimeout(pollStatus,5000);
  }
  document.addEventListener('DOMContentLoaded', async()=>{
    try {
      const s=slug(); if(!s) throw new Error('Kode Shortlink tidak ditemukan. Buka tautan lengkap.');
      const c=cfg(); if(!window.supabase || !c.url || !c.anonKey) throw new Error('Konfigurasi Supabase belum tersedia.');
      sb=window.supabase.createClient(c.url,c.anonKey);
      link=await SLF.get();
      $('#title').textContent=link.title||'Akses langsung'; $('#price').textContent=money(link.access_price);
      if(Number(link.access_price||0)<2000) throw new Error('Harga akses berbayar minimal Rp2.000. Ubah harga Shortlink atau gunakan akses gratis.');
      $('#pay').addEventListener('click',async()=>{
        $('#pay').disabled=true; status('Memuat metode pembayaran…');
        try { const {data,error}=await sb.rpc('get_public_gateway_settings'); if(error) throw error; showGatewayOptions(data); }
        catch(e) { status(e.message||'Pengaturan gateway gagal dimuat.',true); $('#pay').disabled=false; }
      });
    } catch(e) { status(e.message||'Gagal memuat Shortlink.',true); if($('#pay')) $('#pay').disabled=true; }
  });
})();
