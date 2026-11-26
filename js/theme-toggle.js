/* Magic UI's circular theme reveal, using native same-document view transitions. */
(() => {
  const root = document.documentElement;
  if (root.classList.contains('reader-mode')) return;
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;
  const key = button.dataset.themeToggle;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.23,1,.32,1)';
  const glyph = document.createElementNS('http://www.w3.org/2000/svg','svg');
  glyph.setAttribute('viewBox','0 0 24 24');
  glyph.setAttribute('aria-hidden','true');
  button.replaceChildren(glyph);
  const icons = {
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42M6.35 17.65l-1.42 1.42"/>',
  };
  let animation, transition;

  function apply(theme, animate = false) {
    const dark = theme === 'dark';
    const wasDark = root.dataset.theme === 'dark';
    animation?.cancel();
    root.dataset.theme = dark ? 'dark' : 'light';
    button.setAttribute('aria-pressed', String(dark));
    const text = window.SiteLanguage?.text || ((pt) => pt);
    glyph.dataset.themeGlyph = dark ? 'sun' : 'moon';
    glyph.innerHTML = icons[glyph.dataset.themeGlyph];
    button.setAttribute('aria-label', text('Modo escuro', 'Dark mode'));
    button.title = dark ? text('Ativar modo claro','Use light mode') : text('Ativar modo escuro','Use dark mode');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = dark ? '#090f22' : '#f4f8ff';
    if (animate && !motion.matches && dark !== wasDark && glyph.animate) {
      animation = glyph.animate([
        {opacity:.25, transform:'rotate(-28deg) scale(.76)'},
        {opacity:1, transform:'none'},
      ],{duration:300,easing});
    }
    root.dispatchEvent(new Event('themechange'));
  }

  function changeTheme(theme, animateIcon = false) {
    apply(theme, animateIcon);
    try { localStorage.setItem(key, theme); } catch {}
  }

  apply(root.dataset.theme);
  button.addEventListener('click', () => {
    if (transition) return;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (motion.matches || typeof document.startViewTransition !== 'function') {
      changeTheme(next, !motion.matches);
      return;
    }

    const {left,top,width,height} = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
    const x = left + width/2, y = top + height/2;
    const radius = Math.hypot(Math.max(x,viewportWidth-x),Math.max(y,viewportHeight-y));
    // Clip-path circle percentages use the normalized diagonal of the snapshot.
    root.style.setProperty('--theme-reveal-origin',`${100*x/viewportWidth}% ${100*y/viewportHeight}%`);
    root.style.setProperty('--theme-reveal-radius',`${100*(radius+1)/(Math.hypot(viewportWidth,viewportHeight)/Math.SQRT2)}%`);
    root.setAttribute('data-theme-reveal','');
    const cleanup = () => {
      transition = null;
      root.removeAttribute('data-theme-reveal');
      root.style.removeProperty('--theme-reveal-origin');
      root.style.removeProperty('--theme-reveal-radius');
    };
    try {
      transition = document.startViewTransition(() => changeTheme(next));
      transition.ready.catch(() => {});
      transition.finished.then(cleanup, cleanup);
    } catch {
      cleanup();
      changeTheme(next);
    }
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
