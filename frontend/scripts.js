// === MENU MOBILE ===
const navToggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');

if (navToggle && menu) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', !expanded);
    menu.classList.toggle('open');
  });
}

// === HEADER SCROLL SHADOW ===
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// === FADE-IN ON SCROLL ===
const fadeEls = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

fadeEls.forEach(el => observer.observe(el));

// === PARALLAX HERO (optimized rAF, disabled on small screens) ===
const heroMedia = document.querySelector('.hero-media');
if (heroMedia) {
  let ticking = false;
  function onScroll() {
    if (window.innerWidth <= 768) return; // skip on small screens
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const offset = window.scrollY * 0.3; // velocità parallax
        heroMedia.style.transform = `translateY(${offset}px) scale(1.05)`;
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { if (window.innerWidth <= 768) heroMedia.style.transform = '' });
}

// === TRANSIZIONE DI PAGINA ===
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-loaded');
});

// === ANIMAZIONI VARIATE ON SCROLL ===
const animatedEls = document.querySelectorAll('.slide-in-left, .slide-in-right, .slide-in-up, .reveal-img');

const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

animatedEls.forEach(el => animObserver.observe(el));

// === SLIDER TESTIMONIALS ===
const slider = document.querySelector('.testimonial-slider');
if (slider) {
  let index = 0;
  let interval = null;
  const startAutoplay = () => {
    interval = setInterval(() => { move(1); }, 4000);
  };
  const stopAutoplay = () => { if (interval) { clearInterval(interval); interval = null; } };

  const move = (dir) => {
    index = (index + dir + slider.children.length) % slider.children.length;
    slider.style.transform = `translateX(-${index * 100}%)`;
    updateIndicators();
  };

  // Controls
  const prevBtn = document.querySelector('.test-prev');
  const nextBtn = document.querySelector('.test-next');
  if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoplay(); move(-1); startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoplay(); move(1); startAutoplay(); });

  // Indicators
  const indicators = document.querySelector('.testimonial-indicators');
  if (indicators) {
    for (let i = 0; i < slider.children.length; i++) {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', `Mostra testimonianza ${i + 1}`);
      btn.addEventListener('click', () => { stopAutoplay(); index = i; slider.style.transform = `translateX(-${index * 100}%)`; updateIndicators(); startAutoplay(); });
      indicators.appendChild(btn);
    }
  }

  const updateIndicators = () => {
    if (!indicators) return;
    Array.from(indicators.children).forEach((b, i) => b.classList.toggle('active', i === index));
  };

  // Pause on hover/focus
  const wrapper = document.querySelector('.testimonial-slider-wrapper');
  if (wrapper) {
    wrapper.addEventListener('mouseenter', stopAutoplay);
    wrapper.addEventListener('mouseleave', startAutoplay);
    wrapper.addEventListener('focusin', stopAutoplay);
    wrapper.addEventListener('focusout', startAutoplay);
  }

  startAutoplay();
}

// Debounce helper for resize
function debounce(fn, wait = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// Ensure layout updates on resize (e.g., re-evaluate hero parallax disabling)
window.addEventListener('resize', debounce(() => {
  if (window.innerWidth <= 768 && heroMedia) heroMedia.style.transform = '';
}, 200));
