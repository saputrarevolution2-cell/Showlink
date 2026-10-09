/* ShowLink Shortlink — page-specific bilingual Coming Soon behavior */
(() => {
  const translations = {
    id: { kicker:'SHOWLINK LAB · SEDANG DIKERJAKAN', title:'Shortlink <span class="cs-gradient">Segera Hadir!</span>', description:'Tautan pendek yang praktis akan segera hadir.', status:'Tim kami sedang menyiapkan sesuatu yang keren.', progress:'Progres pengerjaan', step1:'Desain', step2:'Pengembangan', step3:'Pengujian', back:'Kembali ke Dashboard', caption:'Dibuat dengan penuh semangat!', footnote:'Terima kasih sudah menunggu. Kami sedang bekerja untukmu!' },
    en: { kicker:'SHOWLINK LAB · UNDER CONSTRUCTION', title:'Shortlink <span class="cs-gradient">Coming Soon!</span>', description:'Short, simple links are on their way.', status:'Our team is preparing something awesome.', progress:'Development progress', step1:'Design', step2:'Development', step3:'Testing', back:'Back to Dashboard', caption:'Made with lots of love!', footnote:'Thanks for your patience. We are working for you!' }
  };
  const applyLanguage = () => {
    let lang = localStorage.getItem('showlink_language') || localStorage.getItem('language') || localStorage.getItem('sl-language') || document.documentElement.lang || 'id';
    lang = String(lang).toLowerCase().startsWith('en') || lang === 'english' ? 'en' : 'id';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) el.innerHTML = translations[lang][key];
    });
  };
  document.addEventListener('DOMContentLoaded', applyLanguage);
  window.addEventListener('storage', applyLanguage);
  document.addEventListener('showlink:language-changed', applyLanguage);
  applyLanguage();
})();
