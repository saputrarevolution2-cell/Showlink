(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0));
  const date = v => v ? new Intl.DateTimeFormat(localStorage.getItem('showlink-language')==='en'?'en-US':'id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v)) : '—';
  const state = { sb:null, uid:null, links:[], page:1, perPage:5 };
  const TX = {
    id:{withdrawStatusLabel:'Status Withdraw',totalWithdrawLabel:'Total Withdraw',purchasesLabel:'Pembelian',allLinksTitle:'Semua Payment Link',allLinksSub:'Semua link yang kamu buat, 5 per halaman.',createLink:'Buat Link',loading:'Memuat...',emptyLinks:'Belum ada Payment Link.',views:'views',sales:'terjual',active:'Aktif',paused:'Dijeda',draft:'Draft',expired:'Kedaluwarsa',deleted:'Dihapus',pending:'Pending',processing:'Diproses',paid:'Berhasil',rejected:'Ditolak',cancelled:'Dibatalkan',withdrawCount:'transaksi',purchaseCount:'pembelian',previous:'Sebelumnya',next:'Berikutnya'},
    en:{withdrawStatusLabel:'Withdrawal Status',totalWithdrawLabel:'Total Withdrawn',purchasesLabel:'Purchases',allLinksTitle:'All Payment Links',allLinksSub:'All links you created, 5 per page.',createLink:'Create Link',loading:'Loading...',emptyLinks:'No Payment Links yet.',views:'views',sales:'sold',active:'Active',paused:'Paused',draft:'Draft',expired:'Expired',deleted:'Deleted',pending:'Pending',processing:'Processing',paid:'Success',rejected:'Rejected',cancelled:'Cancelled',withdrawCount:'transactions',purchaseCount:'purchases',previous:'Previous',next:'Next'}
  };
  const t=k => (TX[localStorage.getItem('showlink-language')==='en'?'en':'id'][k]||k);
  function applyLocalLanguage(){document.querySelectorAll('[data-profile-i18n]').forEach(e=>e.textContent=t(e.dataset.profileI18n)); renderLinks();}
  function statusLabel(v){return t(v==='paid'?'paid':v==='processing'?'processing':v==='rejected'?'rejected':v==='cancelled'?'cancelled':v==='pending'?'pending':v);}
  function statusClass(v){return ['active','paid'].includes(v)?'success':['pending','processing'].includes(v)?'pending':['rejected','cancelled','deleted'].includes(v)?'danger':'neutral';}
  async function loadProfile(){
    const {data:p,error}=await state.sb.from('profiles').select('username,display_name,auth_email,bio,country').eq('id',state.uid).maybeSingle();
    if(error) throw error;
    $('#username').value=p?.username||''; $('#display-name').value=p?.display_name||''; $('#email').value=p?.auth_email||state.sb.auth?.user?.email||''; $('#bio').value=p?.bio||''; $('#country').value=p?.country||'';
  }
  async function loadLinks(){
    const {data,error}=await state.sb.from('payment_links').select('id,title,slug,price,status,views,sales_count,created_at').eq('owner_id',state.uid).neq('status','deleted').order('created_at',{ascending:false});
    if(error) throw error; state.links=data||[]; renderLinks();
  }
  function renderLinks(){
    const box=$('#profile-links-list'); if(!box)return;
    if(!state.links.length){box.innerHTML=`<div class="profile-empty"><i class="fa-solid fa-link-slash"></i><strong>${esc(t('emptyLinks'))}</strong></div>`; $('#profile-links-pagination').hidden=true; return;}
    const totalPages=Math.ceil(state.links.length/state.perPage); if(state.page>totalPages)state.page=totalPages;
    const start=(state.page-1)*state.perPage; const rows=state.links.slice(start,start+state.perPage);
    box.innerHTML=rows.map(x=>`<article class="profile-link-row"><div class="profile-link-main"><span class="profile-link-icon"><i class="fa-solid fa-link"></i></span><div><strong>${esc(x.title||'Untitled')}</strong><small>/payment/${esc(x.slug||'')}</small></div></div><div class="profile-link-meta"><span><i class="fa-regular fa-eye"></i> ${Number(x.views||0).toLocaleString()} ${t('views')}</span><span><i class="fa-solid fa-cart-shopping"></i> ${Number(x.sales_count||0).toLocaleString()} ${t('sales')}</span><span class="profile-status ${statusClass(x.status)}">${esc(t(x.status))}</span><b>${money(x.price)}</b></div><a class="profile-link-open" href="/payment-link-public.html?slug=${encodeURIComponent(x.slug||'')}"><i class="fa-solid fa-arrow-up-right-from-square"></i></a></article>`).join('');
    const pg=$('#profile-links-pagination'); pg.hidden=totalPages<=1; if(totalPages<=1)return;
    let h=`<button type="button" class="profile-page-btn" data-page="${state.page-1}" ${state.page===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i><span>${esc(t('previous'))}</span></button><div class="profile-page-numbers">`;
    for(let i=1;i<=totalPages;i++) h+=`<button type="button" class="profile-page-num ${i===state.page?'is-active':''}" data-page="${i}">${i}</button>`;
    h+=`</div><button type="button" class="profile-page-btn" data-page="${state.page+1}" ${state.page===totalPages?'disabled':''}><span>${esc(t('next'))}</span><i class="fa-solid fa-chevron-right"></i></button>`; pg.innerHTML=h;
  }
  async function loadStats(){
    const [{data:w,error:we},{data:o,error:oe}]=await Promise.all([
      state.sb.from('withdrawals').select('amount,status,created_at').eq('user_id',state.uid).order('created_at',{ascending:false}),
      state.sb.from('orders').select('amount,status,created_at').eq('buyer_id',state.uid).in('status',['paid','completed']).order('created_at',{ascending:false})
    ]); if(we)throw we;if(oe)throw oe;
    const ws=w||[], os=o||[]; const latest=ws[0]; const successful=ws.filter(x=>x.status==='paid');
    $('#profile-withdraw-status').textContent=latest?statusLabel(latest.status):'—'; $('#profile-withdraw-status').className=`profile-status ${latest?statusClass(latest.status):'neutral'}`;
    $('#profile-withdraw-status-sub').textContent=latest?date(latest.created_at):'—'; $('#profile-total-withdraw').textContent=money(successful.reduce((a,x)=>a+Number(x.amount||0),0)); $('#profile-withdraw-count').textContent=`${successful.length} ${t('withdrawCount')}`;
    $('#profile-purchase-count').textContent=os.length.toLocaleString(); $('#profile-purchase-total').textContent=money(os.reduce((a,x)=>a+Number(x.amount||0),0));
  }
  async function init(){
    state.sb=await window.ShowLinkSupabase.load(); const {data:{session}}=await state.sb.auth.getSession(); if(!session)return location.replace('/login.html?redirect='+encodeURIComponent(location.pathname)); state.uid=session.user.id;
    await Promise.all([loadProfile(),loadLinks(),loadStats()]);
    $('#profile-form').addEventListener('submit',async e=>{e.preventDefault();const box=$('#profile-message');box.textContent=localStorage.getItem('showlink-language')==='en'?'Saving...':'Menyimpan...';box.classList.add('show');const {error}=await state.sb.from('profiles').update({username:$('#username').value.trim(),display_name:$('#display-name').value.trim(),bio:$('#bio').value.trim(),country:$('#country').value.trim(),updated_at:new Date().toISOString()}).eq('id',state.uid);box.textContent=error?error.message:(localStorage.getItem('showlink-language')==='en'?'Profile saved successfully.':'Profil berhasil disimpan.');});
    $('#profile-links-pagination').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.disabled)return;state.page=Math.max(1,Math.min(Math.ceil(state.links.length/state.perPage),Number(b.dataset.page)));renderLinks();document.querySelector('.profile-links-card')?.scrollIntoView({behavior:'smooth',block:'start'});});
    applyLocalLanguage(); window.addEventListener('showlink:language-change',applyLocalLanguage);
  }
  async function revealAdminEntry(){try{const sb=await window.ShowLinkSupabase.load();const {data:{session}}=await sb.auth.getSession();if(!session)return;const {data}=await sb.rpc('is_current_user_admin');if(data===true){const el=document.getElementById('admin-entry');if(el)el.style.display='block';}}catch{}}
  document.addEventListener('DOMContentLoaded',()=>init().catch(e=>{const m=$('#profile-message');if(m){m.textContent=e.message;m.classList.add('show')}})); revealAdminEntry();
})();