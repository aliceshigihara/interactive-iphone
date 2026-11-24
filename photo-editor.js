const {cropImageFile, cropPhotoSelection, photoPicker} = (() => {
  const pickerStates = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let cropQueue = Promise.resolve();

  function cropImageFile(file, ratio = 1, max = 900, position = '') {
    const next = cropQueue.then(() => openCrop(file, ratio, max, position));
    cropQueue = next.catch(() => {});
    return next;
  }

  async function openCrop(file, ratio, max, position) {
    if ((file.type && !file.type.startsWith('image/')) || file.size > 25 * 1024 * 1024) {
      throw new Error('Escolha uma imagem de até 25 MB.');
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    let dialog;
    try {
      image.src = url;
      try { await image.decode(); } catch { throw new Error('Não foi possível abrir esta imagem.'); }
      if (!image.naturalWidth || !image.naturalHeight) throw new Error('Imagem sem dimensões válidas.');
      dialog = document.createElement('dialog');
      dialog.className = 'photo-crop';
      dialog.setAttribute('aria-labelledby', 'photo-crop-title');
      dialog.innerHTML = `<header class="photo-crop-head"><div><small>EDITOR DE IMAGEM</small><h2 id="photo-crop-title">Ajustar enquadramento</h2><p>Arraste a foto para posicioná-la e ajuste o zoom.</p></div><button type="button" class="photo-crop-close" data-action="cancel" aria-label="Cancelar recorte">×</button></header>
        <div class="photo-crop-stage"><div class="photo-crop-frame"><canvas tabindex="0" aria-label="Prévia do recorte. Pressione as setas para mover a imagem."></canvas><span class="photo-crop-grid" aria-hidden="true"></span></div></div>
        <div class="photo-crop-tools"><label>Zoom <input type="range" min="100" max="400" value="100"><output>100%</output></label><div><button type="button" data-action="rotate">↻ Girar</button><button type="button" data-action="reset">Redefinir</button></div></div>
        <footer class="photo-crop-footer"><span class="photo-crop-position"></span><button type="button" data-action="cancel">Cancelar</button><button type="button" data-action="apply" autofocus>Usar foto</button></footer>`;
      dialog.querySelector('.photo-crop-position').textContent = position;
      const frame = dialog.querySelector('.photo-crop-frame');
      const canvas = dialog.querySelector('canvas'), ctx = canvas.getContext('2d');
      const slider = dialog.querySelector('input'), zoomLabel = dialog.querySelector('output');
      const w = canvas.width = Math.max(1, Math.round(max * Math.min(1, ratio)));
      const h = canvas.height = Math.max(1, Math.round(max * Math.min(1, 1 / ratio)));
      frame.style.setProperty('--crop-ratio', w / h);
      let zoom = 1, turn = 0, x = 0, y = 0, pointer = null, lastX = 0, lastY = 0;

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
      dialog.querySelector('[data-action=rotate]').onclick = () => { turn = (turn + 1) % 4; x = y = 0; paint(); };
      dialog.querySelector('[data-action=reset]').onclick = () => { zoom = 1; turn = x = y = 0; paint(); };
      for (const button of dialog.querySelectorAll('[data-action=cancel]')) button.onclick = () => closeEditorDialog(dialog);
      dialog.querySelector('[data-action=apply]').onclick = () => closeEditorDialog(dialog, 'apply');
      document.body.append(dialog);
      paint();
      return await new Promise((resolve, reject) => {
        dialog.addEventListener('close', () => {
          try { resolve(dialog.returnValue === 'apply' ? canvas.toDataURL('image/jpeg', .86) : ''); }
          catch { reject(new Error('Não foi possível salvar o recorte.')); }
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
    wrapper.innerHTML = `<span class="photo-picker-button" aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.4"/><path d="m4 17 5-4 4 3 4-5 4 4"/></svg>${input.multiple ? 'Escolher fotos' : 'Escolher foto'}</span><span class="photo-picker-status" role="status"></span>`;
    const status = wrapper.querySelector('.photo-picker-status');
    const emptyText = 'Nenhuma foto selecionada';
    status.textContent = emptyText;
    input.before(wrapper);
    wrapper.append(input);
    let values = [];
    const state = {
      value: () => input.multiple ? values : values[0] || '',
      setStatus: (text, error = false) => {
        status.textContent = text;
        status.classList.toggle('photo-picker-error', error);
      }
    };
    pickerStates.set(input, state);
    if (settings) input.addEventListener('change', async () => {
      if (!input.files.length) return;
      settings.onBusy(true);
      try {
        const photos = await cropPhotoSelection(input, settings.ratio);
        if (photos.length) values = photos;
        if (!status.classList.contains('photo-picker-error')) state.setStatus(readyText(values.length) || emptyText);
      } finally { settings.onBusy(false); }
    });
    return state;
  }

  const readyText = count => count > 1 ? `${count} fotos prontas` : count === 1 ? 'Foto pronta' : '';
  async function cropPhotoSelection(input, ratio = 1, max = 900) {
    const files = [...input.files], photos = [];
    if (!files.length) return photos;
    input.value = '';
    const state = pickerStates.get(input);
    input.disabled = true;
    state?.setStatus('Ajustando foto…');
    const errors = [];
    try {
      for (const [i, file] of files.entries()) {
        try {
          const result = await cropImageFile(file, ratio, max, files.length > 1 ? `Foto ${i + 1} de ${files.length}` : '');
          if (result) photos.push(result);
        } catch (error) { errors.push(error.message || 'Não foi possível abrir a foto.'); }
      }
      if (errors.length) {
        const message = [readyText(photos.length), errors[0]].filter(Boolean).join(' · ');
        if (state) state.setStatus(message, true);
        else alert(message);
      } else state?.setStatus(readyText(photos.length) || 'Nenhuma foto selecionada');
      return photos;
    } finally {
      input.disabled = false;
    }
  }

  if (!readerMode) document.querySelectorAll('[data-photo-picker]').forEach(input => photoPicker(input));
  return {cropImageFile, cropPhotoSelection, photoPicker};
})();
