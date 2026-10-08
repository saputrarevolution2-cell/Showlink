(() => {
  "use strict";
  const I18N = {
    id: {
      welcomeBack:"selamat datang", dashboardIntro:"Pantau Payment Link, penjualan, views, dan pendapatanmu dari satu tempat.", createPaymentLink:"Buat Payment Link", managePaymentLinks:"Kelola Link", totalLinks:"Total Payment Link", totalViews:"Total Views", totalSales:"Total Terjual", netIncome:"Pendapatan Bersih", availableBalance:"Saldo Tersedia", pendingBalance:"Saldo Pending", afterPlatform:"Sudah setelah potongan platform", readyToWithdraw:"Siap dicairkan", pendingSettlement:"Menunggu settlement", statistics:"STATISTIK", sevenDayStats:"Aktivitas 7 hari terakhir", sevenDayStatsSub:"Ringkasan penjualan dan pendapatan bersih berdasarkan transaksi berhasil.", sales7d:"Terjual", income7d:"Pendapatan", yourLinks:"Payment Link kamu", yourLinksSub:"Kelola performa link dan lihat pendapatan bersih dari setiap link.", manageAll:"Kelola semua", link:"Link", price:"Harga", created:"Dibuat", views:"Views", sold:"Terjual", income:"Pendapatan", status:"Status", loading:"Memuat data...", noLinks:"Belum ada Payment Link.", createFirst:"Buat sekarang", active:"Aktif", draft:"Draft", paused:"Dijeda", expired:"Kedaluwarsa", deleted:"Dihapus", open:"Buka", copy:"Salin", copied:"Tersalin", page:"Halaman", createNewLink:"Buat Payment Link baru", createNewLinkSub:"Tambahkan produk dan mulai menerima pembayaran.", withdraw:"Withdraw", withdrawSub:"Cairkan saldo yang tersedia.", manageLinksAction:"Kelola Payment Link", manageLinksActionSub:"Lihat, edit, dan pantau semua link kamu.", viewOrders:"Lihat Order", viewOrdersSub:"Cek transaksi dan status pembayaran terbaru.", recentTransactions:"TRANSAKSI TERBARU", recentTransactionsTitle:"Transaksi terbaru", recentTransactionsSub:"Pantau pembayaran terbaru dan statusnya dalam satu tempat.", viewAllOrders:"Lihat semua", noRecentTransactions:"Belum ada transaksi terbaru.", noSales:"Belum ada penjualan" ,uniqueViews:"unique views",activeLinks:"aktif",successfulSales:"transaksi berhasil", error:"Gagal memuat data dashboard."
    },
    en: {
      welcomeBack:"welcome back", dashboardIntro:"Monitor your Payment Links, sales, views, and earnings in one place.", createPaymentLink:"Create Payment Link", managePaymentLinks:"Manage Links", totalLinks:"Total Payment Links", totalViews:"Total Views", totalSales:"Total Sold", netIncome:"Net Earnings", availableBalance:"Available Balance", pendingBalance:"Pending Balance", afterPlatform:"After platform deduction", readyToWithdraw:"Ready to withdraw", pendingSettlement:"Awaiting settlement", statistics:"STATISTICS", sevenDayStats:"Last 7 days activity", sevenDayStatsSub:"Sales and net earnings from successful transactions.", sales7d:"Sold", income7d:"Earnings", yourLinks:"Your Payment Links", yourLinksSub:"Track performance and net earnings for each link.", manageAll:"Manage all", link:"Link", price:"Price", created:"Created", views:"Views", sold:"Sold", income:"Earnings", status:"Status", loading:"Loading data...", noLinks:"No Payment Links yet.", createFirst:"Create one", active:"Active", draft:"Draft", paused:"Paused", expired:"Expired", deleted:"Deleted", open:"Open", copy:"Copy", copied:"Copied", page:"Page", createNewLink:"Create a new Payment Link", createNewLinkSub:"Add a product and start accepting payments.", withdraw:"Withdraw", withdrawSub:"Withdraw your available balance.", noSales:"No sales yet", uniqueViews:"unique views",activeLinks:"active",successfulSales:"successful transactions", error:"Failed to load dashboard data."
    }
  };
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const currentLang=()=>localStorage.getItem("showlink-language")==="en"?"en":"id";
  const t=k=>I18N[currentLang()][k]||k;
  const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
  const num=n=>new Intl.NumberFormat(currentLang()==="id"?"id-ID":"en-US").format(Number(n)||0);
  const dateTime=v=>new Intl.DateTimeFormat(currentLang()==="id"?"id-ID":"en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  let state={links:[],page:1,pageSize:5};

  function translate(){
    document.documentElement.lang=currentLang();
    $$('[data-i18n]').forEach(e=>{const k=e.dataset.i18n;if(I18N[currentLang()][k]!==undefined)e.textContent=t(k);});
  }
  function metric(k,v,isMoney=false){
    $$(`[data-metric="${k}"]`).forEach(e=>e.textContent=isMoney?money(v):num(v));
  }
  function statusLabel(s){return t({active:"active",draft:"draft",paused:"paused",expired:"expired",deleted:"deleted"}[s]||s);}
  function dayKey(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;}
  function renderPagination(){
    const box=$("#links-pagination"); const pages=Math.ceil(state.links.length/state.pageSize);
    if(!box)return;
    if(pages<=1){box.hidden=true;box.innerHTML="";return;}
    box.hidden=false;
    let html=`<button type="button" class="page-btn" data-page="prev" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>`;
    for(let p=1;p<=pages;p++) html+=`<button type="button" class="page-btn ${p===state.page?"is-active":""}" data-page="${p}">${p}</button>`;
    html+=`<button type="button" class="page-btn" data-page="next" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>`;
    html+=`<span class="page-info">${t("page")} ${state.page}/${pages}</span>`;
    box.innerHTML=html;
    box.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>{
      const v=b.dataset.page; if(v==="prev")state.page=Math.max(1,state.page-1); else if(v==="next")state.page=Math.min(pages,state.page+1); else state.page=Number(v); renderLinks();
    }));
  }
  function renderLinks(){
    const body=$("#dashboard-links-body"); if(!body)return;
    if(!state.links.length){body.innerHTML=`<tr><td colspan="8" class="empty-row"><i class="fa-solid fa-link-slash"></i><span>${t("noLinks")}</span><a href="/payment-link.html">${t("createFirst")}</a></td></tr>`;renderPagination();return;}
    const start=(state.page-1)*state.pageSize, rows=state.links.slice(start,start+state.pageSize);
    body.innerHTML=rows.map(x=>{
      const url=`${location.origin}/p/${encodeURIComponent(x.slug)}`;
      return `<tr>
        <td><div class="link-cell"><span class="link-icon"><i class="fa-solid fa-link"></i></span><span><strong>${esc(x.title)}</strong><small>/p/${esc(x.slug)}</small></span></div></td>
        <td>${money(x.price)}</td>
        <td><span class="date-cell"><b>${dateTime(x.created_at).split(",")[0]}</b><small>${dateTime(x.created_at).split(",").slice(1).join(",").trim()}</small></span></td>
        <td>${num(x.views)}</td><td>${num(x.sales_count)}</td><td><strong class="income-cell">${money(x.income)}</strong></td>
        <td><span class="status-chip status-${esc(x.status)}">${esc(statusLabel(x.status))}</span></td>
        <td><div class="row-actions"><a class="mini" href="/p/${encodeURIComponent(x.slug)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i>${t("open")}</a><button class="mini" data-copy="${esc(url)}"><i class="fa-regular fa-copy"></i>${t("copy")}</button></div></td>
      </tr>`;
    }).join("");
    body.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.innerHTML=`<i class="fa-solid fa-check"></i>${t("copied")}`;setTimeout(()=>{b.innerHTML=`<i class="fa-regular fa-copy"></i>${t("copy")}`},1400)}catch(_){prompt("Copy URL:",b.dataset.copy)}}));
    renderPagination();
  }
  function renderChart(orders){
    const box=$("#seven-day-chart"); if(!box)return;
    const now=new Date(); const days=[];
    for(let i=6;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({key:dayKey(d),date:d,sales:0,income:0});}
    for(const o of orders){if(!["paid","processing","completed"].includes(String(o.status||"").toLowerCase()))continue;const d=days.find(x=>x.key===dayKey(o.paid_at||o.completed_at||o.created_at));if(d){d.sales++;d.income+=Number(o.seller_amount||0);}}
    const max=Math.max(1,...days.map(x=>x.sales));
    box.innerHTML=days.map(d=>`<div class="chart-day"><div class="chart-bar-wrap"><span class="chart-bar" style="height:${Math.max(7,(d.sales/max)*100)}%" title="${num(d.sales)} ${t("sold")} · ${money(d.income)}"></span></div><b>${new Intl.DateTimeFormat(currentLang()==="id"?"id-ID":"en-US",{weekday:"short"}).format(d.date)}</b><small>${num(d.sales)}</small></div>`).join("");
    metric("sales7d",days.reduce((n,x)=>n+x.sales,0)); metric("income7d",days.reduce((n,x)=>n+x.income,0),true);
  }

  function renderRecentTransactions(orders, links){
    const box=$("#recent-transactions"); if(!box)return;
    const recent=orders.slice(0,5);
    if(!recent.length){box.innerHTML=`<div class="transaction-empty"><i class="fa-regular fa-receipt"></i><span>${t("noRecentTransactions")}</span></div>`;return;}
    const linkMap=new Map(links.map(x=>[x.id,x.title]));
    const statusMap={paid:["Berhasil","success"],processing:["Diproses","pending"],completed:["Selesai","success"],pending:["Menunggu","pending"],failed:["Gagal","danger"],cancelled:["Dibatalkan","danger"],expired:["Kedaluwarsa","danger"]};
    box.innerHTML=recent.map(o=>{
      const raw=String(o.status||"pending").toLowerCase(); const st=statusMap[raw]||[raw,"pending"];
      const title=linkMap.get(o.payment_link_id)||"Payment Link";
      return `<div class="transaction-row"><span class="transaction-icon ${st[1]}"><i class="fa-solid ${st[1]==="success"?"fa-check":"fa-receipt"}"></i></span><span class="transaction-main"><b>${esc(title)}</b><small>${esc(dateTime(o.paid_at||o.completed_at||o.created_at))}</small></span><span class="transaction-amount"><strong>${money(o.seller_amount||0)}</strong><em class="transaction-status ${st[1]}">${esc(currentLang()==="id"?st[0]:({Berhasil:"Paid",Diproses:"Processing",Selesai:"Completed",Menunggu:"Pending",Gagal:"Failed",Dibatalkan:"Cancelled",Kedaluwarsa:"Expired"}[st[0]]||st[0]))}</em></span></div>`;
    }).join("");
  }

  async function load(){
    const sb=await window.ShowLinkSupabase.load();
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return location.replace("/login.html?redirect="+encodeURIComponent(location.pathname));
    const uid=session.user.id;
    try{
      const {data:p}=await sb.from("profiles").select("username,display_name").eq("id",uid).maybeSingle();
      const name=p?.username||p?.display_name||session.user.user_metadata?.username||session.user.email?.split("@")[0]||"User";
      $$('[data-user-name]').forEach(e=>e.textContent=name);
    }catch{}
    const [walletQ,linksQ,ordersQ]=await Promise.all([
      sb.from("wallets").select("available_balance,pending_balance,lifetime_earned").eq("user_id",uid).maybeSingle(),
      sb.from("payment_links").select("id,slug,title,price,status,views,unique_views,sales_count,created_at,updated_at").eq("owner_id",uid).order("created_at",{ascending:false}),
      sb.from("orders").select("id,payment_link_id,amount,seller_amount,status,created_at,paid_at,completed_at").eq("seller_id",uid).order("created_at",{ascending:false})
    ]);
    if(linksQ.error)throw linksQ.error;
    const links=linksQ.data||[], orders=ordersQ.data||[], wallet=walletQ.data||{};
    const paid=orders.filter(o=>["paid","processing","completed"].includes(String(o.status||"").toLowerCase()));
    const income=paid.reduce((n,o)=>n+Number(o.seller_amount||0),0);
    const views=links.reduce((n,x)=>n+Number(x.views||0),0), unique=links.reduce((n,x)=>n+Number(x.unique_views||0),0), sales=links.reduce((n,x)=>n+Number(x.sales_count||0),0);
    metric("totalPaymentLinks",links.length);metric("paymentViews",views);metric("paymentSales",sales);metric("paymentIncome",income,true);metric("availableBalance",wallet.available_balance||0,true);metric("pendingBalance",wallet.pending_balance||0,true);
    $$('[data-stat-sub="activeLinks"]').forEach(e=>e.textContent=`${num(links.filter(x=>x.status==="active").length)} ${t("activeLinks")}`);
    $$('[data-stat-sub="uniqueViews"]').forEach(e=>e.textContent=`${num(unique)} ${t("uniqueViews")}`);
    $$('[data-stat-sub="successfulSales"]').forEach(e=>e.textContent=`${num(paid.length)} ${t("successfulSales")}`);
    const incomeByLink={}; for(const o of paid)incomeByLink[o.payment_link_id]=(incomeByLink[o.payment_link_id]||0)+Number(o.seller_amount||0);
    state.links=links.map(x=>({...x,income:incomeByLink[x.id]||0}));state.page=1;renderLinks();renderChart(orders);renderRecentTransactions(orders,links);
  }
  document.addEventListener("DOMContentLoaded",()=>{translate();load().catch(e=>{console.error(e);const b=$("#dashboard-links-body");if(b)b.innerHTML=`<tr><td colspan="8" class="empty-row error-row"><i class="fa-solid fa-triangle-exclamation"></i>${t("error")}</td></tr>`;});window.addEventListener("showlink:language-change",()=>{translate();renderLinks();});});
})();
