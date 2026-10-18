(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const contacts = [
    ['email', 'Gmail Admin', 'fa-envelope', (value) => `mailto:${value}`, 'fa-solid'],
    ['telegram', 'Telegram', 'fa-telegram', (value) => value, 'fa-brands'],
    ['whatsapp', 'WhatsApp', 'fa-whatsapp', (value) => value, 'fa-brands'],
    ['youtube', 'YouTube', 'fa-youtube', (value) => value, 'fa-brands'],
    ['facebook', 'Facebook', 'fa-facebook', (value) => value, 'fa-brands']
  ];
  function valid(key, value) {
    if (key === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
  }
  async function loadContacts() {
    const host = $('#endorse-contact-list');
    const empty = $('#endorse-contact-empty');
    try {
      const sb = await window.ShowLinkSupabase?.load?.();
      if (!sb) throw new Error('Supabase unavailable');
      const { data, error } = await sb.from('showlink_support_contacts').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      host.replaceChildren();
      let count = 0;
      for (const [key, label, icon, makeHref, prefix] of contacts) {
        const value = String(data?.[key] || '').trim();
        if (!value || data?.[`${key}_visible`] === false || !valid(key, value)) continue;
        const a = document.createElement('a');
        a.className = 'endorse-contact-item';
        a.href = makeHref(value);
        if (key !== 'email') { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.innerHTML = `<span class="endorse-contact-item-icon"><i class="${prefix} ${icon}" aria-hidden="true"></i></span><span><strong>${label}</strong><small>${esc(value)}</small></span><i class="fa-solid fa-arrow-up-right-from-square endorse-contact-arrow" aria-hidden="true"></i>`;
        host.appendChild(a);
        count++;
      }
      empty.hidden = count > 0;
      if (!count) host.innerHTML = '';
    } catch (error) {
      console.warn('Endorse contact load failed', error);
      host.innerHTML = '';
      empty.hidden = false;
      empty.textContent = 'Kontak endorse belum dapat dimuat. Silakan buka halaman Support atau coba lagi nanti.';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadContacts, { once: true });
  else loadContacts();
})();
