(() => {
  if (readerMode) return;

  const byId = id => document.getElementById(`planner-${id}`);
  const dialog = document.getElementById('story-planner');
  const dayMs = 86400000;
  const pageDays = 10;
  const shortDate = new Intl.DateTimeFormat('pt-BR', {day: '2-digit', month: '2-digit', timeZone: 'UTC'});
  const fullDate = new Intl.DateTimeFormat('pt-BR', {dateStyle: 'full', timeZone: 'UTC'});
  const weekday = new Intl.DateTimeFormat('pt-BR', {weekday: 'short', timeZone: 'UTC'});
  const personalFields = [...dialog.querySelectorAll('[data-planner-field]')];
  let story, plan, selectedDay, page, selectedPerson;

  function dateTime(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const t = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(t) && dayKey(t) === value ? t : NaN;
  }
  function dayKey(t) { return new Date(t).toISOString().slice(0, 10); }
  function bounds() {
    const start = dateTime(plan.start), end = dateTime(plan.end);
    return Number.isFinite(start) && end >= start ? {start, end} : null;
  }
  function persistPlan() {
    if (story !== S) return;
    story.planner = plan;
    save();
  }
  function make(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function dayPreview(key) {
    const note = typeof plan.days[key] === 'string' ? plan.days[key].trim() : '';
    const count = refsFor(key).length;
    return note || (count ? `${count} ${count===1?'referência':'referências'}` : '+ Anotar');
  }
  function refsFor(key) {
    return StoryConnections.refList(plan.refs[key]);
  }
  function updateDayTile(key) {
    const tile=[...byId('days').children].find(button=>button.dataset.day===key);
    if(!tile)return;
    tile.querySelector('.planner-day-preview').textContent=dayPreview(key);
    const count=refsFor(key).length;
    tile.classList.toggle('planner-day-referenced',!!count);
    tile.setAttribute('aria-label',`${fullDate.format(dateTime(key))}${count?`, ${count} ${count===1?'referência':'referências'}`:''}`);
  }
  function renderReferences() {
    const root=byId('refs'),day=selectedDay;
    root.replaceChildren();
    for(const ref of refsFor(day)){
      const item=StoryConnections.resolve(ref), unavailable=StoryConnections.availability(ref);
      const mismatch=item?.dates.length&&!item.dates.includes(day);
      const details=item?[FN[item.app],StoryConnections.dateLabel(item.dates)].filter(Boolean).join(' · '):'Registro removido';
      const row=make('div',null,'story-ref-row');
      const open=make('button',null,'story-ref-open');
      open.type='button';open.disabled=!!unavailable;
      if(item){
        const icon=make('span',null,'story-ref-icon');icon.setAttribute('aria-hidden','true');icon.innerHTML=iconOf(item.app);open.append(icon);
      }
      const words=make('span');
      words.append(make('b',item?.title||ref.title||'Registro indisponível'),make('small',details));
      if(mismatch)words.append(make('small','A data do registro não coincide com este dia.','story-ref-warning'));
      if(unavailable&&item)words.append(make('small',unavailable,'story-ref-warning'));
      open.append(words);
      if(!unavailable)open.append(make('span','›','story-ref-chevron'));
      open.onclick=async()=>{await closeEditorDialog(dialog);if(S===story)StoryConnections.open(ref)};
      const remove=make('button','×','story-ref-remove');remove.type='button';
      remove.setAttribute('aria-label',`Remover referência a ${item?.title||ref.title||'este registro'}`);
      remove.onclick=()=>{
        if(S!==story)return;
        const updated=refsFor(day).filter(link=>!StoryConnections.same(link,ref));
        if(updated.length)plan.refs[day]=updated;else delete plan.refs[day];
        persistPlan();updateDayTile(day);renderReferences();
      };
      row.append(open,remove);root.append(row);
    }
    if(!root.children.length)root.append(make('p','Nenhum registro vinculado a este dia.','story-ref-empty'));
  }
  function renderDays() {
    const range = bounds();
    byId('timeline-empty').hidden = !!range;
    byId('timeline-content').hidden = !range;
    byId('apply').textContent = range ? 'Atualizar linha' : 'Montar linha';
    if (!range) return;

    const from = range.start + page * pageDays * dayMs;
    const to = Math.min(range.end, from + (pageDays - 1) * dayMs);
    const otherNotes = [...new Set([...Object.keys(plan.days),...Object.keys(plan.refs)])].filter(date => {
      const t = dateTime(date);
      return t < range.start || t > range.end;
    }).length;
    byId('period').textContent = `${shortDate.format(from)} – ${shortDate.format(to)} · ${new Date(from).getUTCFullYear()}${new Date(to).getUTCFullYear() !== new Date(from).getUTCFullYear() ? `–${new Date(to).getUTCFullYear()}` : ''}`;
    byId('period-note').textContent = otherNotes
      ? `${otherNotes} ${otherNotes === 1 ? 'dia com notas ou referências fora do período atual (preservado)' : 'dias com notas ou referências fora do período atual (preservados)'}.`
      : 'Selecione um dia para escrever.';
    byId('prev-days').disabled = page === 0;
    byId('next-days').disabled = to >= range.end;

    const rail = byId('days');
    rail.replaceChildren();
    for (let t = from; t <= to; t += dayMs) {
      const key = dayKey(t);
      const button = make('button', null, 'planner-day');
      button.type = 'button';
      button.dataset.day = key;
      button.setAttribute('aria-label', fullDate.format(t));
      const edge = t === range.start && t === range.end ? 'Início e fim' : t === range.start ? 'Início' : t === range.end ? 'Fim' : weekday.format(t);
      button.append(make('small', edge, 'planner-day-edge'), make('strong', shortDate.format(t)), make('span', null, 'planner-day-dot'), make('span', dayPreview(key), 'planner-day-preview'));
      button.addEventListener('click', () => selectDay(key));
      rail.append(button);
      updateDayTile(key);
    }
    rail.scrollLeft = 0;
    selectDay(selectedDay);
    const current = rail.querySelector('[aria-pressed="true"]');
    if (current) rail.scrollLeft = Math.max(0, current.offsetLeft + current.offsetWidth - rail.clientWidth);
  }
  function selectDay(key) {
    selectedDay = key;
    const rail = byId('days');
    for (const button of rail.children) button.setAttribute('aria-pressed', String(button.dataset.day === key));
    byId('day-title').textContent = fullDate.format(dateTime(key));
    byId('day-note').value = typeof plan.days[key] === 'string' ? plan.days[key] : '';
    renderReferences();
  }
  function stepPage(step) {
    const range = bounds();
    if (!range) return;
    const next = page + step;
    const from = range.start + next * pageDays * dayMs;
    if (next < 0 || from > range.end) return;
    page = next;
    selectedDay = dayKey(from);
    renderDays();
  }

  function people() {
    const linked = (story.chars || []).map(char => ({key: `character:${char.id}`, char})).map(person => ({
      ...person, card: plan.cards.find(card => card.key === person.key)
    }));
    const keys = new Set(linked.map(person => person.key));
    return linked.concat(plan.cards.filter(card => !keys.has(card.key)).map(card => ({key: card.key, card})));
  }
  function personName(person) {
    return person.card?.name || person.char?.name || person.card?.originalName || 'Sem nome';
  }
  function editCard(person) {
    if (!person.card) {
      person.card = {key: person.key, originalName: person.char?.name || ''};
      plan.cards.push(person.card);
    }
    return person.card;
  }
  function renderIdentity(person) {
    const name = personName(person);
    byId('person-name').textContent = name;
    const frame = byId('photo');
    const photo = person.card?.photo || person.char?.photo;
    if (typeof photo === 'string' && /^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(photo)) {
      const image = make('img');
      image.alt = '';
      image.src = photo;
      frame.replaceChildren(image);
    } else {
      frame.textContent = name.trim().replace(/[{}]/g, '').split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] || '').join('').toUpperCase() || '?';
    }
    byId('remove-photo').hidden = !person.card?.photo;
  }
  function renderPerson() {
    const list = people();
    const index = Math.max(0, list.findIndex(person => person.key === selectedPerson));
    const person = list[index];
    byId('people-empty').hidden = !!person;
    byId('person').hidden = !person;
    byId('photo-error').hidden = true;
    if (!person) { selectedPerson = null; return; }

    selectedPerson = person.key;
    renderIdentity(person);
    byId('person-source').textContent = person.char ? 'Personagem da história · ficha de planejamento' : 'Ficha de planejamento';
    for (const input of personalFields) {
      const key = input.dataset.plannerField;
      input.value = person.card?.[key] ?? (key === 'name' ? person.char?.name || person.card?.originalName || '' : '');
    }
    byId('person-select').replaceChildren(...list.map(entry => {
      const option = make('option', personName(entry));
      option.value = entry.key;
      return option;
    }));
    byId('person-select').value = selectedPerson;
    byId('prev-person').disabled = index === 0;
    byId('next-person').disabled = index === list.length - 1;
    byId('remove-person').hidden = !!person.char;
    byId('person-connections').hidden = !person.char;
  }
  function stepPerson(step) {
    const list = people();
    const person = list[list.findIndex(entry => entry.key === selectedPerson) + step];
    if (person) { selectedPerson = person.key; renderPerson(); }
  }

  byId('launch').addEventListener('click', () => {
    if (dialog.open) return;
    if (story !== S) {
      story = S;
      selectedPerson = null;
      selectedDay = null;
    }
    const saved = story.planner || {};
    plan = {
      start: saved.start || '',
      end: saved.end || '',
      days: saved.days && typeof saved.days === 'object' && !Array.isArray(saved.days) ? saved.days : {},
      cards: Array.isArray(saved.cards) ? saved.cards.filter(card => card && typeof card.key === 'string') : [],
      refs: saved.refs&&typeof saved.refs==='object'&&!Array.isArray(saved.refs)?saved.refs:{}
    };
    byId('start').value = plan.start || phoneDateValue();
    byId('end').value = plan.end;
    byId('range-error').hidden = true;
    const range = bounds(), current = dateTime(selectedDay);
    if (range && !(current >= range.start && current <= range.end)) selectedDay = dayKey(range.start);
    page = range ? Math.floor((dateTime(selectedDay) - range.start) / (dayMs * pageDays)) : 0;
    openEditorDialog(dialog);
    renderDays();
    renderPerson();
  });
  byId('close').addEventListener('click', () => closeEditorDialog(dialog));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeEditorDialog(dialog);
  });
  byId('range').addEventListener('submit', event => {
    event.preventDefault();
    const start = byId('start').value, end = byId('end').value;
    const t0 = dateTime(start), t1 = dateTime(end);
    const error = byId('range-error');
    if (!(t1 >= t0)) {
      error.textContent = 'A data final precisa ser igual ou posterior à data inicial.';
      error.hidden = false;
      byId('end').focus();
      return;
    }
    error.hidden = true;
    plan.start = start;
    plan.end = end;
    const current = dateTime(selectedDay);
    if (!(current >= t0 && current <= t1)) selectedDay = start;
    page = Math.floor((dateTime(selectedDay) - t0) / (dayMs * pageDays));
    persistPlan();
    renderDays();
  });
  byId('range').addEventListener('input', () => { byId('range-error').hidden = true; });
  byId('prev-days').addEventListener('click', () => stepPage(-1));
  byId('next-days').addEventListener('click', () => stepPage(1));
  byId('day-note').addEventListener('input', event => {
    if (!selectedDay || story !== S) return;
    const note = event.target.value;
    if (note.trim()) plan.days[selectedDay] = note;
    else delete plan.days[selectedDay];
    updateDayTile(selectedDay);
    persistPlan();
  });
  byId('add-reference').addEventListener('click',()=>{
    if(!selectedDay||S!==story)return;
    const day=selectedDay,currentPlan=plan;
    StoryConnections.openPicker({mode:'planner',title:'Adicionar referência',
      hint:`${shortDate.format(dateTime(day))} · O vínculo aparece só no planejamento.`,exclude:refsFor(day),onSelect:ref=>{
        if(S!==story||plan!==currentPlan)return;
        plan.refs[day]=[...refsFor(day),ref];
        persistPlan();updateDayTile(day);
        if(selectedDay===day)renderReferences();
      }
    });
  });
  byId('person-connections').addEventListener('click',()=>{
    const person=people().find(entry=>entry.key===selectedPerson);
    if(person?.char)StoryConnections.openContact(person.char);
  });
  byId('add-person').addEventListener('click', () => {
    selectedPerson = `card:${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    plan.cards.push({key: selectedPerson, name: ''});
    persistPlan();
    renderPerson();
    personalFields[0].focus();
  });
  byId('prev-person').addEventListener('click', () => stepPerson(-1));
  byId('next-person').addEventListener('click', () => stepPerson(1));
  byId('person-select').addEventListener('change', event => { selectedPerson = event.target.value; renderPerson(); });
  byId('remove-person').addEventListener('click', () => {
    const person = people().find(entry => entry.key === selectedPerson);
    if (!person || person.char || !confirm(`Excluir a ficha de “${personName(person)}”?`)) return;
    plan.cards = plan.cards.filter(card => card.key !== selectedPerson);
    persistPlan();
    renderPerson();
  });
  for (const input of personalFields) input.addEventListener('input', () => {
    const person = people().find(entry => entry.key === selectedPerson);
    if (!person || story !== S) return;
    const key = input.dataset.plannerField;
    editCard(person)[key] = input.value;
    if (key === 'name') {
      renderIdentity(person);
      byId('person-select').selectedOptions[0].textContent = personName(person);
    }
    persistPlan();
  });
  byId('photo-file').addEventListener('change', async event => {
    const input = event.target, file = input.files[0], key = selectedPerson, currentPlan = plan;
    input.value = '';
    if (!file) return;
    byId('photo-error').hidden = true;
    try {
      const photo = await cropImageFile(file, 1, 320);
      if (!photo) return;
      if (currentPlan !== plan || story !== S) return;
      const person = people().find(entry => entry.key === key);
      if (person) { editCard(person).photo = photo; persistPlan(); }
      if (person && key === selectedPerson) { byId('photo-error').hidden = true; renderIdentity(person); }
    } catch (error) {
      if (currentPlan !== plan || key !== selectedPerson) return;
      const status = byId('photo-error');
      status.textContent = error.message || 'Não foi possível carregar a foto.';
      status.hidden = false;
    }
  });
  byId('remove-photo').addEventListener('click', () => {
    const person = people().find(entry => entry.key === selectedPerson);
    if (!person?.card) return;
    delete person.card.photo;
    persistPlan();
    renderIdentity(person);
  });
})();
