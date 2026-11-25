/* Botão de modo claro/escuro do editor.
   Substitui o botão que ficava dentro do dock. Carregue DEPOIS de editor-theme.js. */
(() => {
  const root = document.documentElement;
  if (root.classList.contains('reader-mode')) return;
  const KEY = 'fablyphone:editor-theme';
  const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 14.5a8.8 8.8 0 0 1-10.9-10.9 8.8 8.8 0 1 0 10.9 10.9Z"/></svg>';
  const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19m0-14-1.5 1.5m-11 11L5 19"/></svg>';

  function boot() {
    if (!window.EditorTheme || document.getElementById('theme-toggle-fab')) return;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && saved !== EditorTheme.current()) EditorTheme.apply(saved, false);
    } catch {}

    const style = document.createElement('style');
    style.textContent = `
#theme-toggle-fab{position:fixed;top:14px;right:14px;z-index:90;width:40px;height:40px;padding:0;display:grid;place-items:center;
 border-radius:50%;border:1px solid var(--ed-line-strong,#1e3a8a38);background:var(--ed-glass-strong,#ffffffd6);color:var(--ed-accent,#1e3a8a);
 box-shadow:0 8px 22px var(--ed-shadow,#172b6230);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer}
#theme-toggle-fab svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#theme-toggle-fab:hover{transform:scale(1.06)}#theme-toggle-fab:active{transform:scale(.95)}
#theme-toggle-fab:focus-visible{outline:2px solid var(--ed-accent-bright,#2e57c1);outline-offset:2px}`;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'theme-toggle-fab';
    btn.type = 'button';
    btn.addEventListener('click', () => EditorTheme.toggle());
    EditorTheme.onChange((theme) => {
      const dark = theme === 'dark';
      btn.innerHTML = dark ? SUN : MOON;
      btn.title = dark ? 'Modo claro' : 'Modo escuro';
      btn.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
      btn.setAttribute('aria-pressed', String(dark));
    });
    document.body.appendChild(btn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
