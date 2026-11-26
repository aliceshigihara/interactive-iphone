/* Keep native fields as the source of truth for forms and app state. */
(() => {
  const selector = 'select:not([hidden], [multiple], [size], [data-native-select])';
  const controls = new WeakMap();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
  const check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3.5 3.5L13 5"/></svg>';
  const bounds = (value, min, max) => Math.max(min, Math.min(value, max));
  let nextId = 0, current, exiting;

  function labelText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.matches?.('select,button,[aria-hidden="true"]')) return '';
    return Array.from(node.childNodes, labelText).join('');
  }

  function labelFor(select) {
    const ids = select.getAttribute('aria-labelledby');
    return (ids && ids.split(/\s+/).map(id => document.getElementById(id)?.textContent.trim()).filter(Boolean).join(' '))
      || select.getAttribute('aria-label')
      || Array.from(select.labels || [], label => labelText(label).trim()).filter(Boolean).join(' ')
      || (document.documentElement.lang === 'en' ? 'Options' : 'Opções');
  }

  function refresh(control) {
    const {select, trigger, value} = control;
    const option = select.selectedOptions[0];
    const text = option?.label || '—';
    if (value.textContent !== text) value.textContent = text;
    const name = `${labelFor(select)}: ${text}`;
    if (trigger.getAttribute('aria-label') !== name) trigger.setAttribute('aria-label', name);
    const disabled = select.matches(':disabled') || !select.options.length;
    if (trigger.disabled !== disabled) trigger.disabled = disabled;
    if (trigger.hidden !== select.hidden) trigger.hidden = select.hidden;
    trigger.setAttribute('aria-required', String(select.required));
  }

  function enhance(select) {
    if (controls.has(select)) return controls.get(select);
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'editor-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.innerHTML = `<span class="editor-select-value"></span>${chevron}`;
    const control = {select, trigger, value:trigger.firstElementChild};
    controls.set(select, control);
    select.insertAdjacentElement('afterend', trigger);
    select.classList.add('editor-select-source');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    select.addEventListener('focus', () => trigger.focus());
    refresh(control);
    trigger.addEventListener('click', () => {
      trigger.focus({preventScroll:true});
      if (current?.control === control) close();
      else open(control);
    });
    trigger.addEventListener('keydown', event => onKey(event, control));
    return control;
  }

  function activate(menu, index, reveal = false) {
    const entry = menu.options[index];
    if (!entry || index === menu.active) return;
    menu.options[menu.active]?.row.removeAttribute('data-active');
    menu.active = index;
    entry.row.dataset.active = '';
    menu.control.trigger.setAttribute('aria-activedescendant', entry.row.id);
    if (reveal) {
      const top = entry.row.offsetTop - 4;
      const bottom = entry.row.offsetTop + entry.row.offsetHeight + 4;
      if (top < menu.list.scrollTop) menu.list.scrollTop = top;
      else if (bottom > menu.list.scrollTop + menu.list.clientHeight) menu.list.scrollTop = bottom - menu.list.clientHeight;
    }
    Object.assign(menu.highlight.style, {
      height: `${entry.row.offsetHeight}px`,
      transform: `translateY(${entry.row.offsetTop}px)`
    });
  }

  function position(menu, align = false) {
    const anchor = menu.control.trigger.getBoundingClientRect();
    if (!anchor.width || !anchor.height) return false;
    const viewport = window.visualViewport;
    const left = (viewport?.offsetLeft || 0) + 8;
    const top = (viewport?.offsetTop || 0) + 8;
    const right = left + (viewport?.width || innerWidth) - 16;
    const bottom = top + (viewport?.height || innerHeight) - 16;
    if (anchor.bottom < top || anchor.top > bottom) return false;
    const width = Math.min(Math.max(anchor.width, 160), right - left);
    const x = bounds(anchor.left - (width - anchor.width) / 2, left, right - width);
    const height = Math.min(310, (bottom - top) * .66);
    Object.assign(menu.list.style, {width:`${width}px`, maxHeight:`${height}px`, left:`${x}px`});
    const row = menu.options[menu.active]?.row;
    if (align && row) menu.list.scrollTop = row.offsetTop + row.offsetHeight / 2 - menu.list.clientHeight / 2;
    if (align) menu.anchorOffset = row ? row.offsetTop + row.offsetHeight / 2 - menu.list.scrollTop : 0;
    const y = bounds(anchor.top + anchor.height / 2 - menu.anchorOffset, top, bottom - menu.list.offsetHeight);
    menu.list.style.top = `${y}px`;
    return true;
  }

  function morph(menu, closing) {
    if (reducedMotion.matches || !menu.list.animate) return null;
    const anchor = menu.control.trigger.getBoundingClientRect();
    const rect = menu.list.getBoundingClientRect();
    const full = {transform:'none', clipPath:'inset(0px round 13px)', opacity:1};
    const insetTop = bounds(anchor.top - rect.top, 0, rect.height);
    const insetBottom = bounds(rect.bottom - anchor.bottom, 0, rect.height - insetTop);
    const folded = {
      transform:`translateY(${bounds(anchor.top - rect.top, -10, 10) * .35}px) scale(.96)`,
      clipPath:`inset(${insetTop}px 0px ${insetBottom}px round 13px)`,
      opacity:0
    };
    return menu.list.animate(closing ? [full, folded] : [folded, full], {
      duration:closing ? 150 : 220,
      easing:'cubic-bezier(.22,.75,.28,1)',
      fill:'both'
    });
  }

  function open(control, start) {
    close(false);
    exiting?.remove();
    refresh(control);
    if (control.trigger.disabled) return;
    const list = document.createElement('div');
    list.className = 'editor-select-list';
    list.id = `editor-select-list-${++nextId}`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', labelFor(control.select));
    const options = Array.from(control.select.options).flatMap((option, nativeIndex) => {
      if (option.hidden || option.closest('optgroup')?.hidden) return [];
      const row = document.createElement('div');
      row.id = `${list.id}-${nativeIndex}`;
      row.className = 'editor-select-option';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(option.selected));
      if (option.matches(':disabled')) row.setAttribute('aria-disabled', 'true');
      const text = document.createElement('span');
      text.textContent = option.label;
      row.append(text);
      if (option.selected) row.insertAdjacentHTML('beforeend', check);
      return [{option, row, nativeIndex}];
    });
    if (!options.length) return;
    const highlight = document.createElement('div');
    highlight.className = 'editor-select-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    list.append(highlight, ...options.map(entry => entry.row));
    const modal = control.trigger.closest('dialog[open]');
    (modal || document.body).append(list);
    if (list.showPopover) {
      list.popover = 'manual';
      list.showPopover();
    }
    const enabled = options.flatMap(({option}, index) => option.matches(':disabled') ? [] : [index]);
    const menu = {control, list, highlight, options, enabled, active:-1, search:'', typedAt:0, anchorOffset:0};
    current = menu;
    control.trigger.setAttribute('aria-controls', list.id);
    control.trigger.setAttribute('aria-expanded', 'true');
    const selected = enabled.find(index => options[index].option.selected);
    activate(menu, start === 'last' ? enabled.at(-1) : start === 'first' ? enabled[0] : selected ?? enabled[0]);
    if (!position(menu, true)) return close(false);
    menu.animation = morph(menu, false);
    menu.animation?.finished.then(() => {
      if (current === menu) {
        menu.animation.cancel();
        position(menu);
      }
    }, () => {});
    requestAnimationFrame(() => highlight.classList.add('is-ready'));
    list.addEventListener('mousedown', event => event.preventDefault());
    for (const index of enabled) {
      const {row} = options[index];
      row.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'touch') activate(menu, index);
      });
      row.addEventListener('click', () => commit(menu, index));
    }
  }

  function close(animate = true) {
    if (!current) return;
    const {control, list, animation} = current;
    const menu = current;
    current = null;
    control.trigger.setAttribute('aria-expanded', 'false');
    control.trigger.removeAttribute('aria-activedescendant');
    control.trigger.removeAttribute('aria-controls');
    animation?.cancel();
    list.setAttribute('aria-hidden', 'true');
    list.inert = true;
    const exit = animate && control.trigger.isConnected ? morph(menu, true) : null;
    if (!exit) return list.remove();
    exiting = list;
    const remove = () => {
      list.remove();
      if (exiting === list) exiting = null;
    };
    exit.finished.then(remove, remove);
  }

  function commit(menu, index) {
    if (menu !== current || !menu.enabled.includes(index)) return;
    const {select, trigger} = menu.control;
    const {nativeIndex, option} = menu.options[index];
    if (select.options[nativeIndex] !== option || option.matches(':disabled')) return close(false);
    close();
    if (nativeIndex === select.selectedIndex) return;
    select.selectedIndex = nativeIndex;
    refresh(menu.control);
    const wasFocused = document.activeElement === trigger;
    const host = trigger.parentElement;
    const id = select.id;
    const parent = host?.parentElement;
    const slot = parent ? [...parent.children].indexOf(host) : -1;
    select.dispatchEvent(new Event('input', {bubbles:true}));
    select.dispatchEvent(new Event('change', {bubbles:true}));
    if (wasFocused && !trigger.isConnected && document.activeElement === document.body) {
      const replacement = id ? document.getElementById(id) : parent?.children[slot]?.querySelector(selector);
      if (replacement?.matches(selector)) enhance(replacement).trigger.focus({preventScroll:true});
    }
  }

  function onKey(event, control) {
    const {key} = event;
    const menu = current?.control === control ? current : null;
    if (key === 'Tab') { if (menu) close(); return; }
    if (key === 'Escape' && menu) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(key)) {
      event.preventDefault();
      if (!menu) return open(control, key === 'Home' ? 'first' : key === 'End' ? 'last' : null);
      if (key === 'Enter' || key === ' ') return commit(menu, menu.active);
      const {enabled} = menu;
      const next = enabled.indexOf(menu.active) + (key === 'ArrowDown' ? 1 : -1);
      activate(menu, key === 'Home' ? enabled[0] : key === 'End' ? enabled.at(-1) : enabled[bounds(next, 0, enabled.length - 1)], true);
    } else if (key.length === 1) {
      if (!menu) open(control);
      if (!current) return;
      event.preventDefault();
      const activeMenu = current;
      const letter = key.toLocaleLowerCase(), now = performance.now();
      const previous = now - activeMenu.typedAt < 650 ? activeMenu.search : '';
      activeMenu.search = previous + letter;
      activeMenu.typedAt = now;
      const repeat = [...activeMenu.search].every(char => char === letter);
      const query = repeat ? letter : activeMenu.search;
      const enabled = activeMenu.enabled;
      const offset = enabled.indexOf(activeMenu.active) + (repeat ? 1 : 0);
      const order = enabled.slice(offset).concat(enabled.slice(0, offset));
      const index = order.find(i => activeMenu.options[i].option.label.toLocaleLowerCase().startsWith(query));
      activate(activeMenu, index, true);
    }
  }

  document.addEventListener('pointerdown', event => {
    if (current && !current.list.contains(event.target) && !current.control.trigger.contains(event.target)) close();
  }, true);
  document.addEventListener('focusin', event => {
    if (current && event.target !== current.control.trigger && !current.list.contains(event.target)) close();
  });
  document.addEventListener('click', event => {
    const label = event.target.closest('label');
    const control = controls.get(label?.control);
    if (!control || event.target.closest('button,input,select,textarea,a')) return;
    event.preventDefault();
    control.trigger.focus({preventScroll:true});
    control.trigger.click();
  }, true);
  document.addEventListener('change', event => {
    const control = controls.get(event.target);
    if (control) refresh(control);
  }, true);
  document.addEventListener('reset', event => {
    requestAnimationFrame(() => event.target.querySelectorAll(selector).forEach(select => refresh(enhance(select))));
  });
  const reposition = event => {
    if (current && event.target !== current.list && !position(current)) close(false);
  };
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  window.visualViewport?.addEventListener('resize', reposition);
  window.visualViewport?.addEventListener('scroll', reposition);

  document.querySelectorAll(selector).forEach(enhance);
  new MutationObserver(records => {
    const updates = new Set();
    for (const record of records) {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      const select = target?.closest('select');
      if (select) {
        updates.add(select);
        if (current?.control.select === select) close(false);
      }
      if (target?.matches('fieldset') && record.attributeName === 'disabled') {
        target.querySelectorAll(selector).forEach(item => updates.add(item));
      }
      const labelled = target?.closest('label')?.control;
      if (labelled?.matches('select')) updates.add(labelled);
      for (const node of record.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(selector)) updates.add(node);
        node.querySelectorAll(selector).forEach(item => updates.add(item));
      }
    }
    for (const select of updates) {
      if (!select.isConnected) continue;
      const control = controls.get(select) || (select.matches(selector) && enhance(select));
      if (control) refresh(control);
    }
    if (current && (!current.control.trigger.isConnected || current.control.trigger.disabled || !position(current))) close(false);
  }).observe(document.body, {
    subtree:true, childList:true, characterData:true, attributes:true,
    attributeFilter:['disabled','hidden','label','selected','aria-label','aria-labelledby','required','open']
  });
})();
