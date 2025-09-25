// particles.js - Neon particles module
// Small API: init(options), start(), stop(), setCount(n)
// Respects prefers-reduced-motion and pauses on document.hidden
(function () {
  'use strict';

  const defaults = {
    selector: '#neonParticles',
    maxDesktop: 80,
    maxMobile: 30,
    desktopMinWidth: 900,
    blur: 12,
    colors: ['#00FFC6', '#00BFFF', '#8A2BE2'],
    speedRange: 0.6,
    sizeRange: [1, 4]
  };

  let cfg = Object.assign({}, defaults);
  let canvas, ctx, particles = [], rafId = null;
  let running = false;

  function isMobileWidth() { return window.innerWidth < 768; }
  function prefersReducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  class Particle {
    constructor(w, h) {
      this.reset(w, h);
    }
    reset(w, h) {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * (cfg.sizeRange[1] - cfg.sizeRange[0]) + cfg.sizeRange[0];
      this.speedX = (Math.random() - 0.5) * cfg.speedRange;
      this.speedY = (Math.random() - 0.5) * cfg.speedRange;
      this.color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)];
    }
    update(w, h) {
      this.x += this.speedX; this.y += this.speedY;
      if (this.x < 0 || this.x > w) this.speedX *= -1;
      if (this.y < 0 || this.y > h) this.speedY *= -1;
    }
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = cfg.blur;
      ctx.shadowColor = this.color;
      ctx.fill();
    }
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initParticles(count) {
    particles = [];
    for (let i = 0; i < count; i++) particles.push(new Particle(canvas.width, canvas.height));
  }

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(canvas.width, canvas.height); p.draw(ctx); });
    rafId = requestAnimationFrame(animate);
  }

  function start() {
    if (running) return;
    if (prefersReducedMotion()) return; // don't run heavy animation
    running = true;
    if (!canvas) { canvas = document.querySelector(cfg.selector); if (!canvas) return; ctx = canvas.getContext('2d'); }
    resize();
    const count = isMobileWidth() ? cfg.maxMobile : cfg.maxDesktop;
    initParticles(count);
    animate();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function setCount(n) {
    if (!canvas) return;
    const cnt = Math.max(0, parseInt(n, 10) || 0);
    initParticles(cnt);
  }

  function onVisibilityChange() {
    if (document.hidden) stop(); else start();
  }

  function onResizeDebounced() {
    // simple debounce
    clearTimeout(onResizeDebounced._t);
    onResizeDebounced._t = setTimeout(() => {
      if (!canvas) return;
      resize();
      // reduce particles on narrower screens
      const count = isMobileWidth() ? cfg.maxMobile : cfg.maxDesktop;
      initParticles(count);
    }, 150);
  }

  // Public init - shallow merge accepted
  function init(options) {
    cfg = Object.assign({}, cfg, options || {});
    // if desktop-only and width below desktopMinWidth, don't start
    if (window.matchMedia && window.matchMedia(`(max-width: ${cfg.desktopMinWidth - 1}px)`).matches) {
      // still create canvas sizing for layout but do not run heavy anim
      canvas = document.querySelector(cfg.selector);
      if (canvas) { resize(); }
      return;
    }

    // attach listeners
    window.addEventListener('resize', onResizeDebounced);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // start after tiny delay to avoid blocking load
    setTimeout(() => { try { start(); } catch (e) { console.warn('particles start failed', e); } }, 60);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  // expose API
  window.NeonParticles = { init, start, stop, setCount };

})();
