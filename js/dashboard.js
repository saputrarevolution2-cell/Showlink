(() => {
"use strict";
const I18N={id:{dashboard:"Dashboard",welcome:"Selamat datang",dashboardIntro:"Pantau Payment Link, penjualan, dan penghasilanmu dari satu tempat.",availableBalance:"Saldo tersedia",paymentIncome:"Pendapatan Payment Link",paymentIncomeSub:"Pendapatan bersih dari penjualan",pendingSettlement:"Saldo pending",todayIncome:"Pendapatan hari ini",monthIncome:"Pendapatan bulan ini",totalPaymentLinks:"Total Payment Link",paymentSales:"Penjualan berhasil",paymentViews:"Total views",paymentStats:"Statistik Payment Link",salesTrend:"Penjualan & pendapatan",createPaymentLink:"Buat Payment Link",managePaymentLinks:"Kelola Payment Link",viewDetails:"Lihat detail",incomeRuleTitle:"Pendapatan bersih",incomeRuleText:"Saldo creator dihitung dari bagian bersih setelah pembagian platform.",noData:"Belum ada data Payment Link."},en:{dashboard:"Dashboard",welcome:"Welcome",dashboardIntro:"Monitor your Payment Links, sales, and earnings in one place.",availableBalance:"Available balance",paymentIncome:"Payment Link earnings",paymentIncomeSub:"Net earnings from sales",pendingSettlement:"Pending balance",todayIncome:"Today's earnings",monthIncome:"This month's earnings",totalPaymentLinks:"Total Payment Links",paymentSales:"Successful sales",paymentViews:"Total views",paymentStats:"Payment Link statistics",salesTrend:"Sales & earnings",createPaymentLink:"Create Payment Link",managePaymentLinks:"Manage Payment Links",viewDetails:"View details",incomeRuleTitle:"Net earnings",incomeRuleText:"Creator balance reflects the net amount after the platform split.",noData:"No Payment Link data yet."}};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const lang=()=>localStorage.getItem("showlink-language")==="en"?"en":"id", t=k=>I18N[lang()][k]||k;
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0), num=n=>new Intl.NumberFormat("id-ID").format(Number(n)||0);
function translate(){document.documentElement.lang=lang();$$('[data-i18n]').forEach(e=>{const k=e.dataset.i18n;if(I18N[lang()][k]!==undefined)e.textContent=t(k)});}
function metric(k,v){$$(`[data-metric="${k}"]`).forEach(e=>e.textContent=/balance|income|pending|today|month|earnings/.test(k)?money(v):num(v));}
function day0(d){const x=new Date(d);x.setHours(0,0,0,0);return x;}
function sum(a,k){return a.reduce((n,x)=>n+Number(x?.[k]||0),0)}
async function load(){
 const sb=await window.ShowLinkSupabase.load(); const {data:{session}}=await sb.auth.getSession();
 if(!session)return location.replace('/login.html?redirect='+encodeURIComponent(location.pathname));
 const u=session.user;
 try{const {data:p}=await sb.from('profiles').select('username,display_name,auth_email,plan,avatar_url').eq('id',u.id).maybeSingle(); const q=p||{}; const name=q.username||q.display_name||u.user_metadata?.username||u.email?.split('@')[0]||'User'; $$('[data-user-name]').forEach(e=>e.textContent=name);$$('[data-user-email]').forEach(e=>e.textContent=q.auth_email||u.email||'—');$$('[data-account-status]').forEach(e=>e.textContent=(q.plan||'free').toUpperCase()); const a=$('[data-avatar]');if(a&&q.avatar_url)a.innerHTML=`<img src="${String(q.avatar_url).replace(/"/g,'&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;}catch(e){}
 const today=day0(new Date()), month=new Date(today.getFullYear(),today.getMonth(),1);
 const [w,links,orders,tx]=await Promise.all([
   sb.from('wallets').select('available_balance,pending_balance,lifetime_earned').eq('user_id',u.id).maybeSingle(),
   sb.from('payment_links').select('id,status,views,unique_views,sales_count,created_at').eq('owner_id',u.id),
   sb.from('orders').select('id,payment_link_id,amount,status,created_at,paid_at,completed_at').eq('seller_id',u.id),
   sb.from('wallet_transactions').select('amount,order_id,type,direction,created_at').eq('user_id',u.id).eq('type','earning').eq('direction','credit')
 ]);
 const l=links.data||[], o=orders.data||[], e=tx.data||[];
 const paid=o.filter(x=>['paid','processing','completed'].includes(String(x.status||'').toLowerCase()));
 const earnings=sum(e,'amount');
 metric('available_balance',w.data?.available_balance||0); metric('pendingSettlement',w.data?.pending_balance||0); metric('paymentIncome',earnings); metric('todayIncome',e.filter(x=>new Date(x.created_at)>=today).reduce((n,x)=>n+Number(x.amount||0),0)); metric('monthIncome',e.filter(x=>new Date(x.created_at)>=month).reduce((n,x)=>n+Number(x.amount||0),0)); metric('totalPaymentLinks',l.length); metric('paymentSales',paid.length); metric('paymentViews',sum(l,'views'));
 const active=l.filter(x=>x.status==='active').length; $('[data-active-links]')?.replaceChildren(document.createTextNode(`${active} active`));
 const recent=paid.sort((a,b)=>new Date(b.paid_at||b.created_at)-new Date(a.paid_at||a.created_at)).slice(0,8); const tbody=$('#payment-recent-body'); if(tbody) tbody.innerHTML=recent.length?recent.map(x=>`<tr><td>${new Date(x.paid_at||x.created_at).toLocaleString(lang()==='id'?'id-ID':'en-US')}</td><td>${money(x.amount)}</td><td><span class="status-chip ${x.status}">${x.status}</span></td></tr>`).join(''):`<tr><td colspan="3">${t('noData')}</td></tr>`;
}
document.addEventListener('DOMContentLoaded',()=>{translate();load().catch(e=>console.warn(e));window.addEventListener('showlink:language-change',translate);});
})();
