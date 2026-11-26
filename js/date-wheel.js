(() => {
  if (readerMode || !globalThis.HTMLDialogElement?.prototype.showModal) return;
  const tr = SiteLanguage.text;
  const locale = SiteLanguage.lang === 'en' ? 'en' : 'pt-BR';
  const monthNames = new Intl.DateTimeFormat(locale, {month:'long',timeZone:'UTC'});
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const selector = 'input:is([type=date],[type=time],[type=datetime-local]), input[type=text]:is(#pt,#nh,#f_time,#f_messageTime,#f_date)';
  const rowHeight = 42;
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
    // A small recycled window of rows: even the year wheel paints only nine nodes.
    const state = {element,field,min,max,render};
    let position = 0, frame = 0, timer = 0, drag = null, paintFrame = 0;
    function schedulePaint(){if(!paintFrame) paintFrame=requestAnimationFrame(()=>{paintFrame=0;paint();});}
    const rows = Array.from({length:9}, () => {
      const row = document.createElement('div');
      row.className = 'date-wheel-option';
      row.setAttribute('aria-hidden','true');
      element.append(row);
      return row;
    });
    function stop() { cancelAnimationFrame(frame); cancelAnimationFrame(paintFrame); paintFrame=0; frame = 0; clearTimeout(timer); timer = 0; }
    state.stop = stop;
    function render(limit) {
      stop();
      state.max = limit;
      position = clamp(position,0,limit-min);
      element.setAttribute('aria-valuemin',String(min));
      element.setAttribute('aria-valuemax',String(limit));
    }
    function paint() {
      if (!current || !dialog.open) return;
      const index = clamp(Math.round(position),0,state.max-min);
      const value = min + index;
      const previous = current.values[field];
      current.values[field] = value;
      if (previous !== value || !element.hasAttribute('aria-valuenow')) {
        element.setAttribute('aria-valuenow',String(value));
        element.setAttribute('aria-valuetext',text(value));
      }
      const angle = Math.PI/8;
      const radius = rowHeight / Math.tan(angle);
      for (let j=0;j<rows.length;j++) {
        const i=index+j-4, row=rows[j], d=i-position, theta=d*angle;
        const hidden=i<0 || i>state.max-min || Math.abs(d)>=4;
        row.hidden=hidden;
        if(hidden) continue;
        const v=min+i;
        if(row.dataset.value!==String(v)) { row.dataset.value=String(v); row.textContent=text(v); }
        row.style.transform=reduce.matches ? `translateY(${d*rowHeight}px)` : `translateZ(${-radius}px) rotateX(${-theta*180/Math.PI}deg) translateZ(${radius}px)`;
        row.style.opacity=String(Math.max(.08,Math.cos(theta)**2));
        row.classList.toggle('is-selected',i===index);
      }
      if (value !== previous && (field === 'month' || field === 'year')) adjustDay();
      if (value !== previous) error.hidden = true;
    }
    function animateTo(target, duration=430, spring=true) {
      stop(); target=clamp(target,0,state.max-min);
      if(reduce.matches || Math.abs(target-position)<.005) { position=target; paint(); return; }
      const start=position, t0=performance.now();
      function tick(now) {
        if(!dialog.open || !element.isConnected) {frame=0;return;}
        const t=Math.min(1,(now-t0)/duration);
        const u=t-1, ease=spring ? 1+1.45*u*u*u+.45*u*u : 1-(1-t)**3;
        position=clamp(start+(target-start)*ease,0,state.max-min); paint();
        if(t<1) frame=requestAnimationFrame(tick); else {frame=0;position=target;paint();}
      }
      frame=requestAnimationFrame(tick);
    }
    function go(value, animate=false) {
      const target=clamp(value,min,state.max)-min;
      if(animate) animateTo(target); else {stop();position=target;paint();}
    }
    state.go=go; state.paint=paint;
    element.addEventListener('keydown',event=>{
      const index=min+Math.round(position);
      const key={ArrowUp:index-1,ArrowDown:index+1,PageUp:index-5,PageDown:index+5,Home:min,End:state.max}[event.key];
      if(key===undefined)return; event.preventDefault();go(key,true);
    });
    element.addEventListener('wheel',event=>{
      event.preventDefault();stop();
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?180:1);
      position=clamp(position+clamp(delta/125,-2,2),0,state.max-min);paint();
      timer=setTimeout(()=>animateTo(Math.round(position)),160);
    },{passive:false});
    element.addEventListener('pointerdown',event=>{
      if(!event.isPrimary || event.button!==0)return;
      stop();element.focus({preventScroll:true});
      drag={id:event.pointerId,y:event.clientY,start:position,moved:false,samples:[[performance.now(),position]],target:event.target.closest('[data-value]')?.dataset.value};
      element.setPointerCapture(event.pointerId);element.classList.add('is-dragging');
    });
    element.addEventListener('pointermove',event=>{
      if(drag?.id!==event.pointerId)return;
      const delta=drag.y-event.clientY;
      if(!drag.moved && Math.abs(delta)<4)return;
      drag.moved=true;position=clamp(drag.start+delta/(rowHeight*1.35),0,state.max-min); schedulePaint();
      const now=performance.now();drag.samples.push([now,position]);drag.samples=drag.samples.filter(x=>now-x[0]<100);
    });
    function release(event) {
      if(drag?.id!==event.pointerId)return;
      const d=drag;drag=null;element.classList.remove('is-dragging');
      if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);
      if(event.type!=='pointerup'){animateTo(Math.round(position));return;}
      if(!d.moved){go(d.target===undefined?min+Math.round(position):Number(d.target),true);return;}
      const now=performance.now(), first=d.samples[0], last=d.samples.at(-1);
      const v=first&&last&&now-last[0]<85 ? clamp((last[1]-first[1])/Math.max(16,last[0]-first[0]),-.065,.065):0;
      const travel=reduce.matches?0:Math.sign(v)*Math.min(9,v*v/(2*.00055));
      animateTo(Math.round(position+travel),Math.min(1250,480+Math.sqrt(Math.abs(travel))*220),Math.abs(travel)<2);
    }
    for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,release);
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
      columns.forEach(column => column.stop());
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
