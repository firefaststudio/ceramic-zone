// Helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ===== Ricerca: suggerimenti + accessibilità ===== */
const searchInput = $('#search-input');
const suggest = $('#search-suggest');
const form = $('#site-search');
const sampleSuggestions = [
  'Piastrelle 60×60', 'Grandi lastre', 'Rivestimento bagno lucido',
  'Pavimenti outdoor 20mm', 'Mosaico cucina', 'Accessori manutenzione'
];
let activeIndex = -1;

function openSuggest() {
  suggest.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
}
function closeSuggest() {
  suggest.hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
  activeIndex = -1;
  $$('li', suggest).forEach(li => li.setAttribute('aria-selected', 'false'));
}
function renderSuggestions(filter = '') {
  const items = sampleSuggestions
    .filter(s => s.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, 8);
  suggest.innerHTML = items.map((s, i) => `<li role="option" id="sug-${i}" aria-selected="false">${s}</li>`).join('');
}

if (searchInput) {
  form.addEventListener('submit', (e) => {
    // Collega al backend o lascia submit nativo
    // e.preventDefault();
  });

  searchInput.addEventListener('input', (e) => {
    const v = e.target.value.trim();
    renderSuggestions(v);
    if (v.length) openSuggest(); else closeSuggest();
  });

  searchInput.addEventListener('keydown', (e) => {
    const items = $$('li', suggest);
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        searchInput.value = items[activeIndex].textContent;
        closeSuggest();
        form.submit();
      }
    } else if (e.key === 'Escape') {
      closeSuggest();
    }
    items.forEach((li, i) => li.setAttribute('aria-selected', String(i === activeIndex)));
  });

  suggest.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    searchInput.value = li.textContent;
    closeSuggest();
    form.submit();
  });

  document.addEventListener('click', (e) => {
    if (!suggest.hidden && !suggest.contains(e.target) && e.target !== searchInput) {
      closeSuggest();
    }
  });
}

/* ===== Mega menu categorie ===== */
const allDeptsBtn = $('#all-depts');
const mega = $('#mega-depts');

if (allDeptsBtn && mega) {
  allDeptsBtn.addEventListener('click', () => {
    const expanded = allDeptsBtn.getAttribute('aria-expanded') === 'true';
    allDeptsBtn.setAttribute('aria-expanded', String(!expanded));
    mega.hidden = expanded;
  });

  document.addEventListener('click', (e) => {
    if (e.target === allDeptsBtn || allDeptsBtn.contains(e.target)) return;
    if (!mega.hidden && !mega.contains(e.target)) {
      allDeptsBtn.setAttribute('aria-expanded', 'false');
      mega.hidden = true;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mega.hidden) {
      allDeptsBtn.setAttribute('aria-expanded', 'false');
      mega.hidden = true;
    }
  });
}

/* ===== Drawer mobile ===== */
const burger = $('.hz-burger');
const drawer = $('#nav-drawer');
const drawerClose = $('.hz-drawer__close', drawer);
const backdrop = $('.hz-drawer__backdrop', drawer);

function setDrawer(open) {
  drawer.setAttribute('aria-hidden', String(!open));
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
}
if (burger && drawer) {
  burger.addEventListener('click', () => setDrawer(drawer.getAttribute('aria-hidden') === 'true'));
  drawerClose.addEventListener('click', () => setDrawer(false));
  backdrop.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false) });
}

/* ===== Carosello hero ===== */
const slides = $$('.hz-hero__slide');
const dotsWrap = $('.hz-hero__dots');
const prevBtn = $('.hz-hero__prev');
const nextBtn = $('.hz-hero__next');

let current = 0;
function goTo(i) {
  slides[current].classList.remove('is-active');
  current = (i + slides.length) % slides.length;
  slides[current].classList.add('is-active');

  if (dotsWrap) {
    $$('.hz-hero__dots button', dotsWrap).forEach((b, idx) => {
      b.setAttribute('aria-selected', String(idx === current));
    });
  }
}
function next() { goTo(current + 1) }
function prev() { goTo(current - 1) }

if (slides.length) {
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Vai alla slide ${i + 1}`);
    b.setAttribute('aria-selected', String(i === 0));
    b.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(b);
  });
  let timer = setInterval(next, 5000);
  [prevBtn, nextBtn].forEach(btn => btn && btn.addEventListener('click', () => {
    clearInterval(timer); timer = setInterval(next, 5000);
  }));
}

/* ===== Righe orizzontali: frecce scroll ===== */
$$('[data-row]').forEach(viewport => {
  const track = $('.hz-row__track', viewport);
  const prev = $('.hz-row__nav.prev', viewport);
  const next = $('.hz-row__nav.next', viewport);
  const step = 280; // px per step
  prev.addEventListener('click', () => track.scrollBy({ left: -step, behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: +step, behavior: 'smooth' }));
});

/* ===== Carrello fake ===== */
$$('[data-add-cart]').forEach(btn => {
  btn.addEventListener('click', () => {
    const c = document.getElementById('cart-count');
    c.textContent = String(parseInt(c.textContent || '0', 10) + 1);
  });
});

/* ===== Back to top ===== */
$('#back-to-top')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
