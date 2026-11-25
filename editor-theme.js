/* Editor theme: light by default, persistent dark mode. */
(() => {
  if (document.documentElement.classList.contains('reader-mode')) return;
  const KEY = 'fablyphone:editor-theme';
  const root = document.documentElement;
  const listeners = new Set();

  const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

  function apply(theme, persist) {
    const next = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = next;
    if (persist) {
      try { localStorage.setItem(KEY, next); } catch {}
    }
    listeners.forEach((fn) => {
      try { fn(next); } catch {}
    });
  }

  function toggle() {
    apply(current() === 'dark' ? 'light' : 'dark', true);
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return () => {};
    listeners.add(fn);
    fn(current());
    return () => listeners.delete(fn);
  }

  window.EditorTheme = { current, apply, toggle, onChange };
})();
