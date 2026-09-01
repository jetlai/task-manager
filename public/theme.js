(function () {
  const root = document.body;
  const toggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('jetflow-theme');
  const preferred = savedTheme || 'light';

  root.dataset.theme = preferred;

  function syncToggle() {
    if (!toggle) return;
    const isDark = root.dataset.theme === 'dark';
    toggle.textContent = isDark ? '☀️' : '🌙';
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  syncToggle();

  if (toggle) {
    toggle.addEventListener('click', () => {
      const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = nextTheme;
      localStorage.setItem('jetflow-theme', nextTheme);
      syncToggle();
    });
  }
})();
