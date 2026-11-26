(() => {
  if (readerMode || !globalThis.HTMLDialogElement?.prototype.showModal) return;
  const tr = SiteLanguage.text;
  const locale = SiteLanguage.lang === 'en' ? 'en' : 'pt-BR';
  const monthNames = new Intl.DateTimeFormat(locale, {month:'short',timeZone:'UTC'});
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const selector = 'input:is([type=date],[type=time],[type=datetime-local]), input[type=text]:is(#pt,#nh,#f_time,#f_messageTime,#f_date)';
  const rowHeight = 36;
  const prepared = new WeakSet();
  const pad = (value, digits = 2) => String(value).padStart(digits, '0');
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const daysInMonth = (year, month) => {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  };
  const icons = {
    calendar:'<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4m8-4v4M4 10h16"/>',
    clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  const label = {
    date: tr('Escolher data', 'Choose date'),
    time: tr('Escolher horário', 'Choose time'),
    'datetime-local': tr('Escolher data e horário', 'Choose date and time')
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'date-wheel-dialog';
  dialog.setAttribute('aria-labelledby', 'date-wheel-title');
  dialog.innerHTML = `<h2 id="date-wheel-title"></h2><div class="date-wheel-groups"></div>
    <p class="date-wheel-error" role="alert" hidden></p>
    <div class="date-wheel-actions"><button type="button">${tr('Cancelar','Cancel')}</button><button type="button">${tr('Confirmar','Confirm')}</button></div>`;
  document.body.append(dialog);
  const groups = dialog.querySelector('.date-wheel-groups');
  const error = dialog.querySelector('.date-wheel-error');
  const [cancel, confirm] = dialog.querySelectorAll('button');
  let current;

  function typeOf(input) {
    if (input.type !== 'text') return input.type;
    if (input.id !== 'f_date') return 'time';
    const name = input.labels?.[0]?.textContent || '';
    return /data e hor[aá]rio|data e hora|date (?:and|&) time/i.test(name) ? 'datetime-local' : 'date';
  }

  function initialValue(input, type) {
    const clock = new Date(nowTs());
    const value = input.value.trim();
    const iso = value.match(/^(\d{4,})-(\d{2})-(\d{2})(?:[T ]|$)/);
    let date = iso && [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    if (!date && input.type === 'text' && type !== 'time') {
      const local = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4,})(?:\b|$)/);
      if (local) date = [Number(local[3]), Number(local[locale === 'en' ? 1 : 2]), Number(local[locale === 'en' ? 2 : 1])];
    }
    const timeText = iso ? value.slice(iso[0].length) : value;
    const time = timeText.match(/(?:^|\s)(\d{1,2})(?:(?::|h)(\d{2})|h)(?::(\d{2})(\.\d+)?)?\s*(am|pm)?$/i)
      || timeText.match(/(?:^|\s)(\d{1,2})\s*(am|pm)$/i);
    let hour = Number(time?.[1]), minute = Number(time?.[2]) || 0;
    const meridiem = time?.at(-1)?.toLowerCase();
    if (meridiem === 'am' || meridiem === 'pm') hour = hour % 12 + (meridiem === 'pm' ? 12 : 0);
    const [year, month, day] = date || [clock.getFullYear(),clock.getMonth()+1,clock.getDate()];
    const safeMonth = clamp(month, 1, 12);
    if (hour < 0 || hour > 23 || !Number.isFinite(hour)) hour = clock.getHours();
    if (!time || minute > 59) minute = clock.getMinutes();
    return {
      year:Math.max(1,year), month:safeMonth, day:clamp(day,1,daysInMonth(year,safeMonth)), hour,minute,
      seconds:Number(time?.[3]) || 0, fraction:time?.[4] || '', hasSeconds:Boolean(time?.[3])
    };
  }

  function makeWheel(group, name, field, min, max, text = String) {
    const wrap = document.createElement('div');
    const caption = document.createElement('span');
    const element = document.createElement('div');
    caption.className = 'date-wheel-caption';
    caption.textContent = name;
    element.className = 'date-wheel-column';
    element.tabIndex = 0;
    element.setAttribute('role','spinbutton');
    element.setAttribute('aria-label',name);
    wrap.append(caption,element);
    group.append(wrap);
    const state = {element,field,min,max,rows:[],render};
    let frame = 0, drag, ignoreClick = false;

    function render(limit) {
      state.max = limit;
      const rows = Array.from({length:limit-min+1}, (_, i) => {
        const row = document.createElement('div');
        row.className = 'date-wheel-option';
        row.dataset.value = String(i+min);
        row.setAttribute('aria-hidden','true');
        const copy = document.createElement('span');
        copy.textContent = text(i+min);
        row.append(copy);
        return row;
      });
      state.rows = rows;
      element.replaceChildren(...rows);
      element.setAttribute('aria-valuemin',String(min));
      element.setAttribute('aria-valuemax',String(limit));
    }

    function paint() {
      frame = 0;
      if (!current || !dialog.open) return;
      const position = element.scrollTop / rowHeight;
      const index = clamp(Math.round(position),0,state.rows.length-1);
      const value = min + index;
      const previous = current.values[field];
      current.values[field] = value;
      element.setAttribute('aria-valuenow',String(value));
      element.setAttribute('aria-valuetext',text(value));
      for (let i = Math.max(0,index-4); i <= Math.min(state.rows.length-1,index+4); i++) {
        const distance = position - i;
        const row = state.rows[i];
        row.style.setProperty('--wheel-angle', `${clamp(distance * 23,-74,74)}deg`);
        row.style.setProperty('--wheel-opacity', String(Math.max(.2,1 - .28*Math.abs(distance))));
      }
      if (value !== previous && (field === 'month' || field === 'year')) adjustDay();
      if (value !== previous) error.hidden = true;
    }

    function go(value, animate = false) {
      element.scrollTo({top:(clamp(value,min,state.max)-min)*rowHeight, behavior:animate && !reduce.matches ? 'smooth' : 'instant'});
      if (!animate || reduce.matches) paint();
    }
    state.go = go;
    state.paint = paint;
    element.addEventListener('scroll', () => {
      if (!frame) frame = requestAnimationFrame(paint);
    }, {passive:true});
    element.addEventListener('keydown', event => {
      const index = min + Math.round(element.scrollTop / rowHeight);
      const key = {ArrowUp:index-1,ArrowDown:index+1,PageUp:index-5,PageDown:index+5,Home:min,End:state.max}[event.key];
      if (key === undefined) return;
      event.preventDefault();
      go(key);
    });
    element.addEventListener('click', event => {
      if (ignoreClick) { ignoreClick = false; return; }
      const row = event.target.closest('[data-value]');
      if (row) go(Number(row.dataset.value), true);
    });
    element.addEventListener('pointerdown', event => {
      ignoreClick = false;
      if (event.pointerType === 'mouse' && event.button === 0) drag = {id:event.pointerId,y:event.clientY,top:element.scrollTop};
    });
    element.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId || Math.abs(drag.y-event.clientY) < 4 && !drag.active) return;
      if (!drag.active) {
        drag.active = true;
        element.classList.add('is-dragging');
        element.setPointerCapture(event.pointerId);
      }
      element.scrollTop = drag.top + drag.y - event.clientY;
    });
    for (const name of ['pointerup','pointercancel','lostpointercapture']) {
      element.addEventListener(name, event => {
        if (drag?.id !== event.pointerId) return;
        if (drag.active) {
          ignoreClick = true;
          element.classList.remove('is-dragging');
          go(min + Math.round(element.scrollTop / rowHeight),true);
        }
        drag = null;
      });
    }
    render(max);
    return state;
  }

  function adjustDay() {
    const day = current.columns.find(column => column.field === 'day');
    if (!day) return;
    const {year,month} = current.values;
    const max = daysInMonth(year,month);
    if (day.max === max) return;
    const next = Math.min(current.values.day,max);
    day.render(max);
    day.go(next);
  }

  function makeGroup() {
    const row = document.createElement('div');
    row.className = 'date-wheel-row';
    groups.append(row);
    return row;
  }

  function open(input, button) {
    if (dialog.open || input.matches(':disabled,[readonly]')) return;
    const type = typeOf(input);
    const values = initialValue(input,type);
    const columns = [];
    current = {input,type,values,columns};
    groups.replaceChildren();
    error.hidden = true;
    dialog.querySelector('h2').textContent = label[type];
    if (type !== 'time') {
      const row = makeGroup();
      const day = () => makeWheel(row,tr('Dia','Day'),'day',1,daysInMonth(values.year,values.month),pad);
      const month = () => makeWheel(row,tr('Mês','Month'),'month',1,12,n => monthNames.format(new Date(Date.UTC(2020,n-1,1))));
      const year = () => makeWheel(row,tr('Ano','Year'),'year',Math.max(1,values.year-125),values.year+125);
      columns.push(...(locale === 'en' ? [month(),day(),year()] : [day(),month(),year()]));
    }
    if (type !== 'date') {
      const row = makeGroup();
      columns.push(makeWheel(row,tr('Horas','Hours'),'hour',0,23,n => pad(n)));
      columns.push(makeWheel(row,tr('Minutos','Minutes'),'minute',0,59,n => pad(n)));
    }
    button.setAttribute('aria-expanded','true');
    dialog.showModal();
    columns.forEach(column => column.go(values[column.field]));
    columns[0].element.focus({preventScroll:true});
    dialog.addEventListener('close',() => {
      button.setAttribute('aria-expanded','false');
      if (button.isConnected) button.focus({preventScroll:true});
      current = null;
    },{once:true});
  }

  function commit() {
    if (!current) return;
    const {input,type,values,columns} = current;
    if (!input.isConnected) { dialog.close(); return; }
    columns.forEach(column => column.paint());
    const {year,month,day,hour,minute,seconds,fraction,hasSeconds} = values;
    const isoDate = `${pad(year,4)}-${pad(month)}-${pad(day)}`;
    const labelDate = locale === 'en' ? `${pad(month)}/${pad(day)}/${pad(year,4)}` : `${pad(day)}/${pad(month)}/${pad(year,4)}`;
    const date = input.type === 'text' ? labelDate : isoDate;
    const time = `${pad(hour)}:${pad(minute)}${hasSeconds && (seconds || fraction) ? `:${pad(seconds)}${fraction}` : ''}`;
    const value = type === 'date' ? date : type === 'time' ? time : `${date}${input.type === 'text' ? ' ' : 'T'}${time}`;
    const trial = input.cloneNode();
    trial.value = value;
    if (!trial.value || !trial.validity.valid) {
      error.textContent = trial.validationMessage || tr('Escolha uma data ou um horário válido.','Choose a valid date or time.');
      error.hidden = false;
      return;
    }
    dialog.close();
    if (input.value === trial.value) return;
    input.value = trial.value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    if (input.isConnected) input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function enhance(input) {
    if (prepared.has(input)) return;
    prepared.add(input);
    const wrap = document.createElement('span');
    const button = document.createElement('button');
    const type = typeOf(input);
    wrap.className = 'date-wheel-control';
    wrap.toggleAttribute('data-native',input.type !== 'text');
    button.type = 'button';
    button.className = 'date-wheel-trigger';
    button.setAttribute('aria-label',label[type]);
    button.setAttribute('aria-haspopup','dialog');
    button.setAttribute('aria-expanded','false');
    button.title = label[type];
    button.innerHTML = icon(type === 'time' ? 'clock' : 'calendar');
    input.before(wrap);
    wrap.append(input,button);
    button.addEventListener('click',() => open(input,button));
  }
  function scan(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches(selector)) enhance(node);
    node.querySelectorAll(selector).forEach(enhance);
  }
  cancel.addEventListener('click',() => dialog.close());
  confirm.addEventListener('click',commit);
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  scan(document.body);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan)))
    .observe(document.body,{childList:true,subtree:true});
})();
