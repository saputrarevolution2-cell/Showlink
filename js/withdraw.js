(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LIMIT = 500000;
  const lang = () => localStorage.getItem('showlink-language') === 'en' ? 'en' : 'id';
  let sb, session, account=null, currentMode='manual', pendingConfirm=null;

  const T = {
    id:{
      title:'Withdraw',subtitle:'Tarik saldo yang sudah melewati settlement H+2 dengan aman.',availableLabel:'Saldo tersedia',pendingLabel:'Menunggu H+2',earnedLabel:'Total earned',withdrawnLabel:'Total withdrawn',dailyEyebrow:'BATAS HARIAN',dailyTitle:'Limit withdraw hari ini',used:n=>`${money(n)} digunakan`,remaining:n=>`Sisa ${money(n)}`,
      payoutEyebrow:'PAYOUT',requestTitle:'Ajukan Withdraw',requestDesc:'Pilih jalur penarikan, lalu cukup masukkan nominal.',closedTitle:'Withdraw manual sedang tutup',open:'Buka Senin–Jumat pukul 08.00–21.00 WIB.',weekend:'Hari Weekend — withdraw manual tutup total.',manualTitle:'Manual',manualSub:'Diproses admin sesuai antrean',instantTitle:'Instant',instantSub:'Pengajuan diproses admin',amountLabel:'Nominal',submit:'Ajukan Withdraw Manual',instantSubmit:'Ajukan Withdraw Instant',
      instantOptions:'Pilih nominal instant',instantFee:'Fee Instant',manualFee:'Estimasi Fee Manual',totalDebit:'Total saldo yang dibutuhkan',recipient:'Nominal diterima',previewTitle:'Konfirmasi Withdraw',previewText:'Periksa detail sebelum mengajukan.',requestNow:'Ajukan sekarang',back:'Kembali',accountEyebrow:'REKENING PEMBAYARAN',accountTitle:'Rekening Pembayaran',edit:'Ubah',nameLabel:'Nama',bankLabel:'Bank / Metode',numberLabel:'No. Rekening',accountNote:'Pembayaran dikirim ke rekening ini. Pastikan datanya benar.',cancel:'Batal',save:'Simpan',
      manualNotice:'Withdraw manual mengikuti antrean. Harap bersabar dan jangan hubungi admin sebelum 24 jam jika withdraw belum diproses.',instantNotice:'Withdraw instant diajukan ke admin untuk diproses. Pastikan saldo mencukupi nominal + fee.',historyEyebrow:'ACTIVITY',historyTitle:'Riwayat Withdraw',historyDesc:'Pantau semua permintaan penarikan kamu.',dateHead:'Tanggal',amountHead:'Nominal',feeHead:'Fee',modeHead:'Mode',statusHead:'Status',loading:'Memuat...',empty:'Belum ada withdrawal.',accountSaved:'Rekening pembayaran berhasil disimpan.',limitReached:'Limit withdraw harian sudah tercapai.',manualClosed:'Withdraw manual sedang tutup.',instantInvalid:'Pilih nominal instant.',savedRequest:'Withdrawal berhasil diajukan dan menunggu persetujuan admin.',failed:'Withdrawal gagal.',min:'Minimum withdrawal manual adalah Rp10.000.',noAccount:'Lengkapi rekening pembayaran terlebih dahulu.',limitExceeded:r=>`Nominal melebihi sisa limit harian ${money(r)}.`,insufficient:r=>`Saldo tidak cukup. Total yang dibutuhkan ${money(r)}.`,
      status:{pending:'Menunggu',processing:'Diproses',paid:'Berhasil',rejected:'Ditolak',cancelled:'Dibatalkan'},mode:{manual:'Manual',instant:'Instant'}
    },
    en:{
      title:'Withdraw',subtitle:'Withdraw settled funds securely after the H+2 settlement period.',availableLabel:'Available balance',pendingLabel:'Pending H+2',earnedLabel:'Total earned',withdrawnLabel:'Total withdrawn',dailyEyebrow:'DAILY LIMIT',dailyTitle:"Today's withdrawal limit",used:n=>`${money(n)} used`,remaining:n=>`${money(n)} remaining`,
      payoutEyebrow:'PAYOUT',requestTitle:'Request Withdrawal',requestDesc:'Choose a withdrawal route, then enter only the amount.',closedTitle:'Manual withdrawal is closed',open:'Open Monday–Friday from 08:00–21:00 WIB.',weekend:'Weekend — manual withdrawals are fully closed.',manualTitle:'Manual',manualSub:'Processed by admin in queue',instantTitle:'Instant',instantSub:'Submitted to admin for processing',amountLabel:'Amount',submit:'Request Manual Withdrawal',instantSubmit:'Request Instant Withdrawal',
      instantOptions:'Choose instant amount',instantFee:'Instant Fee',manualFee:'Estimated Manual Fee',totalDebit:'Total balance required',recipient:'Recipient receives',previewTitle:'Confirm Withdrawal',previewText:'Review the details before submitting.',requestNow:'Submit now',back:'Back',accountEyebrow:'PAYMENT ACCOUNT',accountTitle:'Payment Account',edit:'Edit',nameLabel:'Name',bankLabel:'Bank / Method',numberLabel:'Account Number',accountNote:'Payments are sent to this account. Make sure the details are correct.',cancel:'Cancel',save:'Save',
      manualNotice:'Manual withdrawals follow a queue. Please wait and do not contact admin before 24 hours if your withdrawal has not been processed.',instantNotice:'Instant withdrawals are submitted to admin for processing. Make sure your balance covers the amount + fee.',historyEyebrow:'ACTIVITY',historyTitle:'Withdrawal History',historyDesc:'Track all of your withdrawal requests.',dateHead:'Date',amountHead:'Amount',feeHead:'Fee',modeHead:'Mode',statusHead:'Status',loading:'Loading...',empty:'No withdrawals yet.',accountSaved:'Payment account saved.',limitReached:'Daily withdrawal limit reached.',manualClosed:'Manual withdrawal is closed.',instantInvalid:'Choose an instant amount.',savedRequest:'Withdrawal submitted successfully and is waiting for admin approval.',failed:'Withdrawal failed.',min:'Minimum manual withdrawal is Rp10,000.',noAccount:'Please complete your payment account first.',limitExceeded:r=>`Amount exceeds the remaining daily limit of ${money(r)}.`,insufficient:r=>`Insufficient balance. Total required: ${money(r)}.`,
      status:{pending:'Pending',processing:'Processing',paid:'Paid',rejected:'Rejected',cancelled:'Cancelled'},mode:{manual:'Manual',instant:'Instant'}
    }
  };
  const tr=()=>T[lang()];
  const instantFee=a => Math.ceil(Math.max(a,50000)/50000)*12000;
  const manualFee=a => Math.max(4000,Math.ceil(Math.max(a,50000)/50000)*4000);
  function applyText(){
    const t=tr();
    document.querySelectorAll('[data-wd]').forEach(el=>{const k=el.dataset.wd;if(typeof t[k]==='string')el.textContent=t[k]});
    $('#daily-used').textContent=t.used(window.__wdUsed||0); $('#daily-remaining').textContent=t.remaining(Math.max(0,LIMIT-(window.__wdUsed||0))); $('#daily-limit-text').textContent=money(LIMIT);
    $('#instant-notice').textContent=t.instantNotice; $('#manual-notice').textContent=t.manualNotice;
    renderAmountInfo(); renderConfirm();
  }
  function localDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(new Date());}
  function jakartaNow(){return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Jakarta'}));}
  function isManualOpen(){const d=jakartaNow(),day=d.getDay(),mins=d.getHours()*60+d.getMinutes();return day!==0&&day!==6&&mins>=480&&mins<1260;}
  function updateManualAvailability(){
    const t=tr(), closed=$('#manual-closed'), form=$('#withdraw-form'), manual=currentMode==='manual';
    if(!manual){closed.hidden=true;form.classList.remove('is-disabled');return;}
    const open=isManualOpen(); closed.hidden=open; form.classList.toggle('is-disabled',!open);
    if(!open){const d=jakartaNow();$('#closed-reason').textContent=(d.getDay()===0||d.getDay()===6)?t.weekend:t.open;}
    $('#submit-btn').disabled=!open || (window.__wdUsed||0)>=LIMIT;
  }
  function showMessage(msg,ok=false){const b=$('#withdraw-message');b.textContent=msg;b.className=`app-message show ${ok?'success':'error'}`;}
  async function loadAccount(){const {data,error}=await sb.from('withdrawal_methods').select('id,method_type,account_name,account_number,is_default,is_active').eq('user_id',session.user.id).eq('is_active',true).order('is_default',{ascending:false}).limit(1);if(error)throw error;account=data?.[0]||null;renderAccount();}
  function renderAccount(){
    $('#account-display-name').textContent=account?.account_name||'—';$('#account-display-type').textContent=account?.method_type||'—';$('#account-display-number').textContent=account?.account_number||'—';
    $('#account-name').value=account?.account_name||'';$('#method-type').value=account?.method_type||'';$('#account-number').value=account?.account_number||'';
  }
  async function loadDaily(){
    const start=`${localDate()}T00:00:00+07:00`,end=`${localDate()}T23:59:59+07:00`;const {data,error}=await sb.from('withdrawals').select('amount,status').eq('user_id',session.user.id).gte('created_at',start).lte('created_at',end);if(error)throw error;
    window.__wdUsed=(data||[]).filter(x=>['pending','processing','paid'].includes(x.status)).reduce((a,x)=>a+Number(x.amount||0),0);const pct=Math.min(100,window.__wdUsed/LIMIT*100);$('#daily-progress').style.width=`${pct}%`;$('#daily-progress').classList.toggle('danger',window.__wdUsed>=LIMIT);applyText();updateManualAvailability();
  }
  async function loadWallet(){const {data:w,error}=await sb.from('wallets').select('available_balance,pending_balance,lifetime_earned,lifetime_withdrawn').eq('user_id',session.user.id).maybeSingle();if(error)throw error;$('#available').textContent=money(w?.available_balance);$('#pending').textContent=money(w?.pending_balance);$('#earned').textContent=money(w?.lifetime_earned);$('#withdrawn').textContent=money(w?.lifetime_withdrawn);window.__available=Number(w?.available_balance||0);}
  async function loadHistory(){const {data:rows,error}=await sb.from('withdrawals').select('id,amount,fee,status,created_at,metadata').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;const t=tr();$('#withdrawals-body').innerHTML=rows?.length?rows.map(x=>{const mode=x.metadata?.mode||'manual';return `<tr><td>${new Date(x.created_at).toLocaleString(lang()==='en'?'en-US':'id-ID')}</td><td>${money(x.amount)}</td><td>${money(x.fee)}</td><td><span class="withdraw-mode-pill ${esc(mode)}">${esc(t.mode[mode]||mode)}</span></td><td><span class="status ${esc(x.status)}">${esc(t.status[x.status]||x.status)}</span>${x.status==='rejected'&&x.admin_note?`<small class="withdraw-reason">${esc(x.admin_note)}</small>`:''}</td></tr>`}).join(''):`<tr><td colspan="5" class="app-empty">${t.empty}</td></tr>`;}
  async function saveAccount(e){e.preventDefault();const t=tr(),payload={method_type:$('#method-type').value.trim(),account_name:$('#account-name').value.trim(),account_number:$('#account-number').value.trim(),is_default:true,is_active:true};if(!payload.method_type||!payload.account_name||!payload.account_number)return showMessage(t.noAccount);try{if(account){const {data,error}=await sb.from('withdrawal_methods').update(payload).eq('id',account.id).eq('user_id',session.user.id).select('id,method_type,account_name,account_number,is_default,is_active').single();if(error)throw error;account=data}else{const {data,error}=await sb.from('withdrawal_methods').insert({...payload,user_id:session.user.id}).select('id,method_type,account_name,account_number,is_default,is_active').single();if(error)throw error;account=data}renderAccount();$('#account-form').hidden=true;$('#account-display').hidden=false;$('#edit-account').hidden=false;showMessage(t.accountSaved,true)}catch(e){showMessage(e.message||t.failed)}}
  function renderAmountInfo(){
    const a=Number($('#amount').value||0);const fee=currentMode==='instant'?instantFee(a):manualFee(a);const total=a+fee;
    $('#fee-value').textContent=a>0?money(fee):money(0);$('#total-value').textContent=a>0?money(total):money(0);$('#recipient-value').textContent=a>0?money(a):money(0);
    const remaining=Math.max(0,LIMIT-(window.__wdUsed||0));$('#amount-limit-hint').textContent=`${tr().remaining(remaining)}`;
    if(currentMode==='instant'){$('#amount').readOnly=true;}else{$('#amount').readOnly=false;}
    updateInstantButtons();
  }
  function updateInstantButtons(){document.querySelectorAll('[data-instant-amount]').forEach(b=>b.classList.toggle('active',Number(b.dataset.instantAmount)===Number($('#amount').value||0)));}
  function renderConfirm(){
    if(!pendingConfirm)return;const t=tr(),a=pendingConfirm.amount,fee=pendingConfirm.fee,total=pendingConfirm.total;
    $('#confirm-title').textContent=t.previewTitle;$('#confirm-text').textContent=t.previewText;$('#confirm-amount').textContent=money(a);$('#confirm-account').textContent=`${account?.account_name||'—'} • ${account?.method_type||'—'} • ${account?.account_number||'—'}`;$('#confirm-fee').textContent=money(fee);$('#confirm-total').textContent=money(total);$('#confirm-recipient').textContent=money(a);$('#confirm-submit').textContent=t.requestNow;$('#confirm-back').textContent=t.back;
  }
  function openConfirm(){
    const t=tr(),amount=Number($('#amount').value||0);if(!account)return showMessage(t.noAccount);if(currentMode==='instant'&&!([50000,100000,150000,200000].includes(amount)))return showMessage(t.instantInvalid);if(currentMode==='manual'&&(!Number.isFinite(amount)||amount<10000))return showMessage(t.min);const fee=currentMode==='instant'?instantFee(amount):manualFee(amount),total=amount+fee,remaining=Math.max(0,LIMIT-(window.__wdUsed||0));if(amount>remaining)return showMessage(t.limitExceeded(remaining));if(total>(window.__available||0))return showMessage(t.insufficient(total));if(currentMode==='manual'&&!isManualOpen())return showMessage(jakartaNow().getDay()===0||jakartaNow().getDay()===6?t.weekend:t.manualClosed);pendingConfirm={amount,fee,total};renderConfirm();$('#withdraw-confirm').hidden=false;}
  async function confirmSubmit(){
    if(!pendingConfirm)return;const t=tr(),btn=$('#confirm-submit');btn.disabled=true;try{const {data,error}=await sb.rpc('request_withdrawal',{p_amount:pendingConfirm.amount,p_method_id:account.id,p_mode:currentMode});if(error)throw error;$('#withdraw-confirm').hidden=true;pendingConfirm=null;$('#amount').value='';showMessage(t.savedRequest,true);await Promise.all([loadWallet(),loadDaily(),loadHistory()]);window.ShowLinkNavbar?.refreshNotifications()}catch(err){const msg=String(err.message||'');let mapped=t.failed;if(msg.includes('DAILY_WITHDRAW_LIMIT'))mapped=t.limitReached;else if(msg.includes('MANUAL_WITHDRAWAL_CLOSED'))mapped=t.manualClosed;else if(msg.includes('INVALID_INSTANT_AMOUNT'))mapped=t.instantInvalid;else if(msg.includes('INSUFFICIENT_AVAILABLE_BALANCE_WITH_FEE'))mapped=t.insufficient(pendingConfirm?.total||0);showMessage(mapped)}finally{btn.disabled=false;}}
  function selectMode(mode){currentMode=mode;$('#withdraw-mode').value=mode;document.querySelectorAll('.withdraw-mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('#instant-options').hidden=mode!=='instant';$('#manual-notice').hidden=mode!=='manual';$('#instant-notice').hidden=mode!=='instant';$('#withdraw-form button span').textContent=mode==='instant'?tr().instantSubmit:tr().submit;$('#amount').placeholder=mode==='instant'?'Rp50.000':'Rp10.000';if(mode==='instant'){const active=document.querySelector('[data-instant-amount].active');$('#amount').value=active?.dataset.instantAmount||50000;}renderAmountInfo();updateManualAvailability();}
  function bind(){
    document.querySelectorAll('.withdraw-mode').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
    document.querySelectorAll('[data-instant-amount]').forEach(b=>b.addEventListener('click',()=>{$('#amount').value=b.dataset.instantAmount;renderAmountInfo()}));
    $('#amount').addEventListener('input',renderAmountInfo);$('#withdraw-form').addEventListener('submit',e=>{e.preventDefault();openConfirm()});$('#confirm-submit').addEventListener('click',confirmSubmit);$('#confirm-back').addEventListener('click',()=>{$('#withdraw-confirm').hidden=true;pendingConfirm=null});
    $('#account-form').addEventListener('submit',saveAccount);$('#edit-account').addEventListener('click',()=>{$('#account-form').hidden=false;$('#account-display').hidden=true;$('#edit-account').hidden=true;renderAccount()});$('#cancel-account').addEventListener('click',()=>{$('#account-form').hidden=true;$('#account-display').hidden=false;$('#edit-account').hidden=false;renderAccount()});
    window.addEventListener('showlink:language-change',()=>{applyText();updateManualAvailability();loadHistory();});setInterval(updateManualAvailability,30000);
  }
  async function init(){sb=await window.ShowLinkSupabase.load();const {data:{session:s}}=await sb.auth.getSession();session=s;if(!session)return location.replace('/login.html?redirect='+encodeURIComponent(location.pathname));await sb.rpc('release_due_settlements');bind();applyText();selectMode('manual');await Promise.all([loadWallet(),loadAccount(),loadDaily(),loadHistory()]);updateManualAvailability();}
  document.addEventListener('DOMContentLoaded',()=>init().catch(e=>{console.error(e);showMessage(e.message||tr().failed)}));
})();
