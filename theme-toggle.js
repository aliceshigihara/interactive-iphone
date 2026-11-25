/* Animate UI Theme Toggler Button, adapted for the static pages. */
(() => {
  const root = document.documentElement;
  if (root.classList.contains('reader-mode')) return;
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  const key = button.dataset.themeToggle;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.23,1,.32,1)';
  const moon = button.querySelector('.theme-moon');
  const sun = button.querySelector('.theme-sun');
  let animations = [];

  function apply(theme, animate = false) {
    const dark = theme === 'dark';
    const wasDark = root.dataset.theme === 'dark';
    animations.forEach(animation => animation.cancel());
    animations = [];
    root.dataset.theme = dark ? 'dark' : 'light';
    button.setAttribute('aria-pressed', String(dark));
    const text = window.SiteLanguage?.text || ((pt) => pt);
    button.setAttribute('aria-label', text('Modo escuro', 'Dark mode'));
    button.title = dark ? text('Ativar modo claro','Use light mode') : text('Ativar modo escuro','Use dark mode');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = dark ? '#090f22' : '#f4f8ff';
    if (animate && dark !== wasDark && moon.animate) {
      const turn = motion.matches ? 'none' : 'rotate(90deg) scale(.5)';
      const enter = motion.matches ? 'none' : 'rotate(-90deg) scale(.5)';
      const rest = { opacity: 1, filter: 'blur(0px)', transform: 'none' };
      const faded = { opacity: 0, filter: 'blur(2px)' };
      const options = { duration: 300, easing };
      animations = [
        (dark ? moon : sun).animate([rest, {...faded, transform: turn}], options),
        (dark ? sun : moon).animate([{...faded, transform: enter}, rest], options),
      ];
    }
    root.dispatchEvent(new Event('themechange'));
  }

  apply(root.dataset.theme);
  button.addEventListener('click', () => {
    apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    try { localStorage.setItem(key, root.dataset.theme); } catch {}
  });
  window.addEventListener('storage', event => {
    if (event.storageArea === localStorage && (event.key === key || event.key === null)) apply(event.newValue);
  });
  const bubbles = document.querySelector('.editor-bubbles');
  if (bubbles) {
    const syncVisibility = () => bubbles.toggleAttribute('data-paused', document.hidden);
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();
  }
})();
