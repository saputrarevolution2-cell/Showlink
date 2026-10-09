(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  let client = null, user = null;
  const copy = {
    id: {
      title:"Pengaturan", intro:"Kelola keamanan, preferensi, notifikasi, dan sesi akunmu.",
      emailTitle:"Ganti email", emailDesc:"Email baru mungkin perlu dikonfirmasi jika konfirmasi email diaktifkan.", currentEmail:"Email saat ini", newEmail:"Email baru", updateEmail:"Perbarui email",
      passwordTitle:"Ganti kata sandi", passwordDesc:"Gunakan kata sandi kuat yang belum pernah dipakai di tempat lain.", newPassword:"Kata sandi baru", confirmPassword:"Ulangi kata sandi baru", updatePassword:"Perbarui kata sandi",
      appearanceTitle:"Tema tampilan", appearanceDesc:"Pilih tema yang nyaman untukmu.", light:"Terang", dark:"Gelap", languageTitle:"Bahasa", languageDesc:"Pilih bahasa antarmuka.",
      notificationsTitle:"Preferensi notifikasi", notificationsDesc:"Atur notifikasi yang ingin kamu terima di perangkat ini.", transactionNotifs:"Aktivitas transaksi", transactionDesc:"Pembayaran, pembelian, dan penarikan dana.", securityNotifs:"Keamanan akun", securityDesc:"Perubahan email dan kata sandi.", productNotifs:"Info dan pembaruan", productDesc:"Informasi layanan ShowLink.", savePrefs:"Simpan preferensi", notifNote:"Preferensi ini disimpan di browser/perangkat ini. Pengiriman email atau push harus dihubungkan ke backend.",
      sessionsTitle:"Sesi masuk", sessionsDesc:"Periksa sesi login akun yang tersedia di perangkat ini.", currentSession:"Sesi perangkat ini", active:"Aktif", refresh:"Perbarui", signOut:"Keluar dari perangkat ini", ipNote:"Supabase Auth di browser tidak menyediakan daftar lengkap sesi dan alamat IP. Informasi perangkat lain serta pencabutan sesi memerlukan pencatatan dan endpoint backend yang aman.",
      emailUpdated:"Permintaan perubahan email dikirim. Periksa kotak masuk email baru untuk konfirmasi.", passwordUpdated:"Kata sandi berhasil diperbarui.", prefsSaved:"Preferensi notifikasi disimpan di perangkat ini.", loading:"Memuat sesi...", noSession:"Tidak ada sesi login aktif.", sameEmail:"Masukkan email yang berbeda dari email saat ini.", passwordMismatch:"Konfirmasi kata sandi tidak cocok.", error:"Terjadi kesalahan: ", sessionRefreshed:"Informasi sesi diperbarui.", signOutConfirm:"Keluar dari perangkat ini?", lastSignIn:"Login terakhir", sessionError:"Tidak dapat memuat informasi sesi."
    },
    en: {
      title:"Settings", intro:"Manage your security, preferences, notifications, and account session.",
      emailTitle:"Change email", emailDesc:"The new email may need confirmation if email confirmation is enabled.", currentEmail:"Current email", newEmail:"New email", updateEmail:"Update email",
      passwordTitle:"Change password", passwordDesc:"Use a strong password you do not use elsewhere.", newPassword:"New password", confirmPassword:"Confirm new password", updatePassword:"Update password",
      appearanceTitle:"Appearance", appearanceDesc:"Choose the theme you prefer.", light:"Light", dark:"Dark", languageTitle:"Language", languageDesc:"Choose the interface language.",
      notificationsTitle:"Notification preferences", notificationsDesc:"Choose which notifications you want to receive on this device.", transactionNotifs:"Transaction activity", transactionDesc:"Payments, purchases, and withdrawals.", securityNotifs:"Account security", securityDesc:"Email and password changes.", productNotifs:"News and updates", productDesc:"ShowLink service updates.", savePrefs:"Save preferences", notifNote:"These preferences are stored in this browser/device. Email or push delivery must be connected to a backend.",
      sessionsTitle:"Sign-in session", sessionsDesc:"Review the account login session available on this device.", currentSession:"This device session", active:"Active", refresh:"Refresh", signOut:"Sign out this device", ipNote:"Supabase Auth in the browser does not expose a complete session list or IP addresses. Other-device information and session revocation require secure backend logging and endpoints.",
      emailUpdated:"Email change requested. Check the new email inbox to confirm.", passwordUpdated:"Password updated successfully.", prefsSaved:"Notification preferences saved on this device.", loading:"Loading session...", noSession:"No active login session.", sameEmail:"Enter an email different from your current email.", passwordMismatch:"The password confirmation does not match.", error:"Something went wrong: ", sessionRefreshed:"Session information refreshed.", signOutConfirm:"Sign out from this device?", lastSignIn:"Last sign-in", sessionError:"Could not load session information."
    }
  };
  const lang = () => localStorage.getItem('showlink-language') === 'en' ? 'en' : 'id';
  const t = key => copy[lang()][key] || key;
  function alertMsg(message, bad=false) { const el=$('#settings-alert'); if(!el)return; el.textContent=message; el.classList.toggle('is-error',bad); el.hidden=false; }
  function translate() {
    document.documentElement.lang=lang();
    document.querySelectorAll('[data-t]').forEach(el=>{ const key=el.dataset.t; if(copy[lang()][key]) el.textContent=copy[lang()][key]; });
    const title=document.querySelector('title'); if(title) title.textContent=lang()==='en'?'Settings — ShowLink':'Pengaturan — ShowLink';
    document.querySelectorAll('[data-setting-lang]').forEach(b=>b.classList.toggle('is-selected',b.dataset.settingLang===lang()));
    document.querySelectorAll('[data-setting-theme]').forEach(b=>b.classList.toggle('is-selected',b.dataset.settingTheme===(localStorage.getItem('showlink-theme')||'light')));
  }
  async function refreshSession(){
    if(!client) client=await window.ShowLinkSupabase.load();
    const {data,error}=await client.auth.getSession(); if(error)throw error;
    const session=data.session;
    if(!session){$('#current-email').value='';$('#session-email').textContent=t('noSession');$('#session-meta')&&($('#session-meta').textContent='');return;}
    user=session.user; $('#current-email').value=user.email||''; $('#session-email').textContent=user.email||'';
    const created=user.last_sign_in_at?new Date(user.last_sign_in_at).toLocaleString(lang()==='en'?'en-US':'id-ID'):'';
    const meta=$('#session-meta'); if(meta)meta.textContent=created?`${t('lastSignIn')}: ${created}`:t('active');
  }
  document.addEventListener('DOMContentLoaded', async()=>{
    translate();
    const prefs=(()=>{try{return JSON.parse(localStorage.getItem('showlink-notification-preferences')||'{}')}catch{return {}}})();
    $('#notif-transactions').checked=prefs.transactions!==false; $('#notif-security').checked=prefs.security!==false; $('#notif-product').checked=prefs.product===true;
    document.querySelectorAll('[data-setting-theme]').forEach(b=>b.addEventListener('click',()=>{const value=b.dataset.settingTheme;window.ShowLinkTheme?.applyTheme?.(value);localStorage.setItem('showlink-theme',value);translate();}));
    document.querySelectorAll('[data-setting-lang]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem('showlink-language',b.dataset.settingLang);translate();window.dispatchEvent(new CustomEvent('showlink:language-change',{detail:{language:lang(),lang:lang()}}));}));
    window.addEventListener('showlink:language-change',translate);
    $('#email-form').addEventListener('submit',async e=>{e.preventDefault();try{if(!client)client=await window.ShowLinkSupabase.load();const email=$('#new-email').value.trim();if(email.toLowerCase()===(user?.email||'').toLowerCase())throw Error(t('sameEmail'));const {error}=await client.auth.updateUser({email});if(error)throw error;alertMsg(t('emailUpdated'));$('#new-email').value='';}catch(err){alertMsg(t('error')+(err.message||t('sessionError')),true);}});
    $('#password-form').addEventListener('submit',async e=>{e.preventDefault();try{if($('#new-password').value!==$('#confirm-password').value)throw Error(t('passwordMismatch'));if(!client)client=await window.ShowLinkSupabase.load();const {error}=await client.auth.updateUser({password:$('#new-password').value});if(error)throw error;$('#password-form').reset();alertMsg(t('passwordUpdated'));}catch(err){alertMsg(t('error')+(err.message||t('sessionError')),true);}});
    $('#notification-form').addEventListener('submit',e=>{e.preventDefault();localStorage.setItem('showlink-notification-preferences',JSON.stringify({transactions:$('#notif-transactions').checked,security:$('#notif-security').checked,product:$('#notif-product').checked}));alertMsg(t('prefsSaved'));});
    $('#refresh-session').addEventListener('click',async()=>{try{await refreshSession();alertMsg(t('sessionRefreshed'));}catch(err){alertMsg(t('error')+(err.message||t('sessionError')),true);}});
    $('#signout-current').addEventListener('click',async()=>{if(!confirm(t('signOutConfirm')))return;try{if(!client)client=await window.ShowLinkSupabase.load();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;localStorage.removeItem('showlink_user');location.href='/login.html';}catch(err){alertMsg(t('error')+(err.message||t('sessionError')),true);}});
    try{client=await window.ShowLinkSupabase.load();const {data,error}=await client.auth.getUser();if(error)throw error;user=data.user;if(!user){$('#session-email').textContent=t('noSession');return;}await refreshSession();}catch(err){const el=$('#session-email');if(el)el.textContent=t('sessionError');console.warn('Settings:',err.message);}
  });
})();
