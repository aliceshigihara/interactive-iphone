/* Motion timings from GreenSock's Orchestrated easeReverse demo (JoRMPLg). */
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
  const bars = () => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
    <line x1="2" y1="5" x2="14" y2="5"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="11" x2="14" y2="11"/>
  </svg>`;
  const menuLabel = text('Menu','Menu');
  const closeLabel = text('Fechar menu','Close menu');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

  function loadEngine() {
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js';
      script.crossOrigin = 'anonymous';
      script.integrity = 'sha384-XmJ9SoHtVOHoQUcKvFAzVXwdkKo1Ie3bhmSoIAkcdsHGaIrVJIkmozyq0FJeb/Ly';
      script.onload = () => resolve(window.gsap || null);
      script.onerror = () => resolve(null);
      document.head.append(script);
    });
  }

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
    const engine = loadEngine();

    const dialog = document.createElement('dialog');
    dialog.id = 'site-staggered-menu';
    dialog.className = 'site-menu-dialog';
    dialog.setAttribute('aria-label',text('Menu do site','Site menu'));
    dialog.innerHTML = `
      <div class="site-menu-backdrop" aria-hidden="true"></div>
      <div class="site-menu-island">
        <span class="site-menu-logo" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><rect x="7" y="3.5" width="10" height="17" rx="3"/><path d="M10 6h4m-2 11.5h.01"/></svg></span>
        <button type="button" class="site-menu-close" aria-label="${closeLabel}" aria-expanded="true" aria-controls="site-menu-pages" autofocus>${bars()}</button>
      </div>
      <div class="site-menu-anchor">
        <nav class="site-menu-sheet" id="site-menu-pages" aria-label="${text('Páginas do site','Site pages')}"><ul class="site-menu-links"></ul></nav>
      </div>`;
    document.body.append(dialog);
    const sheet = dialog.querySelector('.site-menu-sheet');
    const island = dialog.querySelector('.site-menu-island');
    const logo = island.firstElementChild;
    const closeButton = dialog.querySelector('.site-menu-close');
    const [topBar,midBar,bottomBar] = closeButton.querySelectorAll('line');
    const backdrop = dialog.querySelector('.site-menu-backdrop');
    const list = dialog.querySelector('.site-menu-links');
    const path = location.pathname.split('/').pop() || 'index.html';
    for (const [index,[file,label]] of routes.entries()) {
      const item = document.createElement('li'), link = document.createElement('a');
      const url = new URL(file,location.href);
      url.searchParams.set('lang',lang);
      link.href = url.href;
      link.innerHTML = `<span>${label}</span><small aria-hidden="true">${String(index+1).padStart(2,'0')}</small>`;
      if (path === file) link.setAttribute('aria-current','page');
      item.append(link);
      list.append(item);
    }
    const links = [...list.querySelectorAll('a')];

    let opener, timeline, opening = false, loading = false, destination;
    const finish = () => {
      if (opening) return;
      if (dialog.open) dialog.close();
      if (destination) window.location.assign(destination);
    };

    function animation(gsap,rect) {
      const viewport = dialog.clientWidth;
      const islandHeight = island.offsetHeight;
      const x = rect.left + rect.width / 2;
      const y = rect.top + (rect.height - islandHeight) / 2;
      const top = parseFloat(getComputedStyle(dialog).getPropertyValue('--menu-safe-top')) || 0;
      gsap.set(island,{width:rect.width,left:x,top:y});
      return gsap.timeline({paused:true,onReverseComplete:finish})
        .to(island,{width:Math.min(viewport*.9,400),left:viewport/2,top:top+20,
          duration:.8,ease:'back.out(2)',easeReverse:'power2.out'},0)
        .to(logo,{opacity:1,rotation:180,duration:.5,ease:'back.out',easeReverse:'power4.out'},.12)
        .to(midBar,{opacity:0,duration:.15,ease:'power2.in',easeReverse:true},0)
        .to(topBar,{attr:{x1:3,y1:3,x2:13,y2:13},duration:.28,ease:'power3.inOut'},0)
        .to(bottomBar,{attr:{x1:13,y1:3,x2:3,y2:13},duration:.28,ease:'power3.inOut'},0)
        .to(backdrop,{opacity:1,duration:.3,ease:'power2.out'},0)
        .from(sheet,{autoAlpha:0,yPercent:-10,scale:.6,duration:.8,transformOrigin:'top center',
          ease:'back.out(2)',easeReverse:'power3.out'},.1)
        .from(links,{opacity:0,y:6,duration:.32,ease:'power2.out',easeReverse:true,stagger:.05},.22);
    }

    function setOpen(value,url) {
      opening=value;
      destination=value?null:url;
      opener?.setAttribute('aria-expanded',String(value));
      closeButton.setAttribute('aria-expanded',String(value));
      closeButton.setAttribute('aria-label',value?closeLabel:menuLabel);
      sheet.inert=!value;
      if (!value && sheet.contains(document.activeElement)) closeButton.focus({preventScroll:true});
      if (dialog.hasAttribute('data-static')) {
        if (!value) finish();
      }else if (value) timeline.play();
      else if (timeline.time()>0) timeline.reverse();
      else finish();
    }

    async function open(button) {
      if (dialog.open || loading) return;
      loading = true;
      let gsap = window.gsap;
      if (!gsap && !motion.matches) {
        let timer;
        gsap = await Promise.race([engine,new Promise(resolve=>{timer=setTimeout(()=>resolve(null),1800)})]);
        clearTimeout(timer);
      }
      loading = false;
      if (!button.getClientRects().length || dialog.open) return;
      opener = button;
      const rect = button.getBoundingClientRect();
      timeline?.revert();
      timeline = null;
      island.removeAttribute('style');
      const staticMenu = !gsap || motion.matches;
      dialog.toggleAttribute('data-static',staticMenu);
      dialog.showModal();
      if (!staticMenu) timeline = animation(gsap,rect);
      setOpen(true);
    }

    closeButton.addEventListener('click',()=>{if(dialog.open)setOpen(!opening)});
    backdrop.addEventListener('click',()=>{if (opening) setOpen(false)});
    dialog.addEventListener('cancel',event=>{event.preventDefault();if(opening)setOpen(false)});
    dialog.addEventListener('close',()=>{
      opening=false;
      opener?.setAttribute('aria-expanded','false');
      if (!destination && opener?.getClientRects().length) opener.focus({preventScroll:true});
    });
    window.addEventListener('resize',()=>{
      if (!dialog.open || !timeline) return;
      if (!opener?.getClientRects().length) {
        opener?.setAttribute('aria-expanded','false');
        opener=[...document.querySelectorAll('.site-menu-button,.site-menu-mobile')]
          .find(button=>button.getClientRects().length);
        if (opener) opener.setAttribute('aria-expanded',String(opening));
      }
      const rect = opener?.getBoundingClientRect();
      if (!rect) return;
      const progress=timeline.progress();
      timeline.revert();
      timeline=animation(window.gsap,rect).progress(progress,true);
      if (opening && progress<1) timeline.play();
      else if (!opening) timeline.reverse();
    });
    list.addEventListener('click',event=>{
      const link = event.target.closest('a');
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      setOpen(false,link.hasAttribute('aria-current')?null:link.href);
    });

    for (const slot of slots) {
      const button = document.createElement('button');
      button.type = 'button';
      const mobile=slot===mobileNav;
      button.className = mobile?'site-menu-mobile':'site-menu-button';
      button.setAttribute('aria-label',menuLabel);
      button.setAttribute('aria-haspopup','dialog');
      button.setAttribute('aria-controls',dialog.id);
      button.setAttribute('aria-expanded','false');
      button.innerHTML = `${bars()}${mobile?menuLabel:''}`;
      button.addEventListener('click',()=>open(button));
      slot.append(button);
    }
  });
})();
