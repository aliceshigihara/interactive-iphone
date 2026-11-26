const EditorGuide = (() => {
  const guide = document.getElementById('editor-guide');
  const warning = document.getElementById('story-publish-warning');
  const seenKey = 'iphone-story:editor-guide-v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const en = SiteLanguage.lang === 'en';
  const steps = en ? [
    ['Create a story', 'In Saved stories, click ＋ New and name your story. On mobile, open the Stories tab to find these controls.'],
    ['Explore the iPhone', 'Swipe up to unlock the simulated iPhone. Open an app to see how it will appear in your story.'],
    ['Build your scenes', 'Open an app and use its editor panel to make profiles, messages, and more. On mobile, tap Edit. Use Interactive storytelling to schedule events as people read.'],
    ['Save or share', 'Your draft is saved in this browser. Use Export file to save a backup, or Publish and copy link to share a reading copy. The image limit only applies to published links.']
  ] : [
    ['Crie uma história', 'Em Histórias salvas, clique em ＋ Nova e dê um nome à sua história. No celular, use a aba Histórias para encontrar esses controles.'],
    ['Explore o iPhone', 'Desbloqueie o iPhone simulado deslizando a tela para cima. Abra um app para ver como ele vai aparecer na história.'],
    ['Monte suas cenas', 'Com um app aberto, use o painel de edição para criar perfis, mensagens e outros conteúdos. No celular, toque em Editar. Use Narração interativa para programar eventos durante a leitura.'],
    ['Salve ou compartilhe', 'Seu rascunho fica salvo neste navegador. Use Exportar arquivo para guardar um backup, ou Publicar e copiar link para enviar uma cópia de leitura. O limite de imagens só se aplica ao link publicado.']
  ];
  const labels = en ? ['Story','iPhone','Scenes','Publish'] : ['História','iPhone','Cenas','Publicar'];
  const track = $('#editor-guide-track');
  const viewport = guide.querySelector('.guide-stepper-viewport');
  const pane = guide.querySelector('.guide-stepper-pane');
  const indicators = [];
  let step = 0;

  function showStep(direction = 0) {
    const before = viewport.getBoundingClientRect().height;
    viewport.querySelector('.guide-stepper-leaving')?.remove();
    for (const el of [viewport,pane]) el.getAnimations().forEach(animation => animation.cancel());
    const animate = direction && guide.open && !reduced.matches;
    let leaving;
    if (animate) {
      leaving = pane.cloneNode(true);
      leaving.classList.add('guide-stepper-leaving');
      leaving.inert = true;
      leaving.setAttribute('aria-hidden','true');
      leaving.querySelectorAll('[id],[autofocus]').forEach(el => {
        el.removeAttribute('id');
        el.removeAttribute('autofocus');
      });
      viewport.append(leaving);
    }
    const [title, text] = steps[step];
    track.style.setProperty('--guide-index',step);
    $('#editor-guide-step').textContent = en ? `Step ${step + 1} of ${steps.length}` : `Passo ${step + 1} de ${steps.length}`;
    indicators.forEach((button,i) => {
      button.dataset.status = i < step ? 'complete' : i === step ? 'active' : 'upcoming';
      if (i === step) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    $('#editor-guide-title').textContent = title;
    $('#editor-guide-text').textContent = text;
    $('#editor-guide-prev').hidden = step === 0;
    const last = step === steps.length - 1;
    const next = $('#editor-guide-next');
    next.toggleAttribute('data-final',last);
    next.querySelector('span').textContent = en ? (last ? 'Get started' : 'Next') : (last ? 'Começar' : 'Próximo');
    if (guide.open) $('#editor-guide-title').focus({preventScroll:true});
    if (animate) {
      const after = viewport.getBoundingClientRect().height;
      if (Math.abs(before - after) > 1) viewport.animate([{height:`${before}px`},{height:`${after}px`}], {duration:390,easing:'cubic-bezier(.22,.82,.29,1)'});
      pane.animate([{opacity:0,transform:`translateX(${direction*32}px)`},{opacity:1,transform:'translateX(0)'}], {duration:390,easing:'cubic-bezier(.2,.86,.3,1.09)'});
      leaving.animate([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:`translateX(${-direction*32}px)`}], {duration:190,easing:'ease-in',fill:'forwards'}).finished.catch(() => {}).finally(() => leaving.remove());
    }
  }

  function goTo(next) {
    if (next === step || !steps[next]) return;
    const direction = Math.sign(next-step);
    step = next;
    showStep(direction);
  }

  function openGuide() {
    if (readerMode || guide.open || warning.open) return;
    step = 0;
    showStep();
    openEditorDialog(guide);
  }

  function confirmPublish(name) {
    if (readerMode || warning.open || guide.open) return Promise.resolve(false);
    $('#story-publish-name').textContent = `“${name}”`;
    openEditorDialog(warning);
    return new Promise(resolve => {
      warning.addEventListener('close', () => resolve(warning.returnValue === 'publish'), {once:true});
    });
  }

  if (!readerMode) {
    steps.forEach(([title],i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guide-stepper-segment';
      button.setAttribute('aria-label',`${en ? 'Step' : 'Passo'} ${i + 1}: ${title}`);
      button.innerHTML = `<span class="guide-stepper-badge" aria-hidden="true"><span>${i + 1}</span><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4 4 8-8"/></svg></span><span class="guide-stepper-label" aria-hidden="true">${labels[i]}</span>`;
      button.addEventListener('click',() => goTo(i));
      indicators.push(button);
      track.append(button);
    });
    $('#editor-guide-launch').addEventListener('click', openGuide);
    $('#editor-guide-skip').addEventListener('click', () => closeEditorDialog(guide));
    $('#editor-guide-prev').addEventListener('click', () => goTo(step - 1));
    $('#editor-guide-next').addEventListener('click', () => {
      if (step < steps.length - 1) goTo(step + 1);
      else closeEditorDialog(guide);
    });
    guide.addEventListener('close', () => {
      try { localStorage.setItem(seenKey, '1'); } catch {}
    });
    $('#story-publish-cancel').addEventListener('click', () => closeEditorDialog(warning));
    $('#story-publish-confirm').addEventListener('click', () => closeEditorDialog(warning, 'publish'));
    let seen = false;
    try { seen = localStorage.getItem(seenKey) === '1'; } catch {}
    if (!seen) openGuide();
  }

  return {confirmPublish};
})();
