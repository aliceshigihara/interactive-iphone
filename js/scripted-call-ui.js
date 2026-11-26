/* Two-way gesture control. The side buttons offer the same actions without a drag. */
const ScriptedCallUI = (() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const handset = '<svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor" aria-hidden="true"><path d="M8 3.5 10.4 8a1.2 1.2 0 0 1-.2 1.4L8.7 11a13.6 13.6 0 0 0 4.3 4.3l1.6-1.5a1.2 1.2 0 0 1 1.4-.2l4.5 2.4c.5.2.8.8.7 1.3l-.4 2a2.4 2.4 0 0 1-2.8 1.9C9.9 20 4 14.1 2.8 6A2.4 2.4 0 0 1 4.7 3.2l2-.4c.5-.1 1.1.2 1.3.7Z"/></svg>';

  function markup() {
    return `<div class="sc-answer"><div class="sc-swipe" role="group" aria-label="Responder à chamada">
      <button type="button" class="sc-swipe-choice is-decline" data-call-choice="-1"><span aria-hidden="true">‹</span>Recusar</button>
      <button type="button" class="sc-swipe-knob" aria-label="Deslize para responder. Seta esquerda recusa, seta direita atende." aria-describedby="sc-swipe-hint">${handset}</button>
      <button type="button" class="sc-swipe-choice is-accept" data-call-choice="1">Atender<span aria-hidden="true">›</span></button>
    </div><p id="sc-swipe-hint">Deslize para atender ou recusar</p></div>`;
  }

  function mount(root, onAnswer, onDecline) {
    const track = root.querySelector('.sc-swipe');
    const knob = track.querySelector('.sc-swipe-knob');
    let drag = null, settling = false;
    const limit = () => Math.max(0, (track.clientWidth - knob.offsetWidth) / 2 - 5);
    const offset = e => {
      const scale = track.getBoundingClientRect().width / track.clientWidth || 1;
      return (e.clientX - drag.x) / scale;
    };
    function paint(dx) {
      track.style.setProperty('--sc-knob-x', `${dx}px`);
      track.dataset.direction = dx > 5 ? 'accept' : dx < -5 ? 'decline' : '';
    }
    function commit(direction) {
      if(settling)return;
      settling = true;
      drag = null;
      track.classList.remove('is-dragging');
      track.classList.add('is-settling');
      paint(direction * limit());
      const finish = () => {
        if (track.isConnected) (direction > 0 ? onAnswer : onDecline)();
      };
      if (reducedMotion.matches) finish();
      else setTimeout(finish, 185);
    }
    function cancel(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      track.classList.remove('is-dragging');
      paint(0);
    }

    knob.addEventListener('pointerdown', e => {
      if (settling || drag || e.button !== 0) return;
      drag = {id: e.pointerId, x: e.clientX};
      track.classList.add('is-dragging');
      knob.setPointerCapture(e.pointerId);
    });
    knob.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const travel = limit();
      paint(Math.max(-travel, Math.min(travel, offset(e))));
    });
    knob.addEventListener('pointerup', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = offset(e);
      if (Math.abs(dx) >= Math.max(18, limit() * .68)) commit(Math.sign(dx));
      else cancel(e);
    });
    knob.addEventListener('pointercancel', cancel);
    knob.addEventListener('lostpointercapture', cancel);
    knob.addEventListener('keydown', e => {
      const direction = {'ArrowLeft':-1, 'ArrowRight':1, 'Escape':-1, 'Enter':1, ' ':1}[e.key];
      if (!direction || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      commit(direction);
    });
    track.querySelectorAll('[data-call-choice]').forEach(button => button.addEventListener('click', () => commit(+button.dataset.callChoice)));
    return knob;
  }
  return {markup, mount, handset};
})();
