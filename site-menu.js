/* Smooth shared navigation with a continuous selection indicator. */
(() => {
  const {reader, lang, text} = SiteLanguage;
  if (reader) return;

  const topicControls = document.querySelector('[data-topic-controls]');
  if (topicControls) {
    topicControls.insertAdjacentHTML('afterbegin', `
      <div class="language-choice" role="group" aria-label="${text('Idioma','Language')}"><a data-language-choice="pt" href="?lang=pt" lang="pt-BR" aria-label="Português">PT</a><a data-language-choice="en" href="?lang=en" lang="en" aria-label="English">EN</a></div>
      <button type="button" class="theme-toggle theme-switch" data-theme-toggle="fablyphone:landing-theme" aria-label="${text('Modo escuro','Dark mode')}" aria-pressed="false"></button>
    `);
    topicControls.querySelector(`[data-language-choice="${lang}"]`)?.setAttribute('aria-current','true');
    if (lang === 'en') document.title = `${document.body.dataset.titleEn} — Fablyphone`;
  }

  const routes = [
    ['index.html', text('Início','Home')],
    ['sobre.html', text('Sobre','About')],
    ['recursos.html', text('Recursos','Features')],
    ['como-usar.html', text('Como usar','How to use')],
    ['contato.html', text('Contato','Contact')],
    ['editor.html', text('Editor','Editor')],
  ];
  const menuLabel = text('Menu','Menu');
  const closeLabel = text('Fechar','Close');
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const navIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

  document.addEventListener('DOMContentLoaded', () => {
    const slots = [...document.querySelectorAll('[data-site-menu-slot]')];
    const mobileNav = document.querySelector('.mobile-editor-nav');
    if (mobileNav) {
      const desktop = document.createElement('div');
      desktop.className = 'site-menu-editor';
      document.body.prepend(desktop);
      slots.push(desktop,mobileNav);
    }
    if (!slots.length) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'site-staggered-menu';
    dialog.className = 'site-menu-dialog';
    dialog.setAttribute('aria-label',text('Menu do site','Site menu'));
    dialog.innerHTML = `
      <div class="site-menu-sheet">
        <header class="site-menu-head"><span>fablyphone</span><button type="button" class="site-menu-button site-menu-close" autofocus>${closeLabel}${icon}</button></header>
        <nav aria-label="${text('Páginas do site','Site pages')}"><ul class="site-menu-links"></ul></nav>
      </div>`;
    document.body.append(dialog);
    const sheet = dialog.querySelector('.site-menu-sheet');
    const closeButton = dialog.querySelector('.site-menu-close');
    const list = dialog.querySelector('.site-menu-links');
    const highlight = document.createElement('span');
    highlight.className = 'site-menu-highlight';
    highlight.setAttribute('aria-hidden','true');
    // Keep the list's semantic children as list items.
    const marker = document.createElement('li');
    marker.setAttribute('aria-hidden','true');
    marker.style.cssText = 'position:absolute;inset:0;pointer-events:none;list-style:none';
    marker.append(highlight); list.append(marker);
    const paths = ['M3 10l9-7 9 7v10H3zM9 20v-7h6v7','M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0','M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z','M4 5h7a4 4 0 0 1 1 2 4 4 0 0 1 1-2h7v14h-7l-1 2-1-2H4zM12 7v12','M3 5h18v14H3zM3 6l9 7 9-7','M13 4H5v15h15v-8M10 14l1-4 7-7 3 3-7 7z'];
    function ring(link, immediate = false) {
      if (!link) { highlight.style.opacity = '0'; return; }
      const item = link.parentElement;
      if (immediate) highlight.style.transition = 'none';
      highlight.style.transform = `translate3d(${item.offsetLeft}px, ${item.offsetTop}px, 0)`;
      highlight.style.width = `${link.offsetWidth}px`;
      highlight.style.height = `${link.offsetHeight}px`;
      highlight.style.opacity = '1';
      if (immediate) { void highlight.offsetWidth; highlight.style.removeProperty('transition'); }
    }
    const current = () => list.querySelector('[aria-current="page"]');
    list.addEventListener('pointerleave',()=>ring(current()));
    list.addEventListener('focusout',e=>{if(!list.contains(e.relatedTarget))ring(current());});
    const path = location.pathname.split('/').pop() || 'index.html';
    for (const [index,[file,label]] of routes.entries()) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const url = new URL(file,location.href);
      url.searchParams.set('lang',lang);
      link.href = url.href;
      link.style.setProperty('--item',index);
      link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[index]}"/></svg><span>${label}</span>`;
      link.addEventListener('pointerenter',event=>{if(event.pointerType !== 'touch')ring(link);});
      link.addEventListener('focus',()=>ring(link));
      if (path === file) link.setAttribute('aria-current','page');
      item.append(link);
      list.append(item);
    }

    window.addEventListener('resize',()=>{if(dialog.open)ring(list.querySelector('a:focus') || current(), true);});
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let opener;
    let closeTimer;
    function open(button) {
      if (dialog.open) return;
      opener = button;
      button.setAttribute('aria-expanded','true');
      dialog.showModal();
      const rect = button.getBoundingClientRect();
      dialog.style.setProperty('--menu-top',`${Math.max(12, Math.min(rect.top, innerHeight - sheet.offsetHeight - 12))}px`);
      dialog.style.setProperty('--menu-right',`${Math.max(12,innerWidth-rect.right)}px`);
      dialog.style.setProperty('--menu-bottom',`${Math.max(12, innerHeight-rect.bottom)}px`);
      ring(current(), true);
      // Commit the initial position before expanding.
      void sheet.offsetWidth;
      dialog.dataset.active = '';
    }

    function finishClose() {
      clearTimeout(closeTimer);
      if (dialog.open) dialog.close();
    }
    function close() {
      if (!dialog.hasAttribute('data-active')) return;
      delete dialog.dataset.active;
      if (motion.matches) finishClose();
      else closeTimer = setTimeout(finishClose,240);
    }
    closeButton.addEventListener('click',close);
    sheet.addEventListener('transitionend',event => {
      if (event.target === sheet && event.propertyName === 'transform' && !dialog.hasAttribute('data-active')) finishClose();
    });
    dialog.addEventListener('cancel',event => { event.preventDefault(); close(); });
    dialog.addEventListener('click',event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close',() => {
      delete dialog.dataset.active;
      opener?.setAttribute('aria-expanded','false');
      if (opener?.getClientRects().length) opener.focus({preventScroll:true});
    });
    list.addEventListener('click',event => {
      const link = event.target.closest('a');
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if(link.hasAttribute('aria-current')) {close();return;}
      location.href=link.href;
    });

    for (const slot of slots) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = slot === mobileNav ? 'site-menu-mobile' : 'site-menu-button';
      button.setAttribute('aria-haspopup','dialog');
      button.setAttribute('aria-controls',dialog.id);
      button.setAttribute('aria-expanded','false');
      button.innerHTML = slot === mobileNav ? `${navIcon}${menuLabel}` : `${menuLabel}${icon}`;
      button.addEventListener('click',() => open(button));
      slot.append(button);
    }
  });
})();
