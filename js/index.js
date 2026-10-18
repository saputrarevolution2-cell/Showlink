(() => {
  'use strict';

  const copy = {
    id: {
      heroBadge:'SHOWLINK · PAYMENT PLATFORM', heroTitle:'Satu link untuk', heroAccent:'menerima pembayaran.', heroText:'Buat Payment Link, bagikan ke mana saja, terima pembayaran melalui gateway yang aktif, lalu kelola saldo dan penarikan dari satu platform.', start:'Mulai Sekarang', seePlatform:'Lihat Platform', point1:'Payment Link siap dibagikan', point2:'Checkout terverifikasi', point3:'Mobile friendly', qrBadge:'PAYMENT · PLATFORM · WITHDRAW',
      aboutKicker:'TENTANG SHOWLINK', aboutTitle:'Platform pembayaran yang dibuat untuk jualan digital.', aboutText:'Dari membuat link, buyer membayar, sampai saldo siap dikelola — semuanya dibuat dalam satu pengalaman yang sederhana dan premium.', detailLabel:'SHOWLINK EXPERIENCE', detailTitle:'Satu platform. Satu alur. Lebih mudah menjual.', detailText:'Gunakan Payment Link sebagai pintu masuk pembayaran, berikan pengalaman checkout yang rapi, dan kelola hasil penjualan dari dashboard ShowLink.', detail1:'Buat Payment Link dalam beberapa langkah.', detail2:'Buyer memilih metode pembayaran yang tersedia.', detail3:'Pantau order, saldo, settlement, dan withdraw.', learnMore:'Pelajari tentang ShowLink',
      workflowKicker:'ALUR PEMBAYARAN', workflowTitle:'Dari link sampai saldo, semuanya terlihat jelas.', workflowText:'Gunakan visual platform di bawah untuk menunjukkan pengalaman Payment Link, checkout, balance, dan payout.', capPayment:'Buat dan bagikan link pembayaran.', capCheckout:'Pengalaman pembayaran yang sederhana.', capBalance:'Pantau saldo dan settlement.', capGlobal:'Tujuan penarikan lokal dan internasional.',
      paymentKicker:'PAYMENT & WITHDRAW', paymentTitle:'Banyak pilihan metode, satu pengalaman premium.', paymentText:'Logo bank dan e-wallet di bawah adalah showcase metode. Metode yang benar-benar dapat diproses tetap mengikuti gateway/provider yang aktif.', bankTitle:'Bank', bankSub:'Bank transfer & local banking', walletTitle:'E-wallet & Global', walletSub:'Digital wallet, QR & international methods',
      withdrawKicker:'WITHDRAW', withdrawTitle:'Saldo masuk, penarikan tetap sederhana.', withdrawText:'Tampilkan tujuan penarikan bank atau e-wallet lokal maupun internasional. Provider payout yang aktif menentukan metode yang benar-benar dapat diproses.', localBank:'Bank Lokal', localWallet:'E-wallet Lokal', globalBank:'International', withdrawNote:'Dukungan payout bergantung pada provider/gateway yang dikonfigurasi di platform.',
      ctaTitle:'Mulai menerima pembayaran dengan Payment Link.', ctaText:'Buat akun dan bangun pengalaman checkout yang terlihat profesional dari link pertama kamu.', cta:'Buat Payment Link', disclaimer:'Metode pembayaran dan payout pada website adalah showcase; ketersediaan transaksi mengikuti gateway/provider yang aktif.'
    },
    en: {
      heroBadge:'SHOWLINK · PAYMENT PLATFORM', heroTitle:'One link to', heroAccent:'accept payments.', heroText:'Create a Payment Link, share it anywhere, accept payments through active gateways, then manage your balance and withdrawals from one platform.', start:'Get Started', seePlatform:'View Platform', point1:'Payment Link ready to share', point2:'Verified checkout', point3:'Mobile friendly', qrBadge:'PAYMENT · PLATFORM · WITHDRAW',
      aboutKicker:'ABOUT SHOWLINK', aboutTitle:'A payment platform built for digital selling.', aboutText:'From creating a link and collecting payment to managing your balance — everything lives in one simple, premium experience.', detailLabel:'SHOWLINK EXPERIENCE', detailTitle:'One platform. One flow. Easier selling.', detailText:'Use Payment Link as the payment entry point, give buyers a polished checkout experience, and manage your sales from the ShowLink dashboard.', detail1:'Create a Payment Link in a few steps.', detail2:'Buyers choose an available payment method.', detail3:'Track orders, balance, settlement, and withdrawals.', learnMore:'Learn about ShowLink',
      workflowKicker:'PAYMENT FLOW', workflowTitle:'From link to balance, everything stays clear.', workflowText:'Use the platform visuals below to showcase Payment Link, checkout, balance, and payout experiences.', capPayment:'Create and share a payment link.', capCheckout:'A simple payment experience.', capBalance:'Monitor balance and settlement.', capGlobal:'Local and international withdrawal destinations.',
      paymentKicker:'PAYMENT & WITHDRAW', paymentTitle:'More methods, one premium experience.', paymentText:'The bank and e-wallet logos below are a showcase. Actual transaction availability depends on the active gateway/provider.', bankTitle:'Banks', bankSub:'Bank transfer & local banking', walletTitle:'E-wallet & Global', walletSub:'Digital wallet, QR & international methods',
      withdrawKicker:'WITHDRAW', withdrawTitle:'Money in, withdrawals kept simple.', withdrawText:'Support bank or e-wallet withdrawal destinations locally and internationally. The active payout provider determines what can actually be processed.', localBank:'Local Bank', localWallet:'Local E-wallet', globalBank:'International', withdrawNote:'Payout support depends on the provider/gateway configured on the platform.',
      ctaTitle:'Start accepting payments with Payment Link.', ctaText:'Create an account and build a professional checkout experience from your very first link.', cta:'Create Payment Link', disclaimer:'Payment and payout methods shown on this website are showcase content; actual availability follows the active gateway/provider.'
    }
  };

  function getLang() {
    try { return localStorage.getItem('showlink-language') === 'en' ? 'en' : 'id'; } catch (_) { return 'id'; }
  }

  function translate() {
    const lang = getLang();
    document.documentElement.lang = lang;
    const dict = copy[lang];
    document.querySelectorAll('[data-index-i18n]').forEach(el => {
      const key = el.dataset.indexI18n;
      if (dict[key]) el.textContent = dict[key];
    });
  }

  document.addEventListener('DOMContentLoaded', translate);
  window.addEventListener('showlink:language-change', translate);
  window.addEventListener('storage', e => {
    if (e.key === 'showlink-language') translate();
  });
})();
