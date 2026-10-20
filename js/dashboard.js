(() => {
  "use strict";
  const I18N = {
    id: {
      welcomeBack:"selamat datang", dashCurrentBalance:"Saldo Saat Ini", dashSettlementBalance:"Saldo settlement", dashPasteViews:"Total Views Pastelink", dashShortlinkViews:"Total Views Shortlink", dashSub4Views:"Total Views Sub4unlock", dashShortlinkChartTitle:"Statistik Shortlink", walletStats:"Statistik Saldo & Semua Pendapatan", shortlinkAnalytics:"Statistik dan Analitik Shortlink", shortlinkDeveloping:"Dalam pengembangan — alur Shortlink sedang diselesaikan.", shortlinkAnalyticsSub:"Statistik Final dari Shortlink milik kamu.", finalViews:"View Final", finalClicks:"Klik Download", finalRedirects:"Redirect GO", finalRevenue:"Pendapatan Final", finalRevenueNote:"Pendapatan dihitung hanya saat pengunjung menekan Redirect GO, berdasarkan CPM yang dikontrol admin.", moduleDeveloping:"Fitur sedang dikembangkan", paymentAnalytics:"Statistik dan Analitik Payment Link", pasteAnalytics:"Statistik dan Analitik PasteLink", totalPasteLinks:"Total PasteLink", totalPasteViews:"Total View PasteLink", yourPasteLinksOnly:"PasteLink milik kamu", viewsAllYourPasteLinks:"View semua PasteLink kamu", dashboardIntro:"Pantau Payment Link, penjualan, views, dan pendapatanmu dari satu tempat.", createPaymentLink:"Buat Payment Link", managePaymentLinks:"Kelola Link", totalLinks:"Total Payment Link", totalViews:"Total Views", totalSales:"Total Terjual", netIncome:"Pendapatan Bersih", availableBalance:"Saldo Tersedia", pendingBalance:"Saldo Pending", afterPlatform:"Sudah setelah potongan platform", readyToWithdraw:"Siap dicairkan", pendingSettlement:"Menunggu settlement", statistics:"STATISTIK", sevenDayStats:"Aktivitas 7 hari terakhir", sevenDayStatsSub:"Ringkasan penjualan dan pendapatan bersih berdasarkan transaksi berhasil.", sales7d:"Terjual", income7d:"Pendapatan", yourLinks:"Payment Link kamu", yourLinksSub:"Kelola performa link dan lihat pendapatan bersih dari setiap link.", manageAll:"Kelola semua", link:"Link", price:"Harga", created:"Dibuat", views:"Views", sold:"Terjual", income:"Pendapatan", status:"Status", loading:"Memuat data...", noLinks:"Belum ada Payment Link.", createFirst:"Buat sekarang", active:"Aktif", draft:"Draft", paused:"Dijeda", expired:"Kedaluwarsa", deleted:"Dihapus", open:"Buka", copy:"Salin", copied:"Tersalin", page:"Halaman", createNewLink:"Buat Payment Link baru", createNewLinkSub:"Tambahkan produk dan mulai menerima pembayaran.", withdraw:"Withdraw", withdrawSub:"Cairkan saldo yang tersedia.", noSales:"Belum ada penjualan" ,uniqueViews:"unique views",activeLinks:"aktif",successfulSales:"transaksi berhasil", paymentTotalLinks:"Total Link",incomeToday:"Pendapatan Hari Ini",incomeMonth:"Pendapatan Bulan Ini",incomeTotal:"Total Pendapatan",clickForDetails:"Klik untuk detail",clickForIncome:"Klik untuk lihat pendapatan",clickForViews:"Klik untuk melihat statistik view",yourPasteLinks:"PasteLink Kamu",yourPasteLinksSub:"Kelola PasteLink dan pantau jumlah view milikmu.",createPasteLink:"Buat PasteLink Baru",pasteTitle:"Judul",salesAnalyticsTitle:"Ringkasan Analitik Payment Link", popupTitleIncome:"Rincian Pendapatan",popupTitleViews:"Statistik View PasteLink",popupTotal:"Total",popupToday:"Hari ini",popupMonth:"Bulan ini",popupViews:"Total view",viewTrendUp:"Naik dibanding periode sebelumnya",viewTrendDown:"Turun dibanding periode sebelumnya",viewTrendFlat:"Sama dengan periode sebelumnya",viewTrendPeriod:"Perbandingan view 7 hari ini dengan 7 hari sebelumnya.",noPasteLinks:"Belum ada PasteLink.",error:"Gagal memuat data dashboard.",dashSummaryAria:"Ringkasan saldo, pendapatan, dan views",dashNoAnnouncements:"Belum ada pengumuman dari admin.",dashAnnouncementsError:"Pengumuman belum dapat dimuat. Silakan coba lagi nanti.",dashAnnouncements:"Pengumuman",dashAnnouncementsIntro:"Informasi terbaru dari admin ShowLink.",dashTotalEarnings:"Total Pendapatan",dashShortlinkEarnings:"Pendapatan Shortlink",dashReferralEarnings:"Pendapatan Referral",dashPaymentEarnings:"Pendapatan Payment Link",dashAverageCpm:"CPM Rata-rata",dashTimezone:"Data menggunakan zona waktu Asia/Jakarta",dashCpmLabel:"Pendapatan / 1.000 views",dashPaymentTitle:"Statistik Payment Link",dashPaymentIntro:"Pendapatan bersih berdasarkan transaksi berhasil.",dashNetIncome:"Pendapatan bersih",dashDailyStats:"Statistik Harian",dashDate:"TANGGAL",dashViews:"VIEWS",dashPaymentColumn:"PAYMENT LINK",dashSub4Column:"TOTAL VIEWS SUB4UNLOCK",dashPasteColumn:"VIEWS PASTELINK",dashDailyCpm:"CPM HARIAN",dashReferralColumn:"PENDAPATAN REFERRAL",dashChartViews:"Views",dashChartIncome:"Pendapatan",dashChartTransactions:"Transaksi",dashSelectedDate:"Tanggal dipilih",dashShortlinkViewsDetail:"Jumlah views",dashPaymentTransactionsDetail:"Jumlah transaksi",dashPaymentIncomeDetail:"Pendapatan"
    },
    en: {
      welcomeBack:"welcome back", dashCurrentBalance:"Current Balance", dashSettlementBalance:"Settlement Balance", dashPasteViews:"Total Pastelink Views", dashShortlinkViews:"Total Shortlink Views", dashSub4Views:"Total Sub4unlock Views", dashShortlinkChartTitle:"Shortlink Statistics", walletStats:"Balance & Total Earnings Statistics", shortlinkAnalytics:"Shortlink Statistics & Analytics", shortlinkDeveloping:"Under development — the Shortlink flow is still being finalized.", shortlinkAnalyticsSub:"Final statistics for your own Shortlinks.", finalViews:"Final Views", finalClicks:"Download Clicks", finalRedirects:"GO Redirects", finalRevenue:"Final Earnings", finalRevenueNote:"Earnings are recorded only when a visitor presses Redirect GO, using the CPM controlled by the admin.", moduleDeveloping:"Feature under development", paymentAnalytics:"Payment Link Statistics & Analytics", pasteAnalytics:"PasteLink Statistics & Analytics", totalPasteLinks:"Total PasteLinks", totalPasteViews:"Total PasteLink Views", yourPasteLinksOnly:"Your own PasteLinks", viewsAllYourPasteLinks:"Views across your PasteLinks", dashboardIntro:"Monitor your Payment Links, sales, views, and earnings in one place.", createPaymentLink:"Create Payment Link", managePaymentLinks:"Manage Links", totalLinks:"Total Payment Links", totalViews:"Total Views", totalSales:"Total Sold", netIncome:"Net Earnings", availableBalance:"Available Balance", pendingBalance:"Pending Balance", afterPlatform:"After platform deduction", readyToWithdraw:"Ready to withdraw", pendingSettlement:"Awaiting settlement", statistics:"STATISTICS", sevenDayStats:"Last 7 days activity", sevenDayStatsSub:"Sales and net earnings from successful transactions.", sales7d:"Sold", income7d:"Earnings", yourLinks:"Your Payment Links", yourLinksSub:"Track performance and net earnings for each link.", manageAll:"Manage all", link:"Link", price:"Price", created:"Created", views:"Views", sold:"Sold", income:"Earnings", status:"Status", loading:"Loading data...", noLinks:"No Payment Links yet.", createFirst:"Create one", active:"Active", draft:"Draft", paused:"Paused", expired:"Expired", deleted:"Deleted", open:"Open", copy:"Copy", copied:"Copied", page:"Page", createNewLink:"Create a new Payment Link", createNewLinkSub:"Add a product and start accepting payments.", withdraw:"Withdraw", withdrawSub:"Withdraw your available balance.", noSales:"No sales yet", uniqueViews:"unique views",activeLinks:"active",successfulSales:"successful transactions", paymentTotalLinks:"Total Links",incomeToday:"Today’s Earnings",incomeMonth:"This Month’s Earnings",incomeTotal:"Total Earnings",clickForDetails:"Click for details",clickForIncome:"Click to view earnings",clickForViews:"Click to view view statistics",yourPasteLinks:"Your PasteLinks",yourPasteLinksSub:"Manage your PasteLinks and track their views.",createPasteLink:"Create New PasteLink",pasteTitle:"Title",salesAnalyticsTitle:"Payment Link Analytics Summary", popupTitleIncome:"Earnings Breakdown",popupTitleViews:"PasteLink View Statistics",popupTotal:"Total",popupToday:"Today",popupMonth:"This month",popupViews:"Total views",viewTrendUp:"Up compared with the previous period",viewTrendDown:"Down compared with the previous period",viewTrendFlat:"Same as the previous period",viewTrendPeriod:"Comparison of the last 7 days with the 7 days before that.",noPasteLinks:"No PasteLinks yet.",error:"Failed to load dashboard data.",dashSummaryAria:"Balance, earnings, and views summary",dashNoAnnouncements:"No announcements from the admin yet.",dashAnnouncementsError:"Announcements could not be loaded. Please try again later.",dashAnnouncements:"Announcements",dashAnnouncementsIntro:"Latest updates from the ShowLink admin.",dashTotalEarnings:"Total Earnings",dashShortlinkEarnings:"Shortlink Earnings",dashReferralEarnings:"Referral Earnings",dashPaymentEarnings:"Payment Link Earnings",dashAverageCpm:"Average CPM",dashTimezone:"Data uses the Asia/Jakarta time zone",dashCpmLabel:"Earnings / 1,000 views",dashPaymentTitle:"Payment Link Statistics",dashPaymentIntro:"Net earnings from successful transactions.",dashNetIncome:"Net earnings",dashDailyStats:"Daily Statistics",dashDate:"DATE",dashViews:"VIEWS",dashPaymentColumn:"PAYMENT LINK",dashSub4Column:"TOTAL SUB4UNLOCK VIEWS",dashPasteColumn:"PASTELINK VIEWS",dashDailyCpm:"DAILY CPM",dashReferralColumn:"REFERRAL EARNINGS",dashChartViews:"Views",dashChartIncome:"Earnings",dashChartTransactions:"Transactions",dashSelectedDate:"Selected date",dashShortlinkViewsDetail:"Views",dashPaymentTransactionsDetail:"Transactions",dashPaymentIncomeDetail:"Earnings"
    }
  };
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const currentLang=()=>localStorage.getItem("showlink-language")==="en"?"en":"id";
  const t=k=>I18N[currentLang()][k]||k;
  const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
  const num=n=>new Intl.NumberFormat(currentLang()==="id"?"id-ID":"en-US").format(Number(n)||0);
  const dateTime=v=>new Intl.DateTimeFormat(currentLang()==="id"?"id-ID":"en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v));
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  let state={links:[],pasteLinks:[],page:1,pageSize:5, income:{today:0,month:0,total:0}, pasteViews:0, pastePrevViews:0, available:0, pending:0, sales:0, paymentViews:0, dailyOrders:[], shortlinkFinal:{views:0,clicks:0,redirects:0,revenue:0}, referralEarnings:0, lifetimeEarned:0};

  function translate(){
    document.documentElement.lang=currentLang();
    $$('[data-i18n]').forEach(e=>{const k=e.dataset.i18n;if(I18N[currentLang()][k]!==undefined)e.textContent=t(k);}); $$('[data-i18n-aria-label]').forEach(e=>{const k=e.dataset.i18nAriaLabel;if(I18N[currentLang()][k]!==undefined)e.setAttribute('aria-label',t(k));});
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
  function formatDayLabel(key){return key;}
  function lastSevenDays(){const out=[];const now=new Date();for(let i=6;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);out.push({key:dayKey(d),date:d});}return out;}
  function renderLineChart(containerId,detailId,values,kind){
    const box=document.getElementById(containerId);if(!box)return;
    const detail=document.getElementById(detailId);
    const w=1000,h=410,pad={l:112,r:100,t:28,b:58},iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
    const primary=values.map(v=>Math.max(0,Number(v.value)||0));
    const secondary=values.map(v=>Math.max(0,Number(v.secondary)||0));
    const niceMax=arr=>{const raw=Math.max(0,...arr);if(raw===0)return 1;const padded=raw*1.12,mag=Math.pow(10,Math.floor(Math.log10(padded))),n=padded/mag;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*mag;};
    const maxA=niceMax(primary),maxB=niceMax(secondary);
    const y=(v,m)=>pad.t+ih-(Math.max(0,Number(v)||0)/m)*ih;
    const x=i=>pad.l+(values.length<=1?iw/2:i*iw/Math.max(1,values.length-1));
    const compact=(n,isMoney=false)=>{
      const v=Number(n)||0;
      if(isMoney){if(Math.abs(v)>=1e9)return 'Rp'+(v/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M';if(Math.abs(v)>=1e6)return 'Rp'+(v/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt';if(Math.abs(v)>=1e3)return 'Rp'+(v/1e3).toLocaleString('id-ID',{maximumFractionDigits:1})+' rb';return 'Rp'+num(v);}
      if(Math.abs(v)>=1e9)return (v/1e9).toLocaleString('id-ID',{maximumFractionDigits:1})+' M';if(Math.abs(v)>=1e6)return (v/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt';if(Math.abs(v)>=1e3)return (v/1e3).toLocaleString('id-ID',{maximumFractionDigits:1})+' rb';return num(v);
    };
    const ticks=[0,.25,.5,.75,1];
    const grid=ticks.map(n=>{const yy=pad.t+ih-ih*n;return `<g><line x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}" class="chart-gridline"/><text x="${pad.l-14}" y="${yy+5}" text-anchor="end" class="chart-axis-label">${compact(maxA*n,kind==='payment')}</text><text x="${w-pad.r+14}" y="${yy+5}" text-anchor="start" class="chart-axis-label chart-axis-secondary">${compact(maxB*n,kind==='shortlink')}</text></g>`;}).join('');
    const makePath=(arr,max)=>{const pts=arr.map((v,i)=>({x:x(i),y:y(v,max)}));if(!pts.length)return {path:'',area:'',pts};if(pts.length===1)return {path:`M ${pts[0].x} ${pts[0].y}`,area:`M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pad.t+ih} Z`,pts};let path=`M ${pts[0].x} ${pts[0].y}`;for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];const tension=.78;path+=` C ${p1.x+(p2.x-p0.x)/6*tension} ${p1.y+(p2.y-p0.y)/6*tension}, ${p2.x-(p3.x-p1.x)/6*tension} ${p2.y-(p3.y-p1.y)/6*tension}, ${p2.x} ${p2.y}`;}return {path,area:`${path} L ${pts[pts.length-1].x} ${pad.t+ih} L ${pts[0].x} ${pad.t+ih} Z`,pts};};
    const a=makePath(primary,maxA),b=makePath(secondary,maxB);
    const dateLabel=key=>{const d=new Date(`${key}T12:00:00`);return Number.isNaN(d.getTime())?key:new Intl.DateTimeFormat(currentLang()==='id'?'id-ID':'en-US',{day:'2-digit',month:'short'}).format(d);};
    const labels=values.map((v,i)=>`<text x="${x(i)}" y="${h-17}" text-anchor="middle" class="chart-axis-label">${dateLabel(v.key)}</text>`).join('');
    const dots=(arr,max,series)=>values.map((v,i)=>{const val=arr[i],isPrimary=series==='primary';const label=kind==='shortlink'?(isPrimary?`${t('dashChartViews')}: ${num(val)}`:`${t('dashChartIncome')}: ${money(val)}`):(isPrimary?`${t('dashChartIncome')}: ${money(val)}`:`${t('dashChartTransactions')}: ${num(val)}`);return `<g class="chart-point-group" data-chart-index="${i}" data-chart-series="${series}" tabindex="0" role="button" aria-label="${esc(dateLabel(v.key))}, ${esc(label)}"><circle class="chart-hit-area" cx="${x(i)}" cy="${y(val,max)}" r="24"/><circle class="chart-point ${isPrimary?'chart-point-primary':'chart-point-secondary'}" cx="${x(i)}" cy="${y(val,max)}" r="5.5"/><title>${esc(dateLabel(v.key))} · ${esc(label)}</title></g>`;}).join('');
    box.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${kind==='shortlink'?'Grafik Shortlink: views dan pendapatan':'Grafik Payment Link: pendapatan dan transaksi'}"><defs><linearGradient id="chart-fill-${containerId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2583ee" stop-opacity=".19"/><stop offset="100%" stop-color="#2583ee" stop-opacity=".015"/></linearGradient></defs>${grid}<path class="chart-area-path" d="${a.area}" fill="url(#chart-fill-${containerId})"/><path d="${a.path}" class="chart-line-path chart-line-primary"/><path d="${b.path}" class="chart-line-path chart-line-secondary"/>${dots(primary,maxA,'primary')}${dots(secondary,maxB,'secondary')}${labels}</svg><div class="chart-legend"><span><i class="legend-primary"></i>${kind==='shortlink'?t('dashChartViews'):t('dashChartIncome')}</span><span><i class="legend-secondary"></i>${kind==='shortlink'?t('dashChartIncome'):t('dashChartTransactions')}</span></div>`;
    const selectPoint=i=>{const v=values[i];if(!detail||!v)return;const first=kind==='shortlink'?`<span class="detail-metric"><small>${t("dashChartViews")}</small><b>${num(primary[i])}</b></span><span class="detail-metric"><small>${t("dashChartIncome")}</small><b>${money(secondary[i])}</b></span>`:`<span class="detail-metric"><small>${t("dashChartTransactions")}</small><b>${num(secondary[i])}</b></span><span class="detail-metric"><small>${t("dashChartIncome")}</small><b>${money(primary[i])}</b></span>`;detail.innerHTML=`<div class="detail-date"><i class="fa-regular fa-calendar"></i><strong>${esc(dateLabel(v.key))}</strong></div><div class="detail-metrics">${first}</div>`;detail.classList.add('has-selection');box.querySelectorAll('.chart-point-group').forEach(el=>el.classList.toggle('is-selected',Number(el.dataset.chartIndex)===i));};
    box.querySelectorAll('.chart-point-group').forEach(point=>{const pick=()=>selectPoint(Number(point.dataset.chartIndex));point.addEventListener('click',pick);point.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const all=[...box.querySelectorAll('.chart-point-group')];const idx=all.indexOf(point);all[Math.max(0,Math.min(all.length-1,idx+(e.key==='ArrowRight'?1:-1)))].focus();}});});
    if(values.length)selectPoint(values.length-1);
  }
  function renderDailyStats(orders,shortlinkDaily=[]){
    const days=lastSevenDays();const paid=orders.filter(o=>['paid','processing','completed'].includes(String(o.status||'').toLowerCase()));
    const payments=days.map(d=>{const todays=paid.filter(o=>dayKey(o.paid_at||o.completed_at||o.created_at)===d.key);return {key:d.key,value:todays.reduce((n,o)=>n+Number(o.seller_amount||0),0),secondary:todays.length};});
    const shortlinkByDay=new Map((shortlinkDaily||[]).map(r=>[String(r.event_date).slice(0,10),r]));
    const shortlinks=days.map(d=>({key:d.key,value:Number(shortlinkByDay.get(d.key)?.views||0),secondary:Number(shortlinkByDay.get(d.key)?.revenue||0)}));
    renderLineChart('shortlink-chart','shortlink-detail',shortlinks,'shortlink');
    renderLineChart('payment-link-chart','payment-link-detail',payments,'payment');
    const body=document.getElementById('dashboard-daily-stats-body');if(!body)return;
    body.innerHTML=days.slice().reverse().map(d=>{const pay=payments.find(x=>x.key===d.key)?.value||0;const sl=shortlinkByDay.get(d.key)||{};return `<tr><td>${new Intl.DateTimeFormat(currentLang()==="id"?"id-ID":"en-US",{day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(d.key+"T12:00:00"))}</td><td>${num(Number(sl.views||0))}</td><td>${money(Number(sl.revenue||0))}</td><td>${money(pay)}</td><td>0</td><td>0</td><td>${money(Number(sl.views||0)>0?Number(sl.revenue||0)*1000/Number(sl.views):0)}</td><td>${money(0)}</td></tr>`;}).join('');
  }
  function renderChart(orders){
    const box=$("#seven-day-chart"); if(!box)return;
    const now=new Date(); const days=[];
    for(let i=6;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({key:dayKey(d),date:d,sales:0,income:0});}
    for(const o of orders){if(!["paid","processing","completed"].includes(String(o.status||"").toLowerCase()))continue;const d=days.find(x=>x.key===dayKey(o.paid_at||o.completed_at||o.created_at));if(d){d.sales++;d.income+=Number(o.seller_amount||0);}}
    const max=Math.max(1,...days.map(x=>x.sales));
    box.innerHTML=days.map(d=>`<div class="chart-day"><div class="chart-bar-wrap"><span class="chart-bar" style="height:${Math.max(7,(d.sales/max)*100)}%" title="${num(d.sales)} ${t("sold")} · ${money(d.income)}"></span></div><b>${new Intl.DateTimeFormat(currentLang()==="id"?"id-ID":"en-US",{weekday:"short"}).format(d.date)}</b><small>${num(d.sales)}</small></div>`).join("");
    metric("sales7d",days.reduce((n,x)=>n+x.sales,0)); metric("income7d",days.reduce((n,x)=>n+x.income,0),true);state.sales7d=days.reduce((n,x)=>n+x.sales,0);state.income7d=days.reduce((n,x)=>n+x.income,0);
  }
  function showToast(title,body){const el=$("#dashboard-toast");if(!el)return;el.innerHTML=`<button type="button" class="toast-close" aria-label="Close">×</button><strong>${esc(title)}</strong><div>${body}</div>`;el.hidden=false;el.querySelector(".toast-close").onclick=()=>el.hidden=true;}
  function showPopup(key){
    const i=state.income; let title="",body="";
    if(key==="incomeToday"||key==="incomeMonth"||key==="incomeTotal"){
      title=t("popupTitleIncome");body=`<p>${t("popupToday")}: <b>${money(i.today)}</b></p><p>${t("popupMonth")}: <b>${money(i.month)}</b></p><p>${t("popupTotal")}: <b>${money(i.total)}</b></p>`;
    } else if(key==="availableBalance"){title=t("availableBalance");body=`<p>${t("popupTotal")}: <b>${money(state.available)}</b></p><small>${t("readyToWithdraw")}</small>`;
    } else if(key==="pendingBalance"){title=t("pendingBalance");body=`<p>${t("popupTotal")}: <b>${money(state.pending)}</b></p><small>${t("pendingSettlement")}</small>`;
    } else if(key==="salesAnalytics"){title=t("salesAnalyticsTitle");body=`<p>${t("sales7d")}: <b>${num(state.sales)}</b></p><p>${t("income7d")}: <b>${money(state.income7d||0)}</b></p><p>${t("totalViews")}: <b>${num(state.paymentViews)}</b></p>`;
    } else if(key==="pasteViews"){
      title=t("popupTitleViews");const delta=state.pasteCurrentPeriodViews-state.pastePrevViews;const trend=delta>0?t("viewTrendUp"):delta<0?t("viewTrendDown"):t("viewTrendFlat");body=`<p>${t("popupViews")}: <b>${num(state.pasteViews)}</b></p><p>${esc(trend)} (${delta>0?"+":""}${num(delta)})</p><small>${t("viewTrendPeriod")}</small>`;
    } else if(key==="shortlinkFinalViews"){title=t("finalViews");body=`<p>${t("popupTotal")}: <b>${num(state.shortlinkFinal.views)}</b></p>`;}
    else if(key==="shortlinkFinalClicks"){title=t("finalClicks");body=`<p>${t("popupTotal")}: <b>${num(state.shortlinkFinal.clicks)}</b></p>`;}
    else if(key==="shortlinkFinalRedirects"){title=t("finalRedirects");body=`<p>${t("popupTotal")}: <b>${num(state.shortlinkFinal.redirects)}</b></p>`;}
    else if(key==="shortlinkFinalRevenue"){title=t("finalRevenue");body=`<p>${t("popupTotal")}: <b>${money(state.shortlinkFinal.revenue)}</b></p><small>${t("finalRevenueNote")}</small>`;}
    else if(key==="pasteTotal"){title=t("totalPasteLinks");body=`<p>${t("popupTotal")}: <b>${num(state.pasteLinks.length)}</b></p>`;}
    else {title=t("paymentTotalLinks");body=`<p>${t("popupTotal")}: <b>${num(state.links.length)}</b></p>`;}
    showToast(title,body);
  }
  function renderPasteLinks(){const body=$("#dashboard-pastelinks-body");if(!body)return;const rows=state.pasteLinks;
    if(!rows.length){body.innerHTML=`<tr><td colspan="5" class="empty-row"><i class="fa-solid fa-file-circle-plus"></i><span>${t("noPasteLinks")}</span><a href="/pastelink.html">${t("createPasteLink")}</a></td></tr>`;return;}
    body.innerHTML=rows.slice(0,8).map(x=>`<tr><td><strong>${esc(x.title||x.slug||"PasteLink")}</strong></td><td>${esc(x.slug||"—")}</td><td>${num(x.views||0)}</td><td>${x.created_at?esc(dateTime(x.created_at)):"—"}</td><td><a class="mini" href="/pastelink-view.html?slug=${encodeURIComponent(x.slug||"")}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i>${t("open")}</a></td></tr>`).join("");
  }
  document.addEventListener("click",e=>{const b=e.target.closest("[data-popup]");if(b)showPopup(b.dataset.popup);});
  document.addEventListener("keydown",e=>{const b=e.target.closest('[data-popup][role="button"]');if(b&&(e.key==="Enter"||e.key===" ")){e.preventDefault();showPopup(b.dataset.popup);}});
  async function loadDashboardAnnouncements(sb, uid){
    const list=document.getElementById('dashboard-announcements-list');
    if(!list)return;
    try{
      const {data,error}=await sb.from('notifications').select('title,message,link_url,created_at').eq('user_id',uid).eq('type','announcement').order('created_at',{ascending:false}).limit(5);
      if(error)throw error;
      const items=data||[];
      if(!items.length){list.innerHTML=`<p class="announcement-empty">${t('dashNoAnnouncements')}</p>`;return;}
      list.innerHTML=items.map(item=>`<article class="dashboard-announcement-item"><div class="dashboard-announcement-icon"><i class="fa-solid fa-bullhorn" aria-hidden="true"></i></div><div class="dashboard-announcement-copy"><h3>${esc(item.title||'Pengumuman ShowLink')}</h3><p>${esc(item.message||'')}</p><small>${item.created_at?esc(dateTime(item.created_at)):'—'}</small>${item.link_url?`<a href="${esc(item.link_url)}">Lihat selengkapnya <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`:''}</div></article>`).join('');
    }catch(err){console.warn('Dashboard announcements unavailable',err);list.innerHTML=`<p class="announcement-empty">${t('dashAnnouncementsError')}</p>`;}
  }
  async function load(){
    const sb=await window.ShowLinkSupabase.load();
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return location.replace("/login.html?redirect="+encodeURIComponent(location.pathname));
    const uid=session.user.id;
    loadDashboardAnnouncements(sb,uid);
    try{
      const {data:p}=await sb.from("profiles").select("username,display_name,is_admin").eq("id",uid).maybeSingle();
      const name=p?.username||p?.display_name||session.user.user_metadata?.username||session.user.email?.split("@")[0]||"User";
      $$('[data-user-name]').forEach(e=>e.textContent=name);
      const greetingHour=Number(new Intl.DateTimeFormat('en-US',{hour:'2-digit',hourCycle:'h23',timeZone:'Asia/Jakarta'}).format(new Date()));
      const greetingId=greetingHour>=4&&greetingHour<11?'Selamat pagi':greetingHour>=11&&greetingHour<15?'Selamat siang':greetingHour>=15&&greetingHour<18?'Selamat sore':'Selamat malam';const greeting=currentLang()==='en'?(greetingHour>=4&&greetingHour<11?'Good morning':greetingHour>=11&&greetingHour<15?'Good afternoon':greetingHour>=15&&greetingHour<18?'Good evening':'Good evening'):greetingId;
      const greetingBox=document.getElementById('dashboard-greeting');if(greetingBox)greetingBox.innerHTML=`${esc(greeting)}, <span data-user-name>${esc(name)}</span>! <span aria-hidden="true">👋</span>`;

    }catch{}
    const [walletQ,linksQ,ordersQ,pasteLinksQ,shortlinkFinalQ,shortlinkDailyQ]=await Promise.all([
      sb.from("wallets").select("available_balance,pending_balance,lifetime_earned").eq("user_id",uid).maybeSingle(),
      sb.from("payment_links").select("id,slug,title,price,status,views,unique_views,sales_count,created_at,updated_at").eq("owner_id",uid).order("created_at",{ascending:false}),
      sb.from("orders").select("id,payment_link_id,amount,seller_amount,status,created_at,paid_at,completed_at").eq("seller_id",uid).order("created_at",{ascending:false}),
      sb.rpc("get_my_pastelink_analytics"),
      sb.rpc("get_my_shortlink_final_analytics"),
      sb.from("shortlink_final_analytics_daily").select("event_date,views,clicks,redirects,revenue").eq("owner_id",uid).order("event_date",{ascending:false}).limit(90)
    ]);
    if(linksQ.error)throw linksQ.error;
    if(pasteLinksQ.error) console.warn("PasteLink analytics unavailable; apply PASTELINK-ANALYTICS-MIGRATION.sql",pasteLinksQ.error);
    if(shortlinkFinalQ.error) console.warn("Shortlink Final analytics unavailable; apply SHORTLINK-FINAL-ANALYTICS-MIGRATION.sql",shortlinkFinalQ.error);
    if(shortlinkDailyQ.error) console.warn("Shortlink daily chart data unavailable",shortlinkDailyQ.error);
    const links=linksQ.data||[], orders=ordersQ.data||[], wallet=walletQ.data||{}, pastePayload=pasteLinksQ.data||{}, pasteLinks=Array.isArray(pastePayload.links)?pastePayload.links:[];
    const paid=orders.filter(o=>["paid","processing","completed"].includes(String(o.status||"").toLowerCase()));
    const income=paid.reduce((n,o)=>n+Number(o.seller_amount||0),0);
    const now=new Date(), today=dayKey(now), month=today.slice(0,7);
    const incomeToday=paid.filter(o=>dayKey(o.paid_at||o.completed_at||o.created_at)===today).reduce((n,o)=>n+Number(o.seller_amount||0),0);
    const incomeMonth=paid.filter(o=>dayKey(o.paid_at||o.completed_at||o.created_at).slice(0,7)===month).reduce((n,o)=>n+Number(o.seller_amount||0),0);
    const views=links.reduce((n,x)=>n+Number(x.views||0),0), unique=links.reduce((n,x)=>n+Number(x.unique_views||0),0), sales=links.reduce((n,x)=>n+Number(x.sales_count||0),0);
    state.income={today:incomeToday,month:incomeMonth,total:income};state.available=Number(wallet.available_balance||0);state.pending=Number(wallet.pending_balance||0);state.sales=paid.length;state.paymentViews=views;state.income7d=0;state.dailyOrders=orders;state.lifetimeEarned=Number(wallet.lifetime_earned||income);
    state.pasteLinks=pasteLinks;state.pasteViews=pasteLinks.reduce((n,x)=>n+Number(x.views||0),0);state.pastePrevViews=Number(pastePayload.previous_period_views||0);state.pasteCurrentPeriodViews=Number(pastePayload.current_period_views||0);
    const sf=shortlinkFinalQ.data||{};state.shortlinkFinal={views:Number(sf.views||0),clicks:Number(sf.clicks||0),redirects:Number(sf.redirects||0),revenue:Number(sf.revenue||0)};
    const shortlinkDaily=shortlinkDailyQ.data||[];
    metric("currentBalance",state.available,true);metric("settlementBalance",state.pending,true);metric("totalEarnings",state.lifetimeEarned,true);metric("shortlinkEarnings",state.shortlinkFinal.revenue,true);metric("shortlinkBalance",state.shortlinkFinal.revenue,true);metric("pasteViewsSummary",state.pasteViews);$$('[data-metric="pasteViewsSummary"]').forEach(e=>e.textContent=`${num(state.pasteViews)} Views`);metric("shortlinkViewsSummary",state.shortlinkFinal.views);$$('[data-metric="shortlinkViewsSummary"]').forEach(e=>e.textContent=`${num(state.shortlinkFinal.views)} Views`);metric("sub4ViewsSummary",0);$$('[data-metric="sub4ViewsSummary"]').forEach(e=>e.textContent=`${num(0)} Views`);metric("referralEarnings",state.referralEarnings,true);metric("referralBalance",0,true);metric("paymentEarnings",income,true);metric("availableBalanceInline",state.available,true);metric("averageCpm",state.shortlinkFinal.views>0?Math.round((state.shortlinkFinal.revenue/state.shortlinkFinal.views)*1000):0,false);
    metric("shortlinkFinalViews",state.shortlinkFinal.views);metric("shortlinkFinalClicks",state.shortlinkFinal.clicks);metric("shortlinkFinalRedirects",state.shortlinkFinal.redirects);metric("shortlinkFinalRevenue",state.shortlinkFinal.revenue,true);
    metric("totalPasteLinks",pasteLinks.length);metric("pasteLinkViews",state.pasteViews);metric("incomeToday",incomeToday,true);metric("incomeMonth",incomeMonth,true);metric("incomeTotal",income,true);
    metric("totalPaymentLinks",links.length);metric("paymentViews",views);metric("paymentSales",sales);metric("paymentIncome",income,true);metric("availableBalance",wallet.available_balance||0,true);metric("pendingBalance",wallet.pending_balance||0,true);
    $$('[data-stat-sub="activeLinks"]').forEach(e=>e.textContent=`${num(links.filter(x=>x.status==="active").length)} ${t("activeLinks")}`);
    $$('[data-stat-sub="uniqueViews"]').forEach(e=>e.textContent=`${num(unique)} ${t("uniqueViews")}`);
    $$('[data-stat-sub="successfulSales"]').forEach(e=>e.textContent=`${num(paid.length)} ${t("successfulSales")}`);
    const incomeByLink={}; for(const o of paid)incomeByLink[o.payment_link_id]=(incomeByLink[o.payment_link_id]||0)+Number(o.seller_amount||0);
    state.links=links.map(x=>({...x,income:incomeByLink[x.id]||0}));state.page=1;renderLinks();renderPasteLinks();renderChart(orders);renderDailyStats(orders,shortlinkDaily);
  }

  document.addEventListener("DOMContentLoaded",()=>{translate();load().catch(e=>{console.error("ShowLink dashboard load failed:",e);const b=$("#dashboard-links-body");if(b)b.innerHTML=`<tr><td colspan="8" class="empty-row error-row"><i class="fa-solid fa-triangle-exclamation"></i>${t("error")}</td></tr>`;showToast(t("error"),`<p>${esc(e?.message||String(e))}</p>`);});window.addEventListener("showlink:language-change",()=>{translate();renderLinks();renderPasteLinks();});});
})();
