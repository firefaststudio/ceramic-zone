// copied from public/scripts.js

// Persisted theme, banner control, fetch news, and contact POST

// Theme
const themeToggle = document.getElementById('theme-toggle');
(function initTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.body.classList.add('dark-mode');
    themeToggle && (themeToggle.textContent = document.body.classList.contains('dark-mode') ? '\u2600\ufe0f' : '\ud83c\udf19');
    themeToggle && themeToggle.setAttribute('aria-pressed', document.body.classList.contains('dark-mode'));
  } catch (e) { }
})();

// ...rest of JS omitted for brevity; copied from public/scripts.js ...

// --- News loader (mock-backed) ---
document.addEventListener('DOMContentLoaded', () => {
  // existing DOMContentLoaded logic may run before; ensure we call loadNews as well
  try { loadNews(); } catch (e) { /* ignore */ }
});

async function loadNews() {
  // Support both legacy #news-list and new #news-grid
  const legacy = document.getElementById('news-list');
  const grid = document.getElementById('news-grid');
  if (!legacy && !grid) return;
  try {
    const res = await fetch('/api/news', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

    if (legacy) {
      renderNews(legacy, items);
    }

    if (grid) {
      grid.innerHTML = '';
      const frag = document.createDocumentFragment();
      items.forEach(item => {
        const a = document.createElement('article');
        a.className = 'card reveal';
        a.innerHTML = `
          <h3 class="card__title">${escapeHTML(item.title || 'Aggiornamento')}</h3>
          <p class="card__subtitle">${escapeHTML(item.subtitle || item.excerpt || '')}</p>
          <p>${escapeHTML(item.summary || item.excerpt || '')}</p>
          <div class="card__actions">
            <a href="${escapeAttr(item.url || '#')}" class="btn btn--ghost" target="_blank">Leggi</a>
          </div>
        `;
        frag.appendChild(a);
      });
      grid.appendChild(frag);
    }
  } catch (err) {
    if (legacy) renderNews(legacy, [], err);
    if (grid) grid.innerHTML = `<p>Impossibile caricare le novità al momento.</p>`;
    console.error('Errore caricamento news:', err);
  }
}

function renderNews(container, items, error) {
  container.innerHTML = '';
  if (error) {
    container.innerHTML = `
      <article class="card">
        <h3>Errore di caricamento</h3>
        <p class="error">Impossibile caricare le novità. Riprova più tardi.</p>
      </article>`;
    return;
  }
  if (!items.length) {
    container.innerHTML = `
      <article class="card">
        <h3>Nessuna novità</h3>
        <p>Torni a trovarci presto: stiamo preparando aggiornamenti importanti.</p>
      </article>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach((item) => {
    const a = document.createElement('a');
    a.className = 'card card-news';
    a.href = item.url || '#';
    if (a.href && !a.href.startsWith('#')) {
      a.target = '_blank'; a.rel = 'noopener';
    }
    a.innerHTML = `
      <figure class="media">
        ${item.image ? `<img src="${escapeAttr(item.image)}" alt="${escapeHTML(item.title || '')}" loading="lazy" width="400" height="240" decoding="async">` : ''}
      </figure>
      <h3>${escapeHTML(item.title || 'Aggiornamento')}</h3>
      <p class="excerpt">${escapeHTML(item.excerpt || '')}</p>
      <div class="meta">
        <time datetime="${escapeAttr(item.date || '')}">${formatDate(item.date)}</time>
        <span class="spacer"></span>
        <span class="cta">Leggi</span>
      </div>
    `;
    frag.appendChild(a);
  });
  container.appendChild(frag);
}

function formatDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHTML(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(str) {
  return String(str || '').replaceAll('"', '&quot;');
}

// --- Reveal on scroll (IntersectionObserver) ---
(() => {
  try {
    const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!revealEls || revealEls.length === 0) return;
    const io = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } catch (e) {
    // graceful degradation: do nothing if APIs not available
  }
})();

// --- Fade-in-up elements: add .animate when entering viewport ---
(function () {
  try {
    const elems = document.querySelectorAll('.fade-in-up');
    if (!elems || elems.length === 0) return;
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elems.forEach(el => io.observe(el));
  } catch (e) {
    // ignore if not supported
  }
})();

/* === Paginated / lazy-loading news === */
let __news_offset = 0;
const __news_limit = 3; // small chunks for demo
let __news_category = 'all';
let __news_query = '';
let __news_sort = 'date_desc';

function savePreferences() {
  try {
    const prefs = {
      category: __news_category,
      query: __news_query,
      sort: __news_sort
    };
    localStorage.setItem('newsPrefs', JSON.stringify(prefs));
  } catch (e) { /* ignore */ }
}

function loadPreferences() {
  try {
    const saved = localStorage.getItem('newsPrefs');
    if (!saved) return;
    const prefs = JSON.parse(saved);
    __news_category = prefs.category || 'all';
    __news_query = prefs.query || '';
    __news_sort = prefs.sort || 'date_desc';
  } catch (e) { /* ignore */ }
}

async function loadNewsChunk(reset = false) {
  const grid = document.getElementById('news-grid');
  const loadMoreBtn = document.getElementById('load-more');
  if (!grid) return;
  try {
    if (reset) {
      __news_offset = 0;
      // show skeletons while fetching
      showSkeletons(__news_limit);
      if (loadMoreBtn) loadMoreBtn.style.display = 'inline-flex';
    }

    const q = new URLSearchParams({ limit: String(__news_limit), offset: String(__news_offset) });
    if (__news_category && __news_category !== 'all') q.set('category', __news_category);
    if (__news_query) q.set('q', __news_query);
    if (__news_sort) q.set('sort', __news_sort);
    const res = await fetch(`/api/news?${q.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);

    const frag = document.createDocumentFragment();
    items.forEach(item => {
      const article = document.createElement('article');
      article.className = 'card-neo reveal';
      article.setAttribute('role', 'article');
      const imgHtml = item.image ? `<img src="${escapeAttr(item.image)}" alt="${escapeHTML(item.title || 'Immagine dell\'articolo')}" loading="lazy" width="400" height="240">` : '';
      const badgeHtml = item.category ? `<span class="card-neo__badge">${escapeHTML(item.category)}</span>` : '';
      const url = escapeAttr(item.url || '#');
      const isExternal = url && !url.startsWith('#') && !url.startsWith(window.location.origin);
      article.innerHTML = `
        <div class="card-neo__image">
          ${imgHtml}
          ${badgeHtml}
        </div>
        <div class="card-neo__body">
          <h3 class="card-neo__title">${escapeHTML(item.title || 'Aggiornamento')}</h3>
          <p class="card-neo__excerpt">${escapeHTML(item.excerpt || item.summary || '')}</p>
          <div class="card-neo__actions">
            <a href="${url}" class="card-neo__btn" ${isExternal ? 'target="_blank" rel="noopener"' : ''} aria-label="Apri: ${escapeHTML(item.title || 'Articolo')}">Leggi</a>
          </div>
        </div>
      `;
      frag.appendChild(article);
    });
    // remove only skeleton placeholders (server or client) before appending real content
    const placeholders = grid.querySelectorAll('.skeleton');
    placeholders.forEach(p => p.remove());
    grid.appendChild(frag);

    __news_offset += items.length;

    if (items.length < __news_limit && loadMoreBtn) {
      loadMoreBtn.style.display = 'none';
    }
  } catch (err) {
    console.error('Errore caricamento news chunk:', err);
    if (document.getElementById('news-grid')) document.getElementById('news-grid').innerHTML = `<p>Impossibile caricare le novità al momento.</p>`;
  }
}

function showSkeletons(count = 3) {
  const grid = document.getElementById('news-grid');
  if (!grid) return;
  // If server-rendered skeletons exist already, avoid duplicating them
  if (grid.querySelectorAll('.skeleton').length >= count) return;
  for (let i = 0; i < count; i++) {
    const skel = document.createElement('div');
    skel.className = 'card skeleton';
    skel.innerHTML = `
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
    `;
    grid.appendChild(skel);
  }
}

function updateSortIndicator() {
  const map = {
    date_desc: ' (più recenti)',
    date_asc: ' (più vecchie)',
    popularity: ' (più popolari)'
  };
  const el = document.getElementById('sort-indicator');
  if (el) el.textContent = map[__news_sort] || '';
}

// init paginated loading on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Load saved preferences and update UI
    loadPreferences();

    // update UI according to prefs
    const savedFilterBtn = document.querySelector(`#news-filters button[data-category="${__news_category}"]`);
    if (savedFilterBtn) {
      document.querySelectorAll('#news-filters button').forEach(b => b.classList.remove('active'));
      savedFilterBtn.classList.add('active');
    }
    const searchInputEl = document.getElementById('news-search');
    if (searchInputEl) searchInputEl.value = __news_query || '';
    const sortSelectEl = document.getElementById('news-sort');
    if (sortSelectEl) sortSelectEl.value = __news_sort || 'date_desc';
    // update visible sort indicator
    updateSortIndicator();

    // load initial chunk if grid exists
    if (document.getElementById('news-grid')) loadNewsChunk(true);
    const btn = document.getElementById('load-more');
    if (btn) btn.addEventListener('click', () => { loadNewsChunk(); savePreferences(); });

    // filter buttons
    const filters = document.getElementById('news-filters');
    if (filters) {
      filters.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-category]');
        if (!btn) return;
        // toggle active
        filters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        __news_category = String(btn.dataset.category || 'all');
        savePreferences();
        // reset and load
        loadNewsChunk(true);
      });
    }

    // search input (debounced)
    function debounce(fn, delay) {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    }

    const searchInput = document.getElementById('news-search');
    if (searchInput) {
      const onSearch = debounce(() => {
        __news_query = searchInput.value.trim();
        savePreferences();
        loadNewsChunk(true);
      }, 300);
      searchInput.addEventListener('input', onSearch);
    }

    // sort selector
    const sortSelect = document.getElementById('news-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        __news_sort = String(e.target.value || 'date_desc');
        savePreferences();
        updateSortIndicator();
        loadNewsChunk(true);
      });
    }

    // sentinel lazy-load
    const sentinel = document.getElementById('news-sentinel');
    if (sentinel && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) loadNewsChunk();
      }, { rootMargin: '200px' });
      io.observe(sentinel);
    }
  } catch (e) { }
});

