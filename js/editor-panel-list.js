(() => {
  if (readerMode) return;
  const left = document.querySelector('#editor-panel-nav');
  const right = document.querySelector('#editor-panel-content');
  const drawer = document.querySelector('.story-drawer');
  if (!left || !right) return;

  const tr = SiteLanguage.text;
  const mobile = matchMedia('(max-width:760px)');
  const roomForTwo = matchMedia('(min-width:1280px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const icons = {
    story: 'M5 3h13a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM4 17h16M8 7h8m-8 4h6',
    saved: 'M3 6h7l2 2h9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    general: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6',
    conversation: 'M21 11a8 8 0 0 1-11 7L4 20l2-6a8 8 0 1 1 15-3zM10 11h.01m4 0h.01',
    characters: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0',
  };
  const glyph = path => I(`<path d="${path}"/>`,19,'none','currentColor');
  const actionIcons = {
    voicemail: 'M10 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm12 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6 16h12',
    globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z',
    person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-1a8 8 0 0 1 16 0v1',
    video: 'M4 5h16v14H4zM10 9l5 3-5 3V9z',
    card: 'M3 6h18v12H3zM3 10h18M6 15h4',
    bank: 'M3 9h18l-9-5-9 5Zm2 11h14M7 9v8m5-8v8m5-8v8',
    transfer: 'M4 8h15m-4-4 4 4-4 4m5 4H5m4-4-4 4 4 4',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
    read: 'M3 9v11h18V9l-9-5-9 5Zm0 1 9 6 9-6',
    search: 'M15 10a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-1.5 3.5L20 20',
    page: 'M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5',
    pin: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    compass: 'M12 3l7 16-7-4-7 4 7-16Z',
    clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
    alarm: 'M5 3 2 6m17-3 3 3M20 13a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4v4l3 2',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v6m8-6v6',
    phone: 'M6 4h4l1 5-3 2a11 11 0 0 0 5 5l2-3 5 1v4a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2Z',
    play: 'M5 4h14v16H5zM10 8l5 4-5 4V8z',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z',
    link: 'M10 13l4-4m-6 6-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 1 2-2a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0',
  };
  const pinIcon = glyph('M9 3h6v2l-1 1v5l3 3v2H7v-2l3-3V6L9 5V3zm3 13v5');
  const pinStorage = 'fablyphone:pinned-editor-panels';
  const pinned = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(pinStorage));
    if (Array.isArray(saved)) saved.filter(key => typeof key === 'string').forEach(key => pinned.add(key));
  } catch {}
  const desc = {
    story: tr('Guia, planejamento e narração','Guide, planner, and narration'),
    saved: tr('Rascunhos, backups e links','Drafts, backups, and links'),
    general: tr('Hora, data e edição rápida','Time, date, and quick editing'),
    apps: tr('Apps visíveis, Dock e pastas','Visible apps, Dock, and folders'),
    widgets: tr('Clima na tela inicial','Weather on the Home Screen'),
    wallpapers: tr('Tela inicial e tela de bloqueio','Home and Lock Screens'),
    passcode: tr('Desbloqueio do iPhone fictício','Unlock the simulated iPhone'),
    notifications: tr('Avisos na tela de bloqueio','Lock Screen alerts'),
    conversation: tr('Ações da conversa aberta','Actions for the open conversation'),
    characters: tr('Contatos e conversas','Contacts and conversations'),
  };
  const keyByDetails = {generalDetails:'general', chatPanelDetails:'apps', passDetails:'passcode', widgetsDetails:'widgets', wallpaperDetails:'wallpapers'};
  const appOrder = ['apps','widgets','wallpapers','passcode','notifications','characters','conversation'];
  const globals = ['story','general','saved'];
  const labelText = node => [...(node?.childNodes || [])].filter(child => child.nodeType === Node.TEXT_NODE)
    .map(child => child.textContent).join('').trim();

  function decorateActions(root) {
    if (!root) return;
    for (const button of root.querySelectorAll('button[data-panel-action]:not(.panel-action)')) {
      const label = labelText(button).replace(/^[+＋↗]\s*/, '');
      const path = actionIcons[button.dataset.panelAction];
      if (!label || !path) continue;
      const copy = document.createElement('span');
      copy.className = 'panel-action-copy';
      const title = document.createElement('strong');
      title.textContent = label;
      copy.append(title);
      if (button.dataset.copy) {
        const description = document.createElement('small');
        description.textContent = button.dataset.copy;
        copy.append(description);
      }
      button.classList.add('panel-action');
      button.innerHTML = glyph(path);
      button.firstElementChild.classList.add('panel-action-icon');
      button.firstElementChild.setAttribute('aria-hidden','true');
      button.append(copy);
    }
  }
  const panels = [...left.querySelectorAll(':scope > .pc'), ...right.querySelectorAll(':scope > .pc'), ...(drawer?.querySelectorAll('.pc') || [])]
    .map(panel => {
      const details = panel.querySelector(':scope > details');
      const notification = panel.querySelector('#lock-notifications-launch');
      const title = notification ? tr('Notificações','Notifications') : labelText(panel.querySelector('h1,h2,.notification-toggle-title'));
      const scope = panel.dataset.s;
      const key = panel.querySelector('#ctx') ? 'story' : panel.querySelector('#stl') ? 'saved'
        : notification ? 'notifications'
    : keyByDetails[details?.id] || (scope === 'msg' ? (panel.classList.contains('msg-panel') ? 'characters' : 'conversation') : scope);
      const icon = notification?.querySelector('svg')?.outerHTML || panel.querySelector('.notification-toggle-icon svg')?.outerHTML;
      return {panel, key, title, scope, details, icon};
    });
  if (!panels.length || panels.some(entry => !entry.key || !entry.title)) return;

  left.innerHTML = `<nav class="panel-catalog" aria-labelledby="panel-list-title">
    <header class="panel-catalog-head"><div class="panel-catalog-tools"><small>Fablyphone</small></div>
      <h2 id="panel-list-title">${tr('Painéis','Panels')}</h2><p>${tr('Escolha o que quer editar.','Choose what to edit.')}</p></header>
    <div class="panel-list-viewport">
      <div class="panel-list-track"><span class="panel-list-indicator" aria-hidden="true"></span></div>
    </div>
  </nav>`;
  const tools = left.querySelector('.panel-catalog-tools');
  const story = panels.find(entry => entry.key === 'story')?.panel;
  tools.append(...story.querySelectorAll('.language-choice, #editor-theme-toggle'));
  const viewport = left.querySelector('.panel-list-viewport');
  const track = left.querySelector('.panel-list-track');
  const indicator = left.querySelector('.panel-list-indicator');

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'panel-catalog-back';
  back.innerHTML = `${glyph('m15 5-7 7 7 7')} ${tr('Voltar aos painéis','Back to panels')}`;
  const empty = document.createElement('div');
  empty.className = 'pc panel-catalog-empty';
  empty.innerHTML = `${glyph('M3 5h18v14H3zM9 5v14')}<h2>${tr('Escolha um painel','Choose a panel')}</h2><p>${tr('As ferramentas acompanham o aplicativo aberto no iPhone.','The available tools follow the app open on the iPhone.')}</p>`;
  const stacks = [document.createElement('div'), document.createElement('div')];
  for (const stack of stacks) stack.className = 'panel-detail-stack';
  stacks[1].hidden = true;
  stacks[0].append(empty);
  right.prepend(back, ...stacks);
  for (const entry of panels) {
    entry.panel.id = `editor-panel-${entry.key}`;
    entry.panel.hidden = true;
    if (entry.details || entry.key === 'notifications') {
      const heading = document.createElement('h2');
      heading.className = 'panel-detail-title';
      heading.textContent = entry.title;
      entry.panel.prepend(heading);
      if (entry.details) entry.details.querySelector(':scope > summary').hidden = true;
    }
    const heading = entry.panel.querySelector('h1,h2');
    const header = document.createElement('div');
    header.className = 'panel-detail-header';
    const oldHeader = heading.parentElement;
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'panel-pin';
    pin.setAttribute('aria-label', tr('Fixar painel','Pin panel'));
    pin.innerHTML = pinIcon;
    pin.firstElementChild.setAttribute('aria-hidden','true');
    pin.addEventListener('click', () => togglePin(entry));
    const body = document.createElement('div');
    body.className = 'panel-detail-body';
    body.id = `${entry.panel.id}-body`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'panel-collapse';
    toggle.innerHTML = glyph('m5 9 7 7 7-7');
    toggle.firstElementChild.setAttribute('aria-hidden','true');
    toggle.setAttribute('aria-controls',body.id);
    toggle.addEventListener('click', () => {
      setCollapsed(entry,!entry.panel.hasAttribute('data-collapsed'));
    });
    entry.pin = pin;
    entry.heading = heading;
    entry.body = body;
    entry.toggle = toggle;
    header.append(heading, toggle, pin);
    if (oldHeader.matches('.editor-panel-heading')) oldHeader.remove();
    const inner = document.createElement('div');
    inner.className = 'panel-detail-inner';
    inner.append(...entry.panel.childNodes);
    body.append(inner);
    entry.panel.append(header, body);
    decorateActions(body);
    setCollapsed(entry,false);
    stacks[0].append(entry.panel);
  }
  drawer?.remove();
  document.body.classList.add('panel-list-ready');

  let app = '', selected = null, buttons = [], halo = null, hovered = null, shownPanels = [];
  const spring = CSS.supports('transition-timing-function','linear(0, 1)')
    ? 'linear(0,.2,.52,.8,.98,1.065,1.08,1.05,1.018,1,.994,1)' : 'cubic-bezier(.25,1.35,.45,1)';
  const disclosure = right.querySelector('.saved-disclosure');
  if (disclosure) {
    const trigger = disclosure.querySelector('.saved-disclosure-trigger');
    const content = disclosure.querySelector('.saved-disclosure-content');
    function expandSaved(expanded) {
      if (!expanded && content.contains(document.activeElement)) trigger.focus({preventScroll:true});
      disclosure.dataset.expanded = String(expanded);
      trigger.setAttribute('aria-expanded',String(expanded));
      content.inert = !expanded;
    }
    expandSaved(false);
    trigger.addEventListener('click', () => expandSaved(trigger.getAttribute('aria-expanded') !== 'true'));
    disclosure.addEventListener('keydown', event => {
      if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
        event.stopPropagation(); event.preventDefault(); expandSaved(false); trigger.focus({preventScroll:true});
      }
    });
  }
  const entriesByKey = new Map(panels.map(entry => [entry.key,entry]));
  const selectedButton = () => buttons.find(btn => btn.dataset.panel === selected);
  const pinKey = entry => `${entry.scope ? app : 'global'}:${entry.key}`;
  const isPinned = entry => pinned.has(pinKey(entry));

  function setCollapsed(entry, collapsed) {
    const restoreFocus = collapsed && entry.body.contains(document.activeElement);
    const changed = entry.panel.hasAttribute('data-collapsed') !== collapsed;
    entry.body.inert = collapsed;
    entry.body.setAttribute('aria-hidden',String(collapsed));
    if (changed && entry.panel.isConnected && !entry.panel.hidden && !reduced.matches) {
      entry.panel.dataset.disclosureAnimating = '';
      clearTimeout(entry.disclosureTimer);
      entry.disclosureTimer = setTimeout(() => {
        delete entry.panel.dataset.disclosureAnimating;
        scheduleLayout();
      }, 460);
    }
    entry.panel.toggleAttribute('data-collapsed',collapsed);
    entry.toggle.setAttribute('aria-expanded',String(!collapsed));
    const label = collapsed ? tr('Abrir painel','Expand panel') : tr('Fechar painel','Collapse panel');
    entry.toggle.setAttribute('aria-label',`${label}: ${entry.title}`);
    entry.toggle.title = label;
    if (restoreFocus) entry.toggle.focus({preventScroll:true});
  }

  function updatePin(entry) {
    const active = isPinned(entry);
    entry.pin.setAttribute('aria-pressed',String(active));
    entry.pin.title = active ? tr('Desafixar painel','Unpin panel') : tr('Fixar painel','Pin panel');
  }

  function togglePin(entry) {
    if (entry.panel.hidden) return;
    const key = pinKey(entry);
    if (pinned.has(key)) pinned.delete(key);
    else pinned.add(key);
    try { localStorage.setItem(pinStorage,JSON.stringify([...pinned])); } catch {}
    syncPanels();
    if (!entry.panel.hidden) entry.pin.scrollIntoView({block:'nearest'});
    else if (mobile.matches) back.focus({preventScroll:true});
    else buttons.find(btn => btn.dataset.panel === entry.key)?.focus({preventScroll:true});
  }

  function ring(button = hovered || selectedButton()) {
    if (!button || !button.offsetHeight) {
      indicator.style.opacity = '0';
      halo = null;
      return;
    }
    indicator.style.transitionTimingFunction = spring;
    indicator.style.translate = `0 ${button.offsetTop}px`;
    indicator.style.height = `${button.offsetHeight}px`;
    indicator.style.opacity = '1';
    halo = button;
  }

  function updateFades() {
    viewport.style.setProperty('--panel-fade-top',`${Math.max(0,Math.min(16,viewport.scrollTop))}px`);
    const remaining = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
    viewport.style.setProperty('--panel-fade-bottom',`${Math.max(0,Math.min(16,remaining))}px`);
  }
  viewport.addEventListener('scroll',updateFades,{passive:true});
  new ResizeObserver(() => { updateFades(); ring(halo || undefined); }).observe(viewport);

  const observer = new IntersectionObserver(entries => {
    if (reduced.matches) return;
    entries.filter(entry => entry.isIntersecting).forEach((entry,i) => {
      observer.unobserve(entry.target);
      entry.target.animate([
        {opacity:0, transform:'translateY(13px) scale(.93)'},
        {opacity:1, transform:'none'}
      ],{duration:460, delay:Math.min(i,6)*38, easing:spring, fill:'backwards'});
    });
  }, {root:viewport,threshold:.3});

  function appendGroup(title, entries, emptyMessage) {
    const heading = document.createElement('h3');
    heading.className = 'panel-list-group';
    heading.textContent = title;
    track.append(heading);
    if (!entries.length && emptyMessage) {
      const hint = document.createElement('p');
      hint.className = 'panel-list-no-app';
      hint.textContent = emptyMessage;
      track.append(hint);
    }
    for (const entry of entries) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'panel-list-row';
      row.dataset.panel = entry.key;
      row.setAttribute('aria-controls',entry.panel.id);
      const icon = entry.icon || (icons[entry.key] ? glyph(icons[entry.key])
        : iconOf(entry.scope === 'msg' ? app : entry.scope) || glyph(icons.general));
      row.innerHTML = `<span class="panel-list-icon" aria-hidden="true">${icon}</span><span class="panel-list-copy"></span><span class="panel-list-status" aria-hidden="true"></span>`;
      const text = row.querySelector('.panel-list-copy');
      const strong = document.createElement('strong');
      strong.textContent = entry.title;
      text.append(strong);
      if (desc[entry.key]) {
        const small = document.createElement('small');
        small.textContent = desc[entry.key];
        text.append(small);
      }
      row.addEventListener('click', event => open(entry.key, event.detail === 0 ? 'keyboard' : 'pointer'));
      row.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        hovered = row; ring(row);
      });
      row.addEventListener('focus', () => ring(row));
      track.append(row);
      observer.observe(row);
      buttons.push(row);
    }
  }

  function syncRows() {
    for (const button of buttons) {
      const entry = entriesByKey.get(button.dataset.panel);
      const fixed = String(isPinned(entry));
      button.setAttribute('aria-expanded',String(!entry.panel.hidden && (!mobile.matches || selected !== null)));
      if (selected === entry.key) button.setAttribute('aria-current','true');
      else button.removeAttribute('aria-current');
      if (button.dataset.pinned !== fixed) {
        button.dataset.pinned = fixed;
        button.lastElementChild.innerHTML = isPinned(entry) ? pinIcon : glyph('m9 5 7 7-7 7');
      }
    }
  }

  function layoutPanels() {
    const [primary, secondary] = stacks;
    const styles = getComputedStyle(primary);
    const max = parseFloat(styles.maxHeight) - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    const gap = parseFloat(styles.rowGap);
    const columns = [[],[]];
    let used = 0;
    if (roomForTwo.matches && right.offsetWidth && shownPanels.length > 1) {
      for (const entry of shownPanels) {
        const height = entry.panel.offsetHeight + (columns[0].length ? gap : 0);
        if (columns[0].length && used + height > max) columns[1].push(entry);
        else {
          columns[0].push(entry);
          used += height;
        }
      }
    } else {
      columns[0] = shownPanels;
    }
    const two = columns[1].length > 0;
    right.toggleAttribute('data-two-columns',two);
    const focused = document.activeElement;
    if (two) secondary.hidden = false;
    for (const [index, stack] of stacks.entries()) {
      let previous = index === 0 ? empty : null;
      for (const {panel} of columns[index]) {
        if ((previous ? previous.nextElementSibling : stack.firstElementChild) !== panel) {
          if (previous) previous.after(panel);
          else stack.prepend(panel);
        }
        previous = panel;
      }
    }
    if (!two) secondary.hidden = true;
    if (right.contains(focused) && focused.getClientRects().length && focused !== document.activeElement) {
      focused.focus({preventScroll:true});
    }
  }

  let layoutFrame = 0;
  function scheduleLayout() {
    if (layoutFrame || shownPanels.some(entry => entry.panel.hasAttribute('data-disclosure-animating'))) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      layoutPanels();
    });
  }
  const layoutObserver = new ResizeObserver(scheduleLayout);
  for (const entry of panels) layoutObserver.observe(entry.panel);
  window.addEventListener('resize',scheduleLayout);

  function syncPanels() {
    const active = entriesByKey.get(selected);
    const available = panels.filter(entry => !entry.scope || entry.panel.style.display !== 'none');
    const visible = [...pinned].map(key => available.find(entry => pinKey(entry) === key)).filter(Boolean);
    if (active && available.includes(active) && !visible.includes(active)) visible.push(active);
    for (const entry of panels) {
      updatePin(entry);
      entry.panel.hidden = !visible.includes(entry);
      if (!entry.panel.hidden && entry.details) entry.details.open = true;
    }
    shownPanels = visible;
    empty.hidden = visible.length > 0;
    document.body.toggleAttribute('data-panel-open',Boolean(active));
    layoutPanels();
    syncRows();
    ring();
  }

  function open(key, activation) {
    const entry = entriesByKey.get(key);
    if (entry?.scope && entry.panel.style.display === 'none') return;
    const changed = selected !== key;
    const wasVisible = entry && !entry.panel.hidden && (!mobile.matches || selected);
    selected = key;
    if (entry) setCollapsed(entry,false);
    syncPanels();
    if (entry && changed && !wasVisible && !reduced.matches && entry.panel.offsetHeight) {
      entry.panel.animate([{opacity:0,transform:`translate${mobile.matches ? 'Y' : 'X'}(15px) scale(.99)`},{opacity:1,transform:'none'}],
        {duration:380,easing:spring});
    }
    if (activation && entry && mobile.matches) {
      window.scrollTo(0,0);
      back.focus({preventScroll:true});
    } else if (activation === 'keyboard' && entry) {
      if (entry.heading.tagName !== 'BUTTON') entry.heading.tabIndex = -1;
      entry.heading.focus({preventScroll:true});
    }
    if (entry && (activation || mobile.matches)) entry.heading.scrollIntoView({block:'nearest'});
  }

  function sync(next) {
    if (next === app) return;
    app = next;
    const previous = entriesByKey.get(selected);
    if (previous?.scope && previous.panel.style.display === 'none') selected = null;
    syncPanels();
    renderList();
  }

  function renderList() {
    buttons = [];
    hovered = halo = null;
    observer.disconnect();
    track.replaceChildren(indicator);
    const contextual = panels.filter(entry => entry.scope && entry.panel.style.display !== 'none');
    contextual.sort((a,b) => appOrder.indexOf(a.key) - appOrder.indexOf(b.key));
    const storyPanels = globals.map(key => entriesByKey.get(key)).filter(Boolean);
    appendGroup(app === 'home' ? tr('Tela inicial e bloqueio','Home and Lock Screens') : CTX[app], contextual,
      tr('Este app não tem painéis próprios.','This app has no dedicated panels.'));
    appendGroup(tr('História','Story'), storyPanels);
    syncRows();
    viewport.scrollTop = 0;
    updateFades();
    ring();
  }

  track.addEventListener('pointerleave', () => { hovered = null; ring(); });
  track.addEventListener('focusout', event => { if (!track.contains(event.relatedTarget)) ring(); });
  track.addEventListener('keydown', event => {
    const current = buttons.indexOf(event.target);
    if (current < 0) return;
    const next = {ArrowUp:Math.max(0,current-1),ArrowDown:Math.min(buttons.length-1,current+1),Home:0,End:buttons.length-1}[event.key];
    if (next === undefined) return;
    event.preventDefault();
    buttons[next].focus();
  });
  function close() {
    const button = selectedButton();
    open(null);
    if (document.body.dataset.mobileView === 'stories') mobileView('edit',false);
    if (mobile.matches) window.scrollTo(0,0);
    button?.focus();
  }
  back.addEventListener('click',close);
  right.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) { event.preventDefault(); close(); }
  });
  let inStories = false;
  window.EditorPanelList = {
    sync,
    decorateActions,
    mobile(view) {
      if (view === 'stories') open('saved');
      else if (inStories && selected === 'saved') open(null);
      inStories = view === 'stories';
      syncRows();
    },
  };
  open(null);
  sync(cur || 'home');
})();
