// Lightweight header behavior: search toggle with keyboard and outside-click support
(() => {
  try {
    const searchToggle = document.getElementById('search-icon');
    const searchInput = document.getElementById('search-input');
    if (!searchToggle || !searchInput) return;

    function openSearch() {
      searchInput.classList.add('active');
      searchToggle.setAttribute('aria-expanded', 'true');
      // Defer focus to next tick to avoid scroll jump on some mobile browsers
      setTimeout(() => { try { searchInput.focus({ preventScroll: true }); } catch (e) { searchInput.focus(); } }, 0);
    }

    function closeSearch() {
      searchInput.classList.remove('active');
      searchToggle.setAttribute('aria-expanded', 'false');
    }

    searchToggle.addEventListener('click', () => {
      const expanded = searchToggle.getAttribute('aria-expanded') === 'true';
      if (expanded) closeSearch(); else openSearch();
    });

    searchToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); searchToggle.click(); }
      if (e.key === 'Escape') { closeSearch(); }
    });

    // Close when clicking outside (capture to run before other handlers)
    document.addEventListener('click', (e) => {
      if (!searchToggle.contains(e.target) && !searchInput.contains(e.target)) {
        closeSearch();
      }
    }, { capture: true });

    // Close on Escape from the input
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSearch(); });

    // Optional: collapse on blur for keyboard-only flows if input is empty
    searchInput.addEventListener('blur', () => { if (!searchInput.value) closeSearch(); });
  } catch (err) { /* fail silently */ }
})();
