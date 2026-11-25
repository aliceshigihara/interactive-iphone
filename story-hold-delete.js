/* Vanilla implementation of the React Bits–style liquid hold interaction. */
(() => {
  if (readerMode) return;
  const button = document.getElementById('story-hold-delete');
  const duration = 2000;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let hold = null, progress = 0, frame = 0, resetTimer = 0;

  function paint(value) {
    progress = value;
    button.style.setProperty('--hold-progress', value);
  }

  function animate(to, ms, finish) {
    cancelAnimationFrame(frame);
    const start = performance.now(), from = progress;
    const step = now => {
      const t = ms ? Math.min(1, (now - start) / ms) : 1;
      paint(from + (to - from) * (to === 0 ? 1 - (1 - t) ** 3 : t));
      if (t < 1) frame = requestAnimationFrame(step);
      else finish?.();
    };
    frame = requestAnimationFrame(step);
  }

  function openConfirmation() {
    if (readerMode || document.querySelector('dialog[open]') || document.getElementById('pm').style.display === 'flex') return;
    const story = S, id = IDX.cur;
    askOk('Apagar tudo desta história e recomeçar do zero?', () => {
      if (readerMode || S !== story || IDX.cur !== id) return;
      S = blank();
      save();
      lockIt();
    });
  }

  function begin(input, id) {
    if (hold || button.dataset.holdState === 'ready') return false;
    clearTimeout(resetTimer);
    paint(0);
    hold = {input, id, rect:button.getBoundingClientRect()};
    button.dataset.holdState = 'holding';
    animate(1, duration, () => {
      if (!hold) return;
      endCapture();
      button.dataset.holdState = 'ready';
      openConfirmation();
      resetTimer = setTimeout(() => {
        delete button.dataset.holdState;
        animate(0, reduced.matches ? 0 : 185);
      }, 260);
    });
    return true;
  }

  function endCapture() {
    const input = hold;
    hold = null;
    if (input?.input === 'pointer' && button.hasPointerCapture(input.id)) button.releasePointerCapture(input.id);
  }

  function cancel() {
    if (!hold) return;
    endCapture();
    delete button.dataset.holdState;
    animate(0, reduced.matches ? 0 : 185);
  }

  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || !begin('pointer', event.pointerId)) return;
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', event => {
    if (hold?.input !== 'pointer' || hold.id !== event.pointerId) return;
    const {left,right,top,bottom} = hold.rect;
    if (event.clientX < left-9 || event.clientX > right+9 || event.clientY < top-9 || event.clientY > bottom+9) cancel();
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type, event => {
    if (hold?.input === 'pointer' && hold.id === event.pointerId) cancel();
  });
  button.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancel(); return; }
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) begin('key', event.key);
  });
  button.addEventListener('keyup', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (hold?.input === 'key' && hold.id === event.key) cancel();
  });
  button.addEventListener('click', event => {
    // Assistive technology can activate the button without a pointer or a held key.
    if (event.detail === 0 && !hold && !button.dataset.holdState) openConfirmation();
  });
  button.addEventListener('blur', cancel);
  button.addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
})();
