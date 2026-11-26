const {cropImageFile, cropPhotoSelection, photoPicker, photoRatios, animatePhotoFrame, mountPostRatio} = (() => {
  const pickerStates = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const tr = SiteLanguage.text;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const photoRatios = [[3,'3:1'],[2.5,'5:2'],[21/9,'21:9'],[16/9,'16:9'],[3/2,'3:2'],[4/3,'4:3'],[1,'1:1'],[4/5,'4:5'],[3/4,'3:4'],[2/3,'2:3'],[9/16,'9:16']];
  const frameAnimations = new WeakMap();
  let cropQueue = Promise.resolve();

  // Use the beUI layout and tab spring constants in native Web Animations.
  function springEasing(stiffness, damping, mass, duration) {
    const decay = damping/(2*mass);
    const frequency = Math.sqrt(Math.abs(stiffness/mass-decay**2));
    const stops = Array.from({length:33}, (_,i) => {
      if (i === 32) return 1;
      const t = duration*i/32000;
      const remaining = decay**2 > stiffness/mass
        ? Math.cosh(frequency*t) + decay/frequency*Math.sinh(frequency*t)
        : Math.cos(frequency*t) + decay/frequency*Math.sin(frequency*t);
      return +(1-Math.exp(-decay*t)*remaining).toFixed(5);
    });
    return `linear(${stops.join(',')})`;
  }
  const layoutSpring = {duration:480,easing:springEasing(360,32,.6,480)};
  const tabSpring = {duration:540,easing:springEasing(245,36,1.2,540)};

  function animatePhotoFrame(frame, before, resizeWidth = false) {
    frameAnimations.get(frame)?.cancel();
    if (motion.matches || !before.height || !frame.animate) return;
    const after = {width:frame.offsetWidth,height:frame.offsetHeight};
    if (!after.height || (before.height === after.height && before.width === after.width)) return;
    const keyframes = [before,after].map(({width,height}) => {
      return resizeWidth ? {width:`${width}px`,height:`${height}px`} : {height:`${height}px`};
    });
    frameAnimations.set(frame, frame.animate(keyframes, layoutSpring));
  }

  function ratioTabs(ratios, value, label, change) {
    const viewport = document.createElement('div');
    viewport.className = 'photo-ratios';
    viewport.innerHTML = '<div class="photo-ratio-track" role="radiogroup"><span class="photo-ratio-pill" aria-hidden="true"></span></div>';
    const track = viewport.firstElementChild, pill = track.firstElementChild;
    track.setAttribute('aria-label',label);
    let active, animation;
    function place(button, animate) {
      if (!button.offsetWidth) return;
      const before = getComputedStyle(pill);
      const from = {left:before.left,width:before.width};
      const to = {left:`${button.offsetLeft}px`,width:`${button.offsetWidth}px`};
      animation?.cancel();
      if (!motion.matches && animate && pill.offsetWidth) animation = pill.animate([from,to],tabSpring);
      Object.assign(pill.style,to);
      const start = button.offsetLeft, end = start + button.offsetWidth;
      if (start < viewport.scrollLeft || end > viewport.scrollLeft+viewport.clientWidth) {
        viewport.scrollTo({left:start-(viewport.clientWidth-button.offsetWidth)/2,behavior:animate&&!motion.matches?'smooth':'instant'});
      }
    }
    const buttons = ratios.map(([ratio, name]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role','radio');
      button.textContent = name;
      button.onclick = () => {
        if (active === button) return;
        active = button;
        for (const option of buttons) {
          option.setAttribute('aria-checked',String(option===active));
          option.tabIndex = option===active ? 0 : -1;
        }
        place(button,true);
        change(ratio);
      };
      button.setAttribute('aria-checked',String(ratio===value));
      button.tabIndex = ratio===value ? 0 : -1;
      if (ratio===value) active = button;
      track.append(button);
      return button;
    });
    track.onkeydown = event => {
      const directions = {ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1};
      const index = buttons.indexOf(event.target);
      if (index < 0) return;
      const next = event.key==='Home' ? buttons[0] : event.key==='End' ? buttons.at(-1)
        : buttons[(index+directions[event.key]+buttons.length)%buttons.length];
      if (!next) return;
      event.preventDefault();
      next.focus({preventScroll:true});
      next.click();
    };
    requestAnimationFrame(() => place(active,false));
    return viewport;
  }

  function mountPostRatio(input, {l:label,o:options}, readCover) {
    const field = document.createElement('div');
    field.className = 'photo-aspect-field';
    field.innerHTML = `<div class="photo-aspect-label"></div>
      <div class="photo-aspect-stage"><div class="photo-aspect-frame">
        <svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path fill="#d0e6fd" d="M0 0h220v150H0z"/><circle cx="150" cy="48" r="19" fill="#fff2c3"/>
          <path fill="#97bddf" d="M0 113 56 49l19 20 26-28 119 88v21H0z"/>
          <path fill="#e8f3ff" d="m44 63 12-14 19 20-17-6zm42-6 15-16 24 18-24-7z"/>
          <path fill="#5895bc" d="m0 119 73-23 68 18 79-28v64H0z"/><path fill="#70acc9" d="m0 133 81-13 49 15 90-12v27H0z"/>
        </svg>
        <img alt="" draggable="false" hidden>
      </div></div>`;
    const heading = field.firstElementChild, frame = field.querySelector('.photo-aspect-frame');
    const image = frame.querySelector('img');
    heading.textContent = label;
    function resize() {
      const before = {width:frame.offsetWidth,height:frame.offsetHeight};
      frame.style.setProperty('--post-ratio', input.value);
      animatePhotoFrame(frame,before,true);
    }
    heading.after(ratioTabs(options.map(({v,l})=>[v,l]),Number(input.value),label,ratio=>{
      input.value = ratio;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }));
    input.closest('label').replaceWith(field);
    field.append(input);
    input.addEventListener('change',resize);
    resize();
    return () => {
      const src = readCover();
      image.hidden = !src;
      if (src && image.getAttribute('src')!==src) image.src = src;
    };
  }

  function cropImageFile(file, ratio = 1, max = 900, position = '', options = {}) {
    const next = cropQueue.then(() => openCrop(file, ratio, max, position, options));
    cropQueue = next.catch(() => {});
    return next;
  }

  async function openCrop(file, ratio, max, position, {fixedRatio, encode}) {
    if ((file.type && !file.type.startsWith('image/')) || file.size > 25 * 1024 * 1024) {
      throw new Error(tr('Escolha uma imagem de até 25 MB.','Choose an image up to 25 MB.'));
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    let dialog;
    try {
      image.src = url;
      try { await image.decode(); } catch { throw new Error(tr('Não foi possível abrir esta imagem.','Could not open this image.')); }
      if (!image.naturalWidth || !image.naturalHeight) throw new Error(tr('Imagem sem dimensões válidas.','Invalid image dimensions.'));
      dialog = document.createElement('dialog');
      dialog.className = 'photo-crop';
      dialog.setAttribute('aria-labelledby', 'photo-crop-title');
      dialog.innerHTML = `<header class="photo-crop-head"><div><small>${tr('EDITOR DE IMAGEM','IMAGE EDITOR')}</small><h2 id="photo-crop-title">${tr('Ajustar enquadramento','Adjust framing')}</h2><p>${tr('Arraste a foto para posicioná-la e ajuste o zoom.','Drag the photo to position it and adjust the zoom.')}</p></div><button type="button" class="photo-crop-close" data-action="cancel" aria-label="${tr('Cancelar recorte','Cancel crop')}">×</button></header>
        <div class="photo-crop-stage"><div class="photo-crop-frame"><canvas tabindex="0" aria-label="${tr('Prévia do recorte. Pressione as setas para mover a imagem.','Crop preview. Use the arrow keys to move the image.')}"></canvas><span class="photo-crop-grid" aria-hidden="true"></span></div></div>
        <div class="photo-crop-tools"><label>Zoom <input type="range" min="100" max="400" value="100"><output>100%</output></label><div><button type="button" data-action="rotate">↻ ${tr('Girar','Rotate')}</button><button type="button" data-action="reset">${tr('Redefinir','Reset')}</button></div></div>
        <footer class="photo-crop-footer"><span class="photo-crop-position"></span><button type="button" data-action="cancel">${tr('Cancelar','Cancel')}</button><button type="button" data-action="apply" autofocus>${tr('Usar foto','Use photo')}</button></footer>`;
      dialog.querySelector('.photo-crop-position').textContent = position;
      const frame = dialog.querySelector('.photo-crop-frame');
      const canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d');
      image.alt = '';
      image.draggable = false;
      frame.prepend(image);
      const slider = dialog.querySelector('input'), zoomLabel = dialog.querySelector('output');
      let selectedRatio = ratio, w, h;
      let zoom = 1, turn = 0, x = 0, y = 0, pointer = null, lastX = 0, lastY = 0;

      function resize(animate = true) {
        const before = {width:frame.offsetWidth,height:frame.offsetHeight};
        const original = image.naturalWidth / image.naturalHeight;
        const value = selectedRatio ?? (turn % 2 ? 1/original : original);
        const nextW = Math.max(1, Math.round(max * Math.min(1,value)));
        const nextH = Math.max(1, Math.round(max * Math.min(1,1/value)));
        if (w && h) { x *= nextW/w; y *= nextH/h; }
        w = canvas.width = nextW;
        h = canvas.height = nextH;
        frame.style.setProperty('--crop-ratio', value);
        paint();
        if (animate) animatePhotoFrame(frame,before,true);
      }

      if (!fixedRatio) {
        const ratios = [...photoRatios];
        if (ratio != null && !ratios.some(([value])=>value===ratio)) ratios.unshift([ratio,tr('Do app','App default')]);
        ratios.unshift([null,tr('Original','Original')]);
        const picker = ratioTabs(ratios,ratio,tr('Proporção da foto','Photo aspect ratio'),value=>{
          selectedRatio = value;
          resize();
        });
        dialog.querySelector('.photo-crop-stage').before(picker);
      }

      function paint() {
        const iw = image.naturalWidth, ih = image.naturalHeight;
        const [rw, rh] = turn % 2 ? [ih, iw] : [iw, ih];
        const scale = Math.max(w / rw, h / rh) * zoom;
        const limitX = Math.max(0, (rw * scale - w) / 2), limitY = Math.max(0, (rh * scale - h) / 2);
        x = clamp(x, -limitX, limitX);
        y = clamp(y, -limitY, limitY);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2 + x, h / 2 + y);
        ctx.rotate(turn * Math.PI / 2);
        ctx.drawImage(image, -iw * scale / 2, -ih * scale / 2, iw * scale, ih * scale);
        ctx.restore();
        frame.style.setProperty('--crop-pan-x',`${100*x/w}%`);
        frame.style.setProperty('--crop-pan-y',`${100*y/h}%`);
        frame.style.setProperty('--crop-turn',`${turn*90}deg`);
        frame.style.setProperty('--crop-zoom',zoom);
        frame.toggleAttribute('data-turned',turn%2===1);
        slider.value = Math.round(zoom * 100);
        zoomLabel.textContent = `${slider.value}%`;
      }
      canvas.addEventListener('pointerdown', event => {
        if (pointer !== null || event.button !== 0) return;
        pointer = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(pointer);
      });
      canvas.addEventListener('pointermove', event => {
        if (event.pointerId !== pointer) return;
        x += (event.clientX - lastX) * w / canvas.clientWidth;
        y += (event.clientY - lastY) * h / canvas.clientHeight;
        lastX = event.clientX;
        lastY = event.clientY;
        paint();
      });
      canvas.addEventListener('lostpointercapture', () => { pointer = null; });
      canvas.addEventListener('keydown', event => {
        const directions = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
        const dir = directions[event.key];
        if (!dir) return;
        event.preventDefault();
        x += dir[0] * (event.shiftKey ? 35 : 8);
        y += dir[1] * (event.shiftKey ? 35 : 8);
        paint();
      });
      canvas.addEventListener('wheel', event => {
        event.preventDefault();
        zoom = clamp(zoom + (event.deltaY < 0 ? .08 : -.08), 1, 4);
        paint();
      }, {passive: false});
      slider.addEventListener('input', () => { zoom = Number(slider.value) / 100; paint(); });
      dialog.querySelector('[data-action=rotate]').onclick = () => { turn = (turn + 1) % 4; x = y = 0; if (selectedRatio === null) resize(); else paint(); };
      dialog.querySelector('[data-action=reset]').onclick = () => { zoom = 1; turn = x = y = 0; if (selectedRatio === null) resize(); else paint(); };
      for (const button of dialog.querySelectorAll('[data-action=cancel]')) button.onclick = () => closeEditorDialog(dialog);
      dialog.querySelector('[data-action=apply]').onclick = () => closeEditorDialog(dialog, 'apply');
      document.body.append(dialog);
      resize(false);
      return await new Promise((resolve, reject) => {
        dialog.addEventListener('close', () => {
          try { resolve(dialog.returnValue === 'apply' ? (encode ? encode(canvas) : canvas.toDataURL('image/jpeg', .86)) : ''); }
          catch (error) { reject(error); }
        }, {once: true});
        openEditorDialog(dialog);
      });
    } finally {
      dialog?.remove();
      URL.revokeObjectURL(url);
    }
  }

  function photoPicker(input, settings) {
    const old = pickerStates.get(input);
    if (old) return old;
    const wrapper = document.createElement('span');
    wrapper.className = 'photo-picker';
    wrapper.innerHTML = `<span class="photo-picker-button" aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.4"/><path d="m4 17 5-4 4 3 4-5 4 4"/></svg>${input.multiple ? tr('Escolher fotos','Choose photos') : tr('Escolher foto','Choose photo')}</span><span class="photo-picker-status" role="status"></span>`;
    const status = wrapper.querySelector('.photo-picker-status');
    const emptyText = tr('Nenhuma foto selecionada','No photo selected');
    status.textContent = emptyText;
    input.before(wrapper);
    wrapper.append(input);
    let values = [...(settings?.initial || [])];
    const order = settings?.onOrder ? document.createElement('ol') : null;
    if (order) {
      order.className = 'photo-order';
      order.setAttribute('aria-label',tr('Ordem do carrossel','Carousel order'));
      wrapper.closest('label').after(order);
    }
    const state = {
      value: () => input.multiple ? values.slice() : values[0] || '',
      setStatus: (text, error = false) => {
        status.textContent = text;
        status.classList.toggle('photo-picker-error', error);
      }
    };
    function renderOrder() {
      if (!order) return;
      order.hidden = !values.length;
      order.replaceChildren(...values.map((url, i) => {
        const row = document.createElement('li');
        const thumbnail = document.createElement('img');
        thumbnail.alt = '';
        if (/^(data:image\/(?:jpeg|png|webp|gif|avif);base64,|https?:\/\/)/i.test(url)) thumbnail.src = url;
        const name = document.createElement('span');
        name.textContent = i === 0 ? tr('1 · Capa','1 · Cover') : String(i+1);
        row.append(thumbnail,name);
        const controls = [
          ['M12 19V5m-5 5 5-5 5 5',tr('Mover antes','Move earlier'),i-1],
          ['M12 5v14m-5-5 5 5 5-5',tr('Mover depois','Move later'),i+1],
          ['M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13m-8 4v5m4-5v5',tr('Remover','Remove'),null],
        ];
        for (const [icon,label,target] of controls) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = target === null ? 'photo-order-remove' : 'photo-order-move';
          button.innerHTML = `<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg>`;
          button.title = label;
          button.setAttribute('aria-label',`${label} · ${tr('Foto','Photo')} ${i+1}`);
          button.disabled = target !== null && (target < 0 || target >= values.length);
          button.onclick = () => {
            const [item] = values.splice(i,1);
            if (target !== null) values.splice(target,0,item);
            renderOrder();
            state.setStatus(readyText(values.length) || emptyText);
            settings.onOrder();
            const next = order.children[target ?? Math.min(i,values.length-1)];
            (next?.querySelector(`button[title="${label}"]:enabled`) || next?.querySelector('button:enabled') || input).focus();
          };
          row.append(button);
        }
        return row;
      }));
    }
    renderOrder();
    state.setStatus(readyText(values.length) || emptyText);
    pickerStates.set(input, state);
    if (settings) input.addEventListener('change', async () => {
      if (!input.files.length) return;
      settings.onBusy(true);
      try {
        const ratio = settings.getRatio ? settings.getRatio() : settings.ratio;
        const photos = await cropPhotoSelection(input, ratio, 900, {fixedRatio:!!settings.getRatio});
        if (photos.length) values = order ? values.concat(photos) : photos;
        renderOrder();
        if (!status.classList.contains('photo-picker-error')) state.setStatus(readyText(values.length) || emptyText);
      } finally { settings.onBusy(false); }
    });
    return state;
  }

  const readyText = count => count > 1 ? tr(`${count} fotos prontas`,`${count} photos ready`) : count === 1 ? tr('Foto pronta','Photo ready') : '';
  async function cropPhotoSelection(input, ratio = 1, max = 900, options) {
    const files = [...input.files], photos = [];
    if (!files.length) return photos;
    input.value = '';
    const state = pickerStates.get(input);
    input.disabled = true;
    state?.setStatus(tr('Ajustando foto…','Adjusting photo…'));
    const errors = [];
    try {
      for (const [i, file] of files.entries()) {
        try {
          const result = await cropImageFile(file, ratio, max, files.length > 1 ? tr(`Foto ${i + 1} de ${files.length}`,`Photo ${i + 1} of ${files.length}`) : '', options);
          if (result) photos.push(result);
        } catch (error) { errors.push(error.message || tr('Não foi possível abrir a foto.','Could not open the photo.')); }
      }
      if (errors.length) {
        const message = [readyText(photos.length), errors[0]].filter(Boolean).join(' · ');
        if (state) state.setStatus(message, true);
        else alert(message);
      } else state?.setStatus(readyText(photos.length) || tr('Nenhuma foto selecionada','No photo selected'));
      return photos;
    } finally {
      input.disabled = false;
    }
  }

  if (!readerMode) document.querySelectorAll('[data-photo-picker]').forEach(input => photoPicker(input));
  return {cropImageFile, cropPhotoSelection, photoPicker, photoRatios, animatePhotoFrame, mountPostRatio};
})();
