(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const PAGE_SIZE = 5;
  const translations = {
    id: {
      kicker: 'SHOWLINK · DIREKTORI TAUTAN', title: 'Semua tautan publik',
      description: 'Temukan Shortlink, PasteLink, dan Payment Link yang dibagikan secara publik.',
      totalViews: 'Total view', allLinks: 'All Link', top10: 'Top 10 Link', newLinks: 'New Link',
      back: 'Kembali ke Dashboard', loading: 'Memuat tautan publik…',
      empty: 'Belum ada tautan publik untuk kategori ini.',
      error: 'Gagal memuat tautan publik. Periksa konfigurasi database dan fungsi direktori yang sudah ada.',
      open: 'Buka tautan', views: 'view', sold: 'Terjual', adViews: 'View iklan',
      shortPayments: 'Pembayaran Shortlink', unavailable: 'Belum tersedia',
      page: 'Halaman', of: 'dari', prev: 'Sebelumnya', next: 'Berikutnya',
      shortlink: 'Shortlink', pastelink: 'PasteLink', paymentlink: 'Payment Link',
      allTitle: 'All Link', topTitle: 'Top 10 Link', newTitle: 'New Link',
      links: 'tautan', viewStat: 'Total view', soldStat: 'Total terjual',
      shortPaymentsStat: 'Total pembayaran Shortlink',
      unavailableNote: 'Belum terhubung ke pencatatan iklan/pembayaran Shortlink.',
      noDate: 'Tanggal tidak tersedia', seeAll: 'Lihat semua', categoryLinks: 'tautan', categoryViews: 'total view'
    },
    en: {
      kicker: 'SHOWLINK · LINK DIRECTORY', title: 'All Public Links',
      description: 'Discover public Shortlinks, PasteLinks, and Payment Links.',
      totalViews: 'Total views', allLinks: 'All Link', top10: 'Top 10 Link', newLinks: 'New Link',
      back: 'Back to Dashboard', loading: 'Loading public links…',
      empty: 'There are no public links in this category yet.',
      error: 'Could not load public links. Check the existing database configuration and directory RPC.',
      open: 'Open link', views: 'views', sold: 'Sold', adViews: 'Ad views',
      shortPayments: 'Shortlink payments', unavailable: 'Not available yet',
      page: 'Page', of: 'of', prev: 'Previous', next: 'Next',
      shortlink: 'Shortlink', pastelink: 'PasteLink', paymentlink: 'Payment Link',
      allTitle: 'All Link', topTitle: 'Top 10 Link', newTitle: 'New Link',
      links: 'links', viewStat: 'Total views', soldStat: 'Total sold',
      shortPaymentsStat: 'Total Shortlink payments',
      unavailableNote: 'Shortlink ad/payment tracking is not connected yet.',
      noDate: 'Date unavailable', seeAll: 'View all', categoryLinks: 'links', categoryViews: 'total views'
    }
  };
  const state = { rows: [], filter: 'all', page: 1, categoryPages: { pastelink: 1, paymentlink: 1, shortlink: 1 } };
  const lang = () => {
    const value = localStorage.getItem('showlink_language') ||
      localStorage.getItem('showlink-language') || localStorage.getItem('language') ||
      document.documentElement.lang || 'id';
    return /^en/i.test(value) ? 'en' : 'id';
  };
  const typeKey = (row) => {
    const type = String(row.type || '').toLowerCase().replace(/[^a-z]/g, '');
    if (type.includes('short')) return 'shortlink';
    if (type.includes('paste')) return 'pastelink';
    return 'paymentlink';
  };
  const typeOrder = { shortlink: 0, pastelink: 1, paymentlink: 2 };
  const number = (value) => Math.max(0, Number(value) || 0);
  const formatted = (value) => number(value).toLocaleString(lang() === 'en' ? 'en-US' : 'id-ID');

  function applyLanguage() {
    const dictionary = translations[lang()];
    document.documentElement.lang = lang();
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      if (dictionary[key]) element.textContent = dictionary[key];
    });
  }

  function getRows() {
    let rows = [...state.rows];
    if (['pastelink', 'shortlink', 'paymentlink'].includes(state.filter)) {
      rows = rows.filter((row) => typeKey(row) === state.filter);
    }
    if (state.filter === 'top10') {
      return rows.sort((a, b) => number(b.views) - number(a.views) ||
        new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10);
    }
    if (state.filter === 'new') {
      return rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return rows.sort((a, b) => typeOrder[typeKey(a)] - typeOrder[typeKey(b)] ||
      new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  function titleForFilter() {
    const dictionary = translations[lang()];
    return ({
      all: dictionary.allTitle, pastelink: dictionary.pastelink, shortlink: dictionary.shortlink,
      paymentlink: dictionary.paymentlink, top10: dictionary.topTitle, new: dictionary.newTitle
    })[state.filter] || dictionary.allTitle;
  }

  function renderStats(rows) {
    const dictionary = translations[lang()];
    const stats = $('#directory-stats');
    if (!stats) return;
    document.querySelectorAll('.directory-stats-note').forEach((note) => note.remove());
    const views = rows.reduce((sum, row) => sum + number(row.views), 0);
    let cards = [];
    if (state.filter === 'paymentlink') {
      const sold = rows.reduce((sum, row) => sum + number(row.sales_count), 0);
      cards = [
        [dictionary.viewStat, formatted(views), 'fa-eye'],
        [dictionary.soldStat, formatted(sold), 'fa-bag-shopping']
      ];
    } else if (state.filter === 'shortlink') {
      cards = [
        [dictionary.viewStat, formatted(views), 'fa-eye'],
        [dictionary.adViews, dictionary.unavailable, 'fa-rectangle-ad'],
        [dictionary.shortPaymentsStat, dictionary.unavailable, 'fa-money-bill-transfer']
      ];
    } else if (state.filter === 'pastelink') {
      cards = [[dictionary.viewStat, formatted(views), 'fa-eye']];
    } else {
      cards = [[dictionary.viewStat, formatted(views), 'fa-eye']];
    }
    stats.innerHTML = cards.map(([label, value, icon]) =>
      `<div class="directory-stat-card"><span class="directory-stat-icon"><i class="fa-solid ${icon}"></i></span><span class="directory-stat-copy"><small>${esc(label)}</small><strong>${esc(value)}</strong></span></div>`
    ).join('');
    if (state.filter === 'shortlink') {
      stats.insertAdjacentHTML('afterend', `<p class="directory-stats-note">${esc(dictionary.unavailableNote)}</p>`);
    }
  }

  function renderLinkCard(row) {
    const dictionary = translations[lang()];
    const key = typeKey(row);
    const views = number(row.views);
    const date = row.created_at
      ? new Date(row.created_at).toLocaleDateString(lang() === 'en' ? 'en-US' : 'id-ID',
          { year: 'numeric', month: 'short', day: 'numeric' })
      : dictionary.noDate;
    const extraMetric = key === 'paymentlink'
      ? `<span><i class="fa-solid fa-bag-shopping"></i> ${esc(dictionary.sold)}: ${formatted(row.sales_count)}</span>`
      : '';
    const url = String(row.url || '#');
    return `<article class="public-link-item">
      <div class="directory-item-icon ${key}"><i class="fa-solid ${key === 'shortlink' ? 'fa-link' : key === 'pastelink' ? 'fa-file-lines' : 'fa-credit-card'}"></i></div>
      <div class="directory-item-main">
        <div class="directory-item-meta"><span class="public-link-type ${key}">${esc(dictionary[key])}</span><span class="directory-created">${esc(date)}</span></div>
        <strong class="directory-item-title">${esc(row.title || row.slug || dictionary[key])}</strong>
        <div class="directory-item-stats"><span><i class="fa-solid fa-eye"></i> ${formatted(views)} ${esc(dictionary.views)}</span>${extraMetric}</div>
        <a class="directory-open-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(dictionary.open)} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>
      </div>
    </article>`;
  }

  function render() {
    const dictionary = translations[lang()];
    const rows = getRows();
    const list = $('#public-links-list');
    const pager = $('#public-links-pagination');
    $('#directory-section-title').textContent = titleForFilter();
    $('#directory-page-summary').textContent = rows.length
      ? `${rows.length.toLocaleString(lang() === 'en' ? 'en-US' : 'id-ID')} ${dictionary.links}` : '';
    renderStats(rows);

    // The All view is intentionally grouped by link type so unrelated links never mix.
    if (state.filter === 'all') {
      const categories = [
        { key: 'pastelink', icon: 'fa-file-lines' },
        { key: 'paymentlink', icon: 'fa-credit-card' },
        { key: 'shortlink', icon: 'fa-link' }
      ];
      const sections = categories.map(({ key, icon }) => {
        const items = state.rows.filter((row) => typeKey(row) === key)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const totalViews = items.reduce((sum, row) => sum + number(row.views), 0);
        const categoryPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        const categoryPage = Math.min(state.categoryPages[key] || 1, categoryPages);
        state.categoryPages[key] = categoryPage;
        const preview = items.slice((categoryPage - 1) * PAGE_SIZE, categoryPage * PAGE_SIZE);
        const emptyText = dictionary.empty;
        const pageControls = categoryPages > 1 ? `<nav class="directory-category-pagination" aria-label="${esc(dictionary[key])} pagination">
          <button type="button" class="directory-page-arrow" data-category-page="${key}" data-page="${categoryPage - 1}" ${categoryPage === 1 ? 'disabled' : ''} aria-label="${esc(dictionary.prev)}"><i class="fa-solid fa-chevron-left"></i><span>${esc(dictionary.prev)}</span></button>
          <div class="directory-page-numbers">${Array.from({ length: categoryPages }, (_, index) => index + 1).map(pageNumber => `<button type="button" class="directory-page-number ${pageNumber === categoryPage ? 'is-current' : ''}" data-category-page="${key}" data-page="${pageNumber}" ${pageNumber === categoryPage ? 'aria-current="page"' : ''}>${pageNumber}</button>`).join('')}</div>
          <button type="button" class="directory-page-arrow" data-category-page="${key}" data-page="${categoryPage + 1}" ${categoryPage === categoryPages ? 'disabled' : ''} aria-label="${esc(dictionary.next)}"><span>${esc(dictionary.next)}</span><i class="fa-solid fa-chevron-right"></i></button>
        </nav>` : '';
        return `<section class="directory-category-section ${key}">
          <header class="directory-category-heading">
            <div class="directory-category-title-wrap">
              <span class="directory-category-icon ${key}"><i class="fa-solid ${icon}"></i></span>
              <div><h3>${esc(dictionary[key])}</h3><p>${items.length.toLocaleString(lang() === 'en' ? 'en-US' : 'id-ID')} ${esc(dictionary.categoryLinks)} <span aria-hidden="true">·</span> ${formatted(totalViews)} ${esc(dictionary.categoryViews)}</p></div>
            </div>
            ${items.length ? `<button type="button" class="directory-see-all" data-filter="${key}">${esc(dictionary.seeAll)} <i class="fa-solid fa-arrow-right"></i></button>` : ''}
          </header>
          <div class="public-links-list directory-category-list">${preview.length ? preview.map(renderLinkCard).join('') : `<div class="directory-empty directory-category-empty"><i class="fa-regular fa-folder-open"></i><p>${esc(emptyText)}</p></div>`}</div>
          ${pageControls}
        </section>`;
      });
      list.innerHTML = sections.join('');
      pager.innerHTML = '';
      return;
    }

    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const shown = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    if (!shown.length) {
      list.innerHTML = `<div class="directory-empty"><i class="fa-regular fa-folder-open"></i><p>${esc(dictionary.empty)}</p></div>`;
      pager.innerHTML = '';
      return;
    }
    list.innerHTML = shown.map(renderLinkCard).join('');
    if (pages <= 1) {
      pager.innerHTML = '';
      return;
    }
    pager.innerHTML = `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> ${esc(dictionary.prev)}</button><span>${esc(dictionary.page)} ${state.page} ${esc(dictionary.of)} ${pages}</span><button type="button" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>${esc(dictionary.next)} <i class="fa-solid fa-chevron-right"></i></button>`;
  }

  async function load() {
    applyLanguage();
    const dictionary = translations[lang()];
    const status = $('#public-links-status');
    const list = $('#public-links-list');
    status.textContent = dictionary.loading;
    list.innerHTML = '';
    try {
      if (!window.ShowLinkSupabase || typeof window.ShowLinkSupabase.load !== 'function') {
        throw new Error('Supabase client helper is unavailable');
      }
      const client = await window.ShowLinkSupabase.load();
      const { data, error } = await client.rpc('get_all_public_links');
      if (error) throw error;
      state.rows = Array.isArray(data) ? data : (Array.isArray(data?.links) ? data.links : []);
      $('#public-links-total-views').textContent = formatted(state.rows.reduce((sum, row) => sum + number(row.views), 0));
      status.textContent = `${state.rows.length.toLocaleString(lang() === 'en' ? 'en-US' : 'id-ID')} ${lang() === 'en' ? 'public links' : 'tautan publik'}`;
      render();
    } catch (error) {
      status.textContent = dictionary.error;
      list.innerHTML = '';
      $('#directory-stats').innerHTML = '';
      $('#directory-pagination')?.replaceChildren();
      $('#public-links-pagination').innerHTML = '';
      console.error('[ShowLink All Public Links]', error);
    }
  }

  document.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      state.filter = filter.dataset.filter;
      state.page = 1;
      document.querySelectorAll('.directory-filter').forEach((button) =>
        button.classList.toggle('is-active', button.dataset.filter === state.filter));
      render();
      return;
    }
    const categoryPage = event.target.closest('[data-category-page][data-page]');
    if (categoryPage && !categoryPage.disabled) {
      const key = categoryPage.dataset.categoryPage;
      if (Object.prototype.hasOwnProperty.call(state.categoryPages, key)) {
        state.categoryPages[key] = Number(categoryPage.dataset.page);
        render();
        categoryPage.closest('.directory-category-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const page = event.target.closest('#public-links-pagination [data-page]');
    if (page && !page.disabled) {
      state.page = Number(page.dataset.page);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  document.addEventListener('DOMContentLoaded', load);
  window.addEventListener('storage', load);
  document.addEventListener('showlink:language-changed', () => { applyLanguage(); render(); });
})();
