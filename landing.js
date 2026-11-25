(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // Scanner: a diagonal beam moves across a field of blue interference lines.
  const canvas = document.querySelector('#scanner');
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, lastFrame = 0, scanFrame = 0, scanVisible = true, pointer = null;
  function measureScanner() {
    const pixels = Math.min(devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * pixels);
    canvas.height = Math.round(height * pixels);
    ctx?.setTransform(pixels,0,0,pixels,0,0);
    drawScanner();
  }
  function drawScanner(now = performance.now()) {
    if (!ctx || !width || !height) return;
    const time = motion.matches ? 0 : now / 1000;
    const dark = root.dataset.theme === 'dark';
    const span = Math.hypot(width,height);
    const beam = ((time*.30 + .54) % 2 - .35) * span;
    const spacing = width < 650 ? 15 : 18;
    const sample = Math.max(13,Math.round(width/85));
    ctx.clearRect(0,0,width,height);
    for (let row = -4; row < height / spacing + 4; row++) {
      const base = row * spacing;
      const intercept = (beam - base*.58)/.82;
      const light = Math.min(.999,Math.max(.001,intercept/width));
      const inFrame = intercept > -100 && intercept < width+100;
      const fade = Math.min(1,Math.max(0,(base+20)/160),Math.max(0,(height-base+80)/212));
      const gradient = ctx.createLinearGradient(0,0,width,0);
      const deep = dark ? `rgba(96,165,250,${.19*fade})` : `rgba(30,58,138,${.20*fade})`;
      const ice = dark ? `rgba(255,255,255,${.50*fade})` : `rgba(75,141,249,${.48*fade})`;
      gradient.addColorStop(0,deep);
      if (inFrame) {
        const band = Math.min(.22,82/width);
        gradient.addColorStop(Math.max(0,light-band),deep);
        gradient.addColorStop(light,ice);
        gradient.addColorStop(Math.min(1,light+band),deep);
      }
      gradient.addColorStop(1,deep);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = row % 7 === 0 ? 1.3 : .75;
      ctx.beginPath();
      for (let x = 0; x < width+sample; x += sample) {
        const u = x/width;
        const warp = Math.sin(u*6.1 + base*.0036 - time*.22) * (23+base*.017)
          + Math.cos(u*10.4 + row*.11 + time*.28)*12;
        const lens = pointer && !motion.matches ? 17*Math.exp(-((x-pointer.x)**2+(base-pointer.y)**2)/23000) : 0;
        const y = base+warp+lens;
        if (x === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
  }
  root.addEventListener('themechange', () => drawScanner());
  function scannerTick(now) {
    scanFrame = 0;
    if (motion.matches || document.hidden || !scanVisible) return;
    if (now - lastFrame >= 31) { drawScanner(now); lastFrame = now; }
    scanFrame = requestAnimationFrame(scannerTick);
  }
  function scheduleScanner() {
    cancelAnimationFrame(scanFrame);
    scanFrame = !motion.matches && !document.hidden && scanVisible ? requestAnimationFrame(scannerTick) : 0;
  }
  if (ctx) {
    new ResizeObserver(measureScanner).observe(canvas);
    new IntersectionObserver(([entry]) => { scanVisible = entry.isIntersecting; scheduleScanner(); }).observe(canvas);
    addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || motion.matches) return;
      const box = canvas.getBoundingClientRect();
      pointer = {x:event.clientX-box.left,y:event.clientY-box.top};
    }, {passive:true});
    document.addEventListener('pointerleave', () => { pointer = null; });
    document.addEventListener('visibilitychange', scheduleScanner);
    motion.addEventListener('change', () => { drawScanner(); scheduleScanner(); });
    scheduleScanner();
  }

  // Text Pressure: each letter has its own weight and width axes.
  const title = document.querySelector('.pressure');
  const word = title.textContent;
  const letters = Array.from(word, char => {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden','true');
    span.textContent = char;
    return span;
  });
  title.setAttribute('aria-label',word);
  title.replaceChildren(...letters);
  let textFrame = 0, target = null, pressurePoint = null, ripple = null, lastTextTime = 0;
  let titleVisible = true, idleClock = 0, engagement = 0;
  function wakeTitle() {
    if (motion.matches || document.hidden || !titleVisible || textFrame) return;
    lastTextTime = 0;
    textFrame = requestAnimationFrame(drawTitle);
  }
  function drawTitle(now) {
    textFrame = 0;
    if (motion.matches || document.hidden || !titleVisible) return;
    if (lastTextTime && now-lastTextTime < 31) {
      textFrame = requestAnimationFrame(drawTitle);
      return;
    }
    const box = title.getBoundingClientRect();
    const inside = target && target.x >= box.left && target.x <= box.right && target.y >= box.top && target.y <= box.bottom;
    const origin = target ?? {x:box.left+box.width/2,y:box.top+box.height/2};
    pressurePoint ??= {...origin};
    const dt = lastTextTime ? Math.min(48,now-lastTextTime) : 16;
    lastTextTime = now;
    const follow = 1-Math.exp(-dt/110);
    pressurePoint.x += (origin.x-pressurePoint.x)*follow;
    pressurePoint.y += (origin.y-pressurePoint.y)*follow;
    const goal = inside ? 1 : 0;
    engagement += (goal-engagement)*(1-Math.exp(-dt/170));
    if (Math.abs(goal-engagement)<.002) engagement = goal;
    idleClock = (idleClock+dt) % 3900;
    const radius = Math.max(62,box.width*.46);
    const age = ripple ? Math.max(0,now-ripple.time)/1000 : 0;
    if (age > 1.1) ripple = null;
    const values = letters.map((letter,i) => {
      const rect = letter.getBoundingClientRect();
      const x = rect.left+rect.width/2, y = rect.top+rect.height/2;
      const pointerPower = Math.max(0,1-Math.hypot(pressurePoint.x-x,pressurePoint.y-y)/radius);
      // Let a crest travel across the word even when nobody is pointing at it.
      const crest = .5+.5*Math.cos(2*Math.PI*(i/letters.length-idleClock/3900));
      let power = crest**2*(1-engagement)+pointerPower*engagement;
      if (ripple) {
        const ring = Math.hypot(ripple.x-x,ripple.y-y)-age*box.width*1.2;
        const swell = Math.max(0,1-Math.abs(ring)/(radius*.35))*(1-age/1.1)*.75;
        power += (1-power)*swell;
      }
      return [String(Math.round(100+900*power)),String(Math.min(151,Math.max(25,Math.round(5+200*power))))];
    });
    letters.forEach((letter,i) => {
      const [weight,width] = values[i];
      if (letter.style.getPropertyValue('--weight') === weight && letter.style.getPropertyValue('--width') === width) return;
      letter.style.setProperty('--weight',weight);
      letter.style.setProperty('--width',width);
    });
    textFrame = requestAnimationFrame(drawTitle);
  }
  function trackTitle(event) {
    if (motion.matches) return;
    target = {x:event.clientX,y:event.clientY};
    wakeTitle();
  }
  function restTitle() {
    target = null;
    wakeTitle();
  }
  function syncTitleMotion() {
    if (!motion.matches) {
      title.classList.add('is-reactive');
      wakeTitle();
      return;
    }
    cancelAnimationFrame(textFrame);
    textFrame = 0;
    pressurePoint = target = ripple = null;
    engagement = 0;
    title.classList.remove('is-reactive');
    letters.forEach(letter => { letter.style.removeProperty('--weight');letter.style.removeProperty('--width'); });
  }
  window.addEventListener('pointermove',trackTitle,{passive:true});
  title.addEventListener('pointerdown',event => {
    if (motion.matches) return;
    ripple = {x:event.clientX,y:event.clientY,time:performance.now()};
    trackTitle(event);
  }, {passive:true});
  for (const type of ['pointerup','pointercancel']) window.addEventListener(type,event => {
    if (event.pointerType !== 'mouse') restTitle();
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',restTitle);
  window.addEventListener('resize',wakeTitle,{passive:true});
  window.addEventListener('scroll',wakeTitle,{passive:true});
  new IntersectionObserver(([entry]) => {
    titleVisible = entry.isIntersecting;
    if (titleVisible) wakeTitle();
  }).observe(title);
  document.addEventListener('visibilitychange',wakeTitle);
  document.fonts?.ready.then(wakeTitle);
  motion.addEventListener('change',syncTitleMotion);
  syncTitleMotion();

  // Ghost Type: keep the prefix in place and accept the faint completion at the caret.
  const subtitle = document.querySelector('[data-ghost-type]');
  if (subtitle && 'IntersectionObserver' in window) {
    const text = subtitle.textContent.trim(), prefix = SiteLanguage.text('Crie histórias','Create stories');
    const original = text.slice(prefix.length);
    const completions = [SiteLanguage.text(' em mensagens, posts e ligações.', ' through messages, posts, and calls.'), original];
    const spoken = document.createElement('span');
    spoken.className = 'sr-only';
    spoken.textContent = text;
    const visual = document.createElement('span');
    visual.className = 'ghost-display';
    visual.setAttribute('aria-hidden', 'true');
    for (const completion of completions) {
      const reserve = document.createElement('span');
      reserve.className = 'ghost-reserve';
      reserve.textContent = prefix + completion;
      visual.append(reserve);
    }
    const line = document.createElement('span');
    const typed = document.createElement('span'), guess = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'ghost-caret';
    guess.className = 'ghost-completion';
    line.append(typed, caret, guess);
    visual.append(line);
    subtitle.replaceChildren(spoken, visual);
    let timer = 0, visible = false;
    const render = (completion, length, typing) => {
      typed.textContent = prefix + completion.slice(0,length);
      caret.hidden = !typing;
      guess.textContent = typing ? completion.slice(length) : '';
    };
    function synchronizeGhost() {
      clearTimeout(timer);
      render(original, original.length, false);
      if (!visible || document.hidden || motion.matches) return;
      const tick = (index, length, removing = false) => {
        const completion = completions[index];
        render(completion, length, true);
        if (removing) {
          if (length) timer = setTimeout(() => tick(index,length - 1,true),17);
          else timer = setTimeout(() => tick(index + 1,0),140);
        } else if (length < completion.length) {
          timer = setTimeout(() => tick(index,length + 1),length === 0 ? 360 : 30);
        } else if (index < completions.length - 1) {
          timer = setTimeout(() => tick(index,length - 1,true),1030);
        } else {
          timer = setTimeout(() => render(original,original.length,false),700);
        }
      };
      tick(0,0);
    }
    new IntersectionObserver(([entry]) => {
      const next = entry.intersectionRatio >= .4;
      if (next === visible) return;
      visible = next;
      synchronizeGhost();
    }, { threshold: .4 }).observe(subtitle);
    document.addEventListener('visibilitychange', synchronizeGhost);
    window.addEventListener('pageshow', event => { if (event.persisted) synchronizeGhost(); });
    motion.addEventListener('change', synchronizeGhost);
    synchronizeGhost();
  }

  const arc = document.querySelector('.app-arc');
  if (arc) {
    const apps = [...arc.querySelectorAll('.arc-app')];
    const previews = apps.map(app => document.getElementById(app.getAttribute('aria-controls')));
    const rail = arc.querySelector('.arc-display');
    const mobileArc = matchMedia('(max-width: 700px), (pointer: coarse) and (max-width: 900px)');
    let current = 0, lastWheel = -Infinity, capturedWheel = false, scrollFrame = 0;
    arc.classList.add('arc-enhanced');
    function selectApp(next, moveRail = true, behavior = motion.matches ? 'instant' : 'smooth') {
      if (next < 0 || next >= apps.length) return false;
      current = next;
      apps.forEach((app,i) => {
        const half = Math.floor(apps.length / 2);
        const slot = (i - next + half + apps.length) % apps.length - half;
        const prior = Number(app.style.getPropertyValue('--arc-slot') || slot);
        app.classList.toggle('arc-jump', Math.abs(prior - slot) > 2);
        app.style.setProperty('--arc-slot', slot);
        app.style.setProperty('--arc-x', 3 - Math.abs(slot) ** 1.6);
        app.style.setProperty('--arc-opacity', [1,.87,.72][Math.abs(slot)]);
        app.setAttribute('aria-pressed', String(i === next));
        previews[i].hidden = !mobileArc.matches && i !== next;
      });
      if (mobileArc.matches && moveRail) {
        const left = rail.scrollLeft + previews[next].getBoundingClientRect().left - rail.getBoundingClientRect().left;
        rail.scrollTo({ left, behavior });
      }
      return true;
    }
    function layoutArc() {
      rail.setAttribute('aria-live', mobileArc.matches ? 'off' : 'polite');
      if (!mobileArc.matches) rail.scrollLeft = 0;
      selectApp(current, true, 'instant');
    }
    layoutArc();
    mobileArc.addEventListener('change', layoutArc);
    rail.addEventListener('scroll', () => {
      if (!mobileArc.matches || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (!mobileArc.matches) return;
        const left = rail.getBoundingClientRect().left;
        let nearest = 0, distance = Infinity;
        previews.forEach((panel,i) => {
          const gap = Math.abs(panel.getBoundingClientRect().left - left);
          if (gap < distance) { distance = gap; nearest = i; }
        });
        if (nearest !== current) selectApp(nearest, false);
      });
    }, { passive: true });
    apps.forEach((app,i) => app.addEventListener('click', () => selectApp(i)));
    arc.addEventListener('wheel', event => {
      if (mobileArc.matches || event.ctrlKey || !event.deltaY || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      const at = performance.now();
      if (at - lastWheel > 140) capturedWheel = selectApp(current + Math.sign(event.deltaY));
      lastWheel = at;
      if (capturedWheel && event.cancelable) event.preventDefault();
    }, { passive: false });
    arc.addEventListener('keydown', event => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? apps.length - 1 : current + dir;
      if (!Number.isInteger(next) || !selectApp(next)) return;
      event.preventDefault();
      apps[next].focus({ preventScroll: true });
    });
  }

  const manifesto = document.querySelector('[data-staggered-text]');
  if (manifesto && 'IntersectionObserver' in window) {
    let index = 0;
    manifesto.querySelectorAll('.stagger-line').forEach(line => {
      const tokens = line.textContent.trim().split(/(\s+)/u);
      line.replaceChildren(...tokens.map(text => {
        if (!text.trim()) return text;
        const word = document.createElement('span');
        word.className = 'stagger-word';
        word.textContent = text;
        word.style.setProperty('--stagger-at', `${index++ * 77}ms`);
        return word;
      }));
    });
    manifesto.classList.add('stagger-pending');
    const reveal = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= .25) manifesto.classList.replace('stagger-pending', 'stagger-in');
      else if (!entry.isIntersecting) manifesto.classList.replace('stagger-in', 'stagger-pending');
    }, { threshold: [0,.25] });
    reveal.observe(manifesto);
  }

  // Card Swap: a 3D deck that sends the front card to the back on a timer or a fling.
  const deckRoot = document.querySelector('#tool-deck');
  if (deckRoot) {
    const stage = deckRoot.querySelector('.card-swap-stage');
    const slots = [...stage.querySelectorAll('.card-swap-slot')];
    const cards = slots.map(slot => slot.querySelector('.tool-card'));
    const shades = slots.map(slot => slot.querySelector('.card-swap-shade'));
    const status = document.querySelector('#tool-status');
    const count = slots.length;
    const PERSPECTIVE = 900, TAU = Math.PI * 2, STEP = 1 / 240, PAD = 32;
    const AXES = ['x', 'y', 'z', 'r', 'p'];
    const DOWN = { x: 0, y: 1 };
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const settings = {
      width: 460, height: 340, cardDistance: 60, verticalDistance: 70, depth: 90,
      skew: 6, visible: clamp(4, 1, count), delay: 4000, speed: 1, bounce: .35,
      parallax: .5, hoverSpread: .12, dim: .5
    };

    const stackBounds = ({ width, height, cardDistance, verticalDistance, depth, skewAmount, visible, hoverSpread }) => {
      const slope = Math.tan((skewAmount * Math.PI) / 180);
      const spread = 1 + Math.max(0, hoverSpread);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < visible; i++) {
        const scale = PERSPECTIVE / (PERSPECTIVE + i * depth);
        for (const u of [-width / 2, width / 2]) {
          for (const v of [-height / 2, height / 2]) {
            const x = (i * cardDistance * spread + u) * scale;
            const y = (-i * verticalDistance * spread + v + u * slope) * scale;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      return {
        width: Math.ceil(maxX - minX + PAD * 2),
        height: Math.ceil(maxY - minY + PAD * 2),
        originX: PAD - minX,
        originY: PAD - minY
      };
    };

    const bounds = stackBounds({
      width: settings.width,
      height: settings.height,
      cardDistance: settings.cardDistance,
      verticalDistance: settings.verticalDistance,
      depth: settings.depth,
      skewAmount: settings.skew,
      visible: settings.visible,
      hoverSpread: settings.hoverSpread
    });

    const styleVars = {
      '--swap-w': `${settings.width}px`,
      '--swap-h': `${settings.height}px`,
      '--swap-ox': `${bounds.originX}px`,
      '--swap-oy': `${bounds.originY}px`,
      '--swap-stage-w': `${bounds.width}px`,
      '--swap-stage-h': `${bounds.height}px`,
      '--swap-ratio': `${bounds.width} / ${bounds.height}`,
      '--swap-radius': '18px'
    };
    for (const [name, value] of Object.entries(styleVars)) deckRoot.style.setProperty(name, value);

    const deck = Array.from({ length: count }, (_, index) => ({
      el: slots[index], shade: shades[index], index,
      pos: index, from: index, hold: 0, nudge: 0, phase: 'rest',
      dir: { x: 0, y: 1 }, tilt: 0, top: 0, under: false,
      x: 0, y: 0, z: 0, r: 0, p: 0,
      v: { x: 0, y: 0, z: 0, r: 0, p: 0 }
    }));

    const state = {
      order: deck.map(card => card.index), raf: 0, last: 0, timer: 0, queue: [],
      layers: 0, scale: 1, hovered: false, overCard: false, inView: false,
      drag: null, spread: 0, spreadV: 0, px: 0, py: 0, pvx: 0, pvy: 0,
      tx: 0, ty: 0, dragged: false, focused: false
    };

    const slot = (position, config = settings) => {
      const q = Math.min(position, config.visible);
      const spread = 1 + state.spread;
      return { x: q * config.cardDistance * spread, y: -q * config.verticalDistance * spread, z: -q * config.depth, r: 0, p: q };
    };

    const clearance = (config, dir) => Math.abs(dir.x) * config.width + Math.abs(dir.y) * config.height + 12;

    const targetOf = (card, config, time) => {
      if (card.phase === 'exit') {
        const base = slot(0, config);
        const reach = clearance(config, card.dir) * 1.3;
        return { x: base.x + card.dir.x * reach, y: base.y + card.dir.y * reach, z: base.z, r: card.tilt, p: 0 };
      }
      if (card.phase === 'enter') {
        const base = slot(0, config);
        return { x: base.x, y: base.y + clearance(config, DOWN) * 1.3, z: base.z, r: 0, p: card.p };
      }
      const position = (time < card.hold ? card.from : card.pos) + card.nudge;
      return slot(Math.max(0, position), config);
    };

    const layerOf = card => {
      if (card.top) return 1000 + card.top;
      if (card.under) return 1;
      return 10 + (count - card.pos) * 2;
    };

    const write = (card, config) => {
      const { el, shade } = card;
      if (!el) return;
      el.style.transform = `translate3d(${card.x.toFixed(2)}px, ${card.y.toFixed(2)}px, ${card.z.toFixed(2)}px) rotate(${card.r.toFixed(3)}deg) skewY(${config.skew}deg)`;
      el.style.zIndex = String(layerOf(card));
      const fade = clamp(config.visible - card.p, 0, 1);
      el.style.opacity = fade < 1 ? fade.toFixed(3) : '';
      el.style.visibility = fade <= 0.001 ? 'hidden' : '';
      if (shade) {
        const depthT = clamp(card.p / Math.max(1, config.visible - 1), 0, 1);
        shade.style.opacity = (config.dim * 0.62 * depthT).toFixed(3);
      }
      el.style.cursor = card.phase === 'drag' ? 'grabbing' : card.pos > 0 ? 'pointer' : 'grab';
      if (card.pos === 0) el.setAttribute('data-front', '');
      else el.removeAttribute('data-front');
    };

    const writeStage = config => {
      const ox = bounds.originX + state.px;
      const oy = bounds.originY + state.py;
      stage.style.perspectiveOrigin = `${ox.toFixed(2)}px ${oy.toFixed(2)}px`;
    };

    const integrate = (card, target, omega, zeta, dt) => {
      const k = omega * omega;
      const d = 2 * zeta * omega;
      const steps = Math.max(1, Math.ceil(dt / STEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        for (const axis of AXES) {
          const velocity = card.v[axis] + (k * (target[axis] - card[axis]) - d * card.v[axis]) * h;
          card.v[axis] = velocity;
          card[axis] += velocity * h;
        }
      }
    };

    const scalar = (value, velocity, target, omega, zeta, dt) => {
      const k = omega * omega;
      const d = 2 * zeta * omega;
      const steps = Math.max(1, Math.ceil(dt / STEP));
      const h = dt / steps;
      let x = value;
      let v = velocity;
      for (let i = 0; i < steps; i++) {
        v += (k * (target - x) - d * v) * h;
        x += v * h;
      }
      return [x, v];
    };

    const frame = time => {
      state.raf = 0;
      const config = settings;
      const reduce = motion.matches;
      const dt = state.last ? Math.min(0.05, (time - state.last) / 1000) : 1 / 60;
      state.last = time;
      const restOmega = TAU * 1.7 * config.speed;
      const restZeta = reduce ? 1 : 1 - 0.72 * config.bounce;
      const exitOmega = TAU * 1.9 * config.speed;
      let busy = false;

      const spreadTarget = state.hovered && !reduce ? config.hoverSpread : 0;
      [state.spread, state.spreadV] = scalar(state.spread, state.spreadV, spreadTarget, TAU * 1.4, 0.9, dt);
      [state.px, state.pvx] = scalar(state.px, state.pvx, reduce ? 0 : state.tx, TAU * 1.1, 1, dt);
      [state.py, state.pvy] = scalar(state.py, state.pvy, reduce ? 0 : state.ty, TAU * 1.1, 1, dt);
      if (Math.abs(state.spread - spreadTarget) > 0.0005 || Math.abs(state.spreadV) > 0.0005 ||
          Math.abs(state.px - state.tx) > 0.05 || Math.abs(state.py - state.ty) > 0.05 ||
          Math.abs(state.pvx) + Math.abs(state.pvy) > 0.05) busy = true;
      writeStage(config);

      for (const card of deck) {
        if (card.phase === 'drag') {
          busy = true;
          write(card, config);
          continue;
        }
        const target = targetOf(card, config, time);
        const moving = card.phase === 'exit' || card.phase === 'enter';
        integrate(card, target, moving ? exitOmega : restOmega, moving ? 1 : restZeta, dt);
        if (card.phase === 'exit') {
          const base = slot(0, config);
          const travelled = (card.x - base.x) * card.dir.x + (card.y - base.y) * card.dir.y;
          if (travelled >= clearance(config, card.dir)) {
            card.phase = 'rest';
            card.top = 0;
            card.hold = 0;
          }
        } else if (card.phase === 'enter') {
          const base = slot(0, config);
          if (card.y - base.y >= clearance(config, DOWN)) {
            card.phase = 'rest';
            card.under = false;
            card.hold = 0;
          }
        }
        if (card.hold > time || card.phase !== 'rest') busy = true;
        for (const axis of AXES) {
          const limit = axis === 'p' ? 0.001 : 0.02;
          if (Math.abs(target[axis] - card[axis]) > limit || Math.abs(card.v[axis]) > limit) busy = true;
        }
        write(card, config);
      }

      if (busy) {
        state.raf = requestAnimationFrame(frame);
      } else {
        state.last = 0;
        for (const card of deck) if (card.top && card.phase === 'rest') card.top = 0;
      }
    };

    const wake = () => { if (!state.raf) state.raf = requestAnimationFrame(frame); };

    const paused = () => !motion.matches &&
      (count < 2 || state.overCard || state.focused || state.drag || !state.inView || document.visibilityState === 'hidden');

    const schedule = () => {
      clearTimeout(state.timer);
      state.timer = 0;
      if (paused() || motion.matches) return;
      state.timer = window.setTimeout(() => {
        state.timer = 0;
        shift(1);
      }, Math.max(400, settings.delay));
    };

    const updateCaption = index => {
      const card = cards[index];
      if (!card) return;
      status.textContent = `${card.dataset.title}. ${card.dataset.copy}`;
      cards.forEach((item, position) => {
        if (position === index) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
      });
    };

    const settleOrder = (time, stagger) => {
      state.order.forEach((index, position) => {
        const card = deck[index];
        if (card.pos === position) return;
        card.from = card.pos;
        card.pos = position;
        card.hold = time + Math.max(0, position) * stagger;
      });
    };

    const shift = (direction, options = {}) => {
      if (count < 2) return;
      const config = settings;
      const time = performance.now();
      const stagger = 0.05 / config.speed;
      if (direction > 0) {
        const front = deck[state.order[0]];
        state.order = [...state.order.slice(1), front.index];
        settleOrder(time, stagger * 1000);
        front.phase = 'exit';
        front.dir = options.dir ?? DOWN;
        front.tilt = options.tilt ?? 0;
        front.top = ++state.layers;
        front.under = false;
        front.nudge = 0;
        front.hold = 0;
        if (options.velocity) {
          front.v.x = options.velocity.x;
          front.v.y = options.velocity.y;
        }
      } else {
        const back = deck[state.order[count - 1]];
        state.order = [back.index, ...state.order.slice(0, count - 1)];
        settleOrder(time, stagger * 1000);
        back.phase = 'enter';
        back.top = 0;
        back.under = true;
        back.nudge = 0;
        back.hold = 0;
      }
      deck.forEach(card => { if (card.phase === 'rest') card.nudge = 0; });
      updateCaption(state.order[0]);
      wake();
      schedule();
    };

    const goTo = position => {
      state.queue.forEach(clearTimeout);
      state.queue = [];
      const gap = 110 / settings.speed;
      for (let i = 0; i < position; i++) state.queue.push(window.setTimeout(() => shift(1), i * gap));
    };

    const fit = () => {
      const w = deckRoot.clientWidth;
      const h = deckRoot.clientHeight;
      const scale = Math.min(1, w / bounds.width, h > 0 ? h / bounds.height : 1);
      state.scale = scale > 0 ? scale : 1;
      stage.style.transform = `translate(-50%, -50%) scale(${state.scale.toFixed(4)})`;
    };

    const local = event => {
      const box = deckRoot.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top, w: box.width, h: box.height };
    };

    const onMove = event => {
      const config = settings;
      if (event.pointerType !== 'touch') {
        const point = local(event);
        const nx = clamp((point.x / Math.max(1, point.w)) * 2 - 1, -1, 1);
        const ny = clamp((point.y / Math.max(1, point.h)) * 2 - 1, -1, 1);
        state.tx = nx * config.parallax * 0.35 * bounds.width;
        state.ty = ny * config.parallax * 0.35 * bounds.height;
        state.hovered = true;
        const overCard = Boolean(event.target.closest?.('[data-swap-index]'));
        if (overCard !== state.overCard) {
          state.overCard = overCard;
          schedule();
        }
        wake();
      }
      const drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      const dx = (event.clientX - drag.startX) / state.scale;
      const dy = (event.clientY - drag.startY) / state.scale;
      if (!drag.active) {
        if (Math.hypot(dx, dy) < 5) return;
        drag.active = true;
        state.dragged = true;
        const card = deck[drag.index];
        card.phase = 'drag';
        card.v = { x: 0, y: 0, z: 0, r: 0, p: 0 };
        deckRoot.setPointerCapture?.(event.pointerId);
        deckRoot.style.cursor = 'grabbing';
      }
      const card = deck[drag.index];
      const base = slot(0, config);
      card.x = base.x + dx;
      card.y = base.y + dy;
      card.z = base.z;
      card.r = clamp(dx * 0.035, -9, 9);
      card.p = 0;
      const time = performance.now();
      drag.samples.push({ x: card.x, y: card.y, t: time });
      while (drag.samples.length > 2 && time - drag.samples[0].t > 90) drag.samples.shift();
      const progress = clamp(Math.hypot(dx, dy) / (Math.min(config.width, config.height) * 0.3), 0, 1);
      const next = deck[state.order[1]];
      if (next && next.phase === 'rest') next.nudge = -0.22 * progress;
      wake();
    };

    const onLeave = event => {
      if (event.pointerType === 'touch' || state.drag?.active) return;
      state.hovered = false;
      state.overCard = false;
      state.tx = 0;
      state.ty = 0;
      schedule();
      wake();
    };

    const onDown = event => {
      state.dragged = false;
      if (event.button > 0 || count < 2) return;
      const target = event.target.closest?.('[data-swap-index]');
      if (!target || !deckRoot.contains(target)) return;
      const index = Number(target.getAttribute('data-swap-index'));
      if (index !== state.order[0] || deck[index].phase !== 'rest') return;
      state.drag = { id: event.pointerId, index, startX: event.clientX, startY: event.clientY, active: false, samples: [] };
      schedule();
    };

    const onUp = event => {
      const drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      state.drag = null;
      deckRoot.style.cursor = '';
      if (!drag.active) {
        schedule();
        return;
      }
      deckRoot.releasePointerCapture?.(event.pointerId);
      const config = settings;
      const card = deck[drag.index];
      const base = slot(0, config);
      const first = drag.samples[0];
      const lastSample = drag.samples[drag.samples.length - 1];
      const span = first && lastSample ? Math.max(0.016, (lastSample.t - first.t) / 1000) : 1;
      const velocity = first && lastSample && lastSample !== first
        ? { x: (lastSample.x - first.x) / span, y: (lastSample.y - first.y) / span }
        : { x: 0, y: 0 };
      const offset = { x: card.x - base.x, y: card.y - base.y };
      const distance = Math.hypot(offset.x, offset.y);
      const fling = Math.hypot(velocity.x, velocity.y);
      const next = deck[state.order[1]];
      if (next) next.nudge = 0;
      if (event.type !== 'pointercancel' && (distance > Math.min(config.width, config.height) * 0.3 || fling > 700)) {
        const aim = { x: offset.x + velocity.x * 0.12, y: offset.y + velocity.y * 0.12 };
        const length = Math.hypot(aim.x, aim.y) || 1;
        card.phase = 'rest';
        shift(1, { dir: { x: aim.x / length, y: aim.y / length }, tilt: card.r, velocity });
      } else {
        card.phase = 'rest';
        card.v.x = velocity.x;
        card.v.y = velocity.y;
        wake();
        schedule();
      }
    };

    const onClick = event => {
      if (state.dragged) {
        state.dragged = false;
        return;
      }
      const target = event.target.closest?.('[data-swap-index]');
      if (!target || !deckRoot.contains(target)) return;
      const index = Number(target.getAttribute('data-swap-index'));
      const position = state.order.indexOf(index);
      if (position > 0) goTo(position);
    };

    const onKeyDown = event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        shift(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        shift(-1);
      }
    };

    updateCaption(0);
    deckRoot.classList.add('is-ready');

    deck.forEach(card => Object.assign(card, slot(card.pos)));
    fit();
    writeStage(settings);
    deck.forEach(card => write(card, settings));
    wake();
    schedule();

    new ResizeObserver(fit).observe(deckRoot);
    let introPlayed = false;
    new IntersectionObserver(entries => {
      state.inView = entries[entries.length - 1]?.intersectionRatio >= .25;
      if (state.inView && !introPlayed) {
        introPlayed = true;
        if (!motion.matches && state.order.every((index, pos) => index === pos)) {
          const now = performance.now();
          deck.forEach(card => {
            Object.assign(card, slot(0));
            card.from = 0;
            card.hold = now + (card.pos * 70) / settings.speed;
            write(card, settings);
          });
          stage.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
          wake();
        }
      }
      schedule();
    }, { threshold: .25 }).observe(deckRoot);

    deckRoot.addEventListener('pointermove', onMove);
    deckRoot.addEventListener('pointerleave', onLeave);
    deckRoot.addEventListener('pointerdown', onDown);
    deckRoot.addEventListener('pointerup', onUp);
    deckRoot.addEventListener('pointercancel', onUp);
    deckRoot.addEventListener('click', onClick);
    deckRoot.addEventListener('keydown', onKeyDown);
    deckRoot.addEventListener('focusin', event => {
      state.focused = event.target.matches(':focus-visible');
      schedule();
    });
    deckRoot.addEventListener('focusout', () => { state.focused = false; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', () => { schedule(); wake(); });
  }

  // Animate UI Ripple Button, with a short lead-in before following the link.
  const start = document.querySelector('#start-link');
  start.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') start.classList.add('is-hovered');
  });
  start.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || motion.matches) return;
    const box = start.getBoundingClientRect();
    start.style.setProperty('--cta-x', `${(event.clientX - box.left) / box.width * 100}%`);
    start.style.setProperty('--cta-y', `${(event.clientY - box.top) / box.height * 100}%`);
  });
  start.addEventListener('pointerleave', () => {
    start.classList.remove('is-hovered');
    start.style.removeProperty('--cta-x');
    start.style.removeProperty('--cta-y');
  });
  let navigationTimer = 0;
  start.addEventListener('click', event => {
    if (!start.animate || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const rect = start.getBoundingClientRect();
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.setAttribute('aria-hidden', 'true');
    wave.style.left = `${event.detail ? event.clientX - rect.left : rect.width / 2}px`;
    wave.style.top = `${event.detail ? event.clientY - rect.top : rect.height / 2}px`;
    start.append(wave);
    const animation = wave.animate(
      [{scale: 1, opacity: .38}, {scale: motion.matches ? 1 : 10, opacity: 0}],
      {duration: 600, easing: 'ease-out'}
    );
    animation.finished.then(() => wave.remove(), () => wave.remove());
    if (!navigationTimer) navigationTimer = setTimeout(() => {
      navigationTimer = 0;
      location.assign(start.href);
    }, motion.matches ? 90 : 190);
  });
})();
