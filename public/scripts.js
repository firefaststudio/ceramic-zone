// Persisted theme, banner control, fetch news, and contact POST

// Theme
const themeToggle = document.getElementById('theme-toggle');
(function initTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.body.classList.add('dark-mode');
    themeToggle && (themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙');
    themeToggle && themeToggle.setAttribute('aria-pressed', document.body.classList.contains('dark-mode'));
  } catch (e) { }
})();

themeToggle && themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) { }
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-pressed', isDark);
});

// Banner control
const banner = document.getElementById('welcome-banner');
const bannerClose = document.getElementById('banner-close');
(function initBanner() {
  try {
    const hide = localStorage.getItem('banner-hidden');
    if (hide === '1' && banner) banner.style.display = 'none';
  } catch (e) { }
})();
bannerClose && bannerClose.addEventListener('click', () => {
  if (banner) banner.style.display = 'none';
  try { localStorage.setItem('banner-hidden', '1'); } catch (e) { }
});

// Fetch news with timeout and fallback
async function fetchWithTimeout(url, ms = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error('Network response not ok');
    return res.json();
  } catch (e) { clearTimeout(id); throw e; }
}

(async function loadNews() {
  const container = document.getElementById('news-container');
  try {
    const data = await fetchWithTimeout('/api/news');
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<p>Nessuna novità disponibile</p>';
      return;
    }
    container.innerHTML = data.map(item => `
      <article>
        <h3>${escapeHtml(item.titolo || '')}</h3>
        <p>${escapeHtml(item.testo || '')}</p>
        <small>${escapeHtml(item.data || '')}</small>
      </article>
    `).join('');
  } catch (e) {
    container.innerHTML = '<p>Nessuna novità disponibile</p>';
  }
})();

// Contact form submit (POST to /api/contact)
const contactForm = document.getElementById('contact-form');
const feedback = document.getElementById('contact-feedback');
contactForm && contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();
  if (!email || !/.+@.+\..+/.test(email)) {
    showFeedback('Inserisci una email valida', 'error');
    return;
  }
  try {
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, message }) });
    if (!res.ok) throw new Error('Network error');
    showFeedback('Messaggio inviato con successo!', 'success');
    contactForm.reset();
  } catch (e) {
    showFeedback('Errore durante l\'invio. Riprova più tardi', 'error');
  }
});

function showFeedback(msg, type) {
  if (!feedback) return;
  feedback.className = '';
  feedback.classList.add(type === 'error' ? 'error' : 'success');
  feedback.textContent = msg;
  feedback.classList.remove('visually-hidden');
  setTimeout(() => feedback.classList.add('visually-hidden'), 5000);
}

function escapeHtml(unsafe) {
  return String(unsafe).replace(/[&<>"]+/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m] || m);
  });
}

// optional: reset feedback on reset
const resetBtn = document.getElementById('contact-reset');
resetBtn && resetBtn.addEventListener('click', () => { if (feedback) feedback.classList.add('visually-hidden'); });

// --- frontend minified behaviors (hero parallax, observers, slider) ---
const _navToggle = document.querySelector(".nav-toggle"), _menu = document.getElementById("menu"); _navToggle && _menu && _navToggle.addEventListener("click", () => { const e = "true" === _navToggle.getAttribute("aria-expanded"); _navToggle.setAttribute("aria-expanded", !e), _menu.classList.toggle("open") }); const _header = document.querySelector(".site-header"); window.addEventListener("scroll", () => { window.scrollY > 10 ? _header.classList.add("scrolled") : _header.classList.remove("scrolled") }); const _fadeEls = document.querySelectorAll(".fade-in"), _observer = new IntersectionObserver(e => { e.forEach(e => { e.isIntersecting && (e.target.classList.add("visible"), _observer.unobserve(e.target)) }) }, { threshold: .2 }); _fadeEls.forEach(e => _observer.observe(e)); const _heroMedia = document.querySelector(".hero-media"); if (_heroMedia) { let e = !1; function _onScroll() { window.innerWidth <= 768 || e || (window.requestAnimationFrame(() => { const t = .3 * window.scrollY; _heroMedia.style.transform = `translateY(${t}px) scale(1.05)`, e = !1 }), e = !0) } window.addEventListener("scroll", _onScroll, { passive: !0 }), window.addEventListener("resize", () => { window.innerWidth <= 768 && (_heroMedia.style.transform = "") }) } window.addEventListener("DOMContentLoaded", () => { document.body.classList.add("page-loaded") }); const _animatedEls = document.querySelectorAll(".slide-in-left, .slide-in-right, .slide-in-up, .reveal-img"), _animObserver = new IntersectionObserver(e => { e.forEach(e => { e.isIntersecting && (e.target.classList.add("visible"), _animObserver.unobserve(e.target)) }) }, { threshold: .2 }); _animatedEls.forEach(e => _animObserver.observe(e)); const _slider = document.querySelector(".testimonial-slider"); if (_slider) { let t = 0, n = null; const r = () => { n = setInterval(() => { o(1) }, 4e3) }, s = () => { n && (clearInterval(n), n = null) }, o = e => { t = (t + e + _slider.children.length) % _slider.children.length, _slider.style.transform = `translateX(-${100 * t}%)`, a() }, i = document.querySelector(".test-prev"), d = document.querySelector(".test-next"); i && i.addEventListener("click", () => { s(), o(-1), r() }), d && d.addEventListener("click", () => { s(), o(1), r() }); const l = document.querySelector(".testimonial-indicators"); if (l) for (let u = 0; u < _slider.children.length; u++) { const m = document.createElement("button"); m.setAttribute("aria-label", `Mostra testimonianza ${u + 1}`), m.addEventListener("click", () => { s(), t = u, _slider.style.transform = `translateX(-${100 * t}%)`, a(), r() }), l.appendChild(m) } const a = () => { l && Array.from(l.children).forEach((e, n) => e.classList.toggle("active", n === t)) }, c = document.querySelector(".testimonial-slider-wrapper"); c && (c.addEventListener("mouseenter", s), c.addEventListener("mouseleave", r), c.addEventListener("focusin", s), c.addEventListener("focusout", r)), r() } function debounce2(e, t = 150) { let n; return (...r) => { clearTimeout(n), n = setTimeout(() => e(...r), t) } } window.addEventListener("resize", debounce2(() => { window.innerWidth <= 768 && _heroMedia && (_heroMedia.style.transform = "") }, 200));
