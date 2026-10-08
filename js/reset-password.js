(() => { 'use strict'; document.documentElement.dataset.pageReady = 'true'; })();


document.addEventListener("DOMContentLoaded", async () => {
  const q = (s,r=document)=>r.querySelector(s);
  const form=q("[data-reset-request-form]");
  const alertBox=q("[data-auth-alert]");
  const show=(msg,ok=false)=>{alertBox.textContent=msg;alertBox.classList.toggle("auth-success",ok);alertBox.classList.add("is-visible")};
  document.querySelectorAll("[data-password-toggle]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const i=document.getElementById(btn.dataset.target); if(!i)return;
      const showIt=i.type==="password"; i.type=showIt?"text":"password";
      btn.innerHTML=showIt?'<i class="fa-regular fa-eye-slash"></i>':'<i class="fa-regular fa-eye"></i>';
    });
  });

  let sb=null;
  try{ sb=await window.ShowLinkSupabase.load(); }catch(e){ show(e.message||"Supabase belum dikonfigurasi."); return; }

  // If Supabase has already established a recovery session, this page is now the
  // secure final step. The email field remains visible as requested.
  const {data:{session}}=await sb.auth.getSession();
  const hash=location.hash||"";
  const recoveryFromHash=/access_token=|type=recovery/.test(hash);

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    alertBox.classList.remove("is-visible");
    const email=q("#reset-email").value.trim();
    const password=q("#new-password").value||"";
    const confirm=q("#confirm-new-password").value||"";

    if(!email){show("Gmail wajib diisi.");return}
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){show("Format Gmail tidak valid.");return}
    if(password.length<8){show("Password minimal 8 karakter.");return}
    if(password!==confirm){show("Konfirmasi password tidak sama.");return}

    const btn=q(".auth-submit"); btn.disabled=true;
    try{
      // Without a recovery session, email ownership must be verified first.
      // We deliberately do not expose or use a service-role key in the browser.
      const {data:{session:current}}=await sb.auth.getSession();
      if(!current && !recoveryFromHash){
        const {error}=await sb.auth.resetPasswordForEmail(email,{
          redirectTo:`${location.origin}/reset-password.html`
        });
        if(error) throw error;
        show("Link reset password sudah dikirim ke Gmail. Buka link tersebut, lalu kembali ke halaman ini untuk menerapkan password baru.",true);
        return;
      }

      const {data:{user}}=await sb.auth.getUser();
      if(user?.email && user.email.toLowerCase()!==email.toLowerCase()){
        show("Gmail tidak sesuai dengan akun yang sedang dipulihkan."); return;
      }
      const {error}=await sb.auth.updateUser({password});
      if(error) throw error;
      show("Password berhasil diubah. Mengalihkan ke Dashboard...",true);
      setTimeout(()=>location.replace("/dashboard.html"),900);
    }catch(err){
      show(err.message||"Gagal memproses reset password.");
    }finally{btn.disabled=false}
  });

  // Prefill the email from the locally remembered account when available.
  const remembered=localStorage.getItem("showlink_last_email");
  if(remembered && !q("#reset-email").value) q("#reset-email").value=remembered;
});
