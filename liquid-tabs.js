/* The upper copy of the tabs is visible only where the moving glass lens crosses it. */
const LiquidTabs = (() => {
  const selector = '.phone-tabbar,.clock-tabs,.third-tabs,.x-nav,.yt-nav';
  const selected = '[aria-current="page"],.active,.on';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let view, x, goal, velocity = 0, last = 0, frame = 0, drag, suppressClick = false;
  const center = button => button.offsetLeft + button.offsetWidth / 2;

  function paint() {
    if (!view) return;
    view.bar.style.setProperty('--glass-x', `${x}px`);
  }
  function animate(time) {
    frame = 0;
    if (!view?.bar.isConnected) return;
    const dt = Math.min((time - last) / 1000, .025) || 1 / 60;
    last = time;
    velocity += ((goal - x) * 420 - velocity * 31) * dt;
    x += velocity * dt;
    if (Math.abs(x - goal) < .15 && Math.abs(velocity) < 3) {
      x = goal;
      velocity = 0;
    } else frame = requestAnimationFrame(animate);
    paint();
  }
  function move(to, snap = false) {
    goal = to;
    if (snap || reduced.matches) {
      cancelAnimationFrame(frame);
      frame = velocity = 0;
      x = goal;
      paint();
    } else if (!frame && Math.abs(goal - x) > .15) {
      last = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }
  function measure(snap) {
    const {bar, buttons, active} = view;
    if (!bar.clientWidth) return;
    bar.style.setProperty('--glass-width', `${buttons[0].offsetWidth}px`);
    bar.style.setProperty('--glass-track', `${bar.clientWidth}px`);
    if (!drag) move(center(active), snap);
  }
  const resize = new ResizeObserver(() => { if (view) measure(!frame); });
  function sync(app, appKey) {
    const bar = appKey && app.querySelector(selector);
    if (bar && view?.bar === bar) return;
    const previous = view?.key;
    resize.disconnect();
    drag = null;
    view = null;
    const buttons = bar ? [...bar.children].filter(el => el.matches('button')) : [];
    const active = buttons.find(el => el.matches(selected));
    if (!active) {
      cancelAnimationFrame(frame);
      frame = velocity = 0;
      return;
    }
    const key = `${appKey}:${bar.className}`;
    view = {bar, buttons, active, key};
    bar.classList.add('liquid-tabs');
    bar.style.setProperty('--glass-count', buttons.length);
    const lens = document.createElement('div');
    lens.className = 'liquid-tabs-lens';
    lens.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div');
    copy.className = 'liquid-tabs-copy';
    buttons.forEach(button => {
      const item = document.createElement('span');
      for (const child of button.childNodes) item.append(child.cloneNode(true));
      item.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      copy.append(item);
    });
    lens.append(copy);
    bar.append(lens);
    measure(previous !== key || x == null);
    paint();
    resize.observe(bar);
  }
  document.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (!view || e.button !== 0 || !e.isPrimary || !view.bar.contains(e.target)) return;
    drag = {id:e.pointerId, start:e.clientX, y:e.clientY, origin:x, moved:false};
  });
  document.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId || !view?.bar.isConnected) return;
    const {bar, buttons} = view;
    const dx = e.clientX - drag.start, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      drag.moved = true;
      bar.classList.add('is-glass-dragging');
      bar.setPointerCapture(e.pointerId);
    }
    const scale = bar.getBoundingClientRect().width / bar.offsetWidth || 1;
    move(Math.max(center(buttons[0]), Math.min(center(buttons.at(-1)), drag.origin + dx / scale)), true);
  });
  function release(e) {
    if (!drag || drag.id !== e.pointerId || !view) return;
    const {bar, buttons, active} = view;
    // Touch pointers start out captured by the pressed button, before transfer to the bar.
    if (e.type === 'lostpointercapture' && e.target !== bar) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return;
    bar.classList.remove('is-glass-dragging');
    const target = e.type === 'pointerup'
      ? buttons.reduce((a, b) => Math.abs(center(a) - x) <= Math.abs(center(b) - x) ? a : b)
      : active;
    suppressClick = e.type === 'pointerup';
    move(center(target));
    if (target !== active) {
      target.click();
      view?.active.focus({preventScroll:true});
    }
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(type, release);
  document.addEventListener('click', e => {
    if (!suppressClick || !e.isTrusted || !e.detail) return;
    suppressClick = false;
    if (e.target.closest?.(selector)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  return {sync};
})();
