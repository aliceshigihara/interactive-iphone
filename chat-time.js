const ChatTime = (() => {
  const minute = 60000;
  const weekdays = [
    ['domingo','sunday'],['segunda','monday'],['terca','tuesday'],['quarta','wednesday'],
    ['quinta','thursday'],['sexta','friday'],['sabado','saturday'],
  ];
  const normalize = text => text.trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');

  function exact(year,month,day,hour,minutes) {
    if (year<1 || year>9999 || hour>23 || minutes>59) return null;
    const date = new Date(0);
    date.setFullYear(year,month-1,day);
    date.setHours(hour,minutes,0,0);
    return date.getFullYear()===year && date.getMonth()===month-1 && date.getDate()===day &&
      date.getHours()===hour && date.getMinutes()===minutes ? +date : null;
  }

  function calendar(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    return match ? exact(...match.slice(1).map(Number)) : null;
  }

  function clock(text) {
    const match = /^(\d{1,2})(?:(?:h|:)(\d{2})|h)?\s*(am|pm)?$/.exec(text);
    if (!match) return null;
    let hour = Number(match[1]);
    const minutes = Number(match[2] || 0);
    if (match[3]) {
      if (hour<1 || hour>12) return null;
      hour = hour%12+(match[3]==='pm'?12:0);
    }
    return hour<=23 && minutes<=59 ? [hour,minutes] : null;
  }

  function parse(text,baseTs,storyTs,monthFirst=false) {
    let phrase = normalize(text);
    const base = new Date(baseTs), story = new Date(storyTs);
    if (!phrase || !Number.isFinite(+base) || !Number.isFinite(+story)) return null;
    if (/^(agora|now)$/.test(phrase)) return +story;
    const offset = /^([+-])?\s*(\d{1,6})\s*(min(?:utos?|utes?)?|m|h(?:oras?|ours?)?|d(?:ias?|ays?)?)(?:\s*(depois|antes|later|ago|earlier))?$/.exec(phrase);
    if (offset && (offset[1] || offset[4])) {
      const amount = Number(offset[2]) * (offset[1]==='-' || /^(antes|ago|earlier)$/.test(offset[4]) ? -1 : 1);
      if (offset[3][0]==='d') {
        base.setDate(base.getDate()+amount);
        return base.getFullYear()>=1 && base.getFullYear()<=9999 ? +base : null;
      }
      const value = new Date(+base+amount*(offset[3][0]==='h'?60:1)*minute);
      return value.getFullYear()>=1 && value.getFullYear()<=9999 ? +value : null;
    }

    let day = base;
    let explicit = null;
    let weekday = -1;
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?=$|[ t])/.exec(phrase);
    const slash = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?=$| )/.exec(phrase);
    const relative = /^(hoje|ontem|amanha|today|yesterday|tomorrow|proximo dia|next day)(?=$| )/.exec(phrase);
    if (iso || slash) {
      explicit = iso ? iso.slice(1).map(Number) :
        [Number(slash[3]||base.getFullYear()),Number(slash[monthFirst?1:2]),Number(slash[monthFirst?2:1])];
      phrase = phrase.slice((iso||slash)[0].length).replace(/^t/,'').trim();
    } else if (relative) {
      const [word] = relative;
      day = word==='proximo dia'||word==='next day' ? new Date(base) : story;
      const shift = /^(ontem|yesterday)$/.test(word)?-1:/^(hoje|today)$/.test(word)?0:1;
      day.setDate(day.getDate()+shift);
      phrase = phrase.slice(word.length).trim();
    } else {
      const match = /^(domingo|segunda|terca|quarta|quinta|sexta|sabado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:-feira)?(?=$| )/.exec(phrase);
      if (match) {
        weekday = weekdays.findIndex(names=>names.includes(match[1]));
        day = new Date(base);
        day.setDate(day.getDate()+(weekday-day.getDay()+7)%7);
        phrase = phrase.slice(match[0].length).trim();
      }
    }
    const time = phrase ? clock(phrase.replace(/^(?:as|at)\s+/,'')) : [base.getHours(),base.getMinutes()];
    if (!time) return null;
    const dateParts = () => [day.getFullYear(),day.getMonth()+1,day.getDate()];
    let result = exact(...(explicit||dateParts()),...time);
    if (weekday>=0 && result!==null && result<=baseTs) {
      day.setDate(day.getDate()+7);
      result = exact(...dateParts(),...time);
    }
    return result;
  }

  function markup(field) {
    const tr = SiteLanguage.text;
    return `<div class="chat-time" data-base="${field.base}" data-story="${field.story}">
      <label>${tr('Escreva uma data ou um intervalo','Type a date or a time gap')}<input class="chat-time-text" type="text" placeholder="${tr('Ex.: amanhã às 18h ou +15 min','E.g. tomorrow at 6pm or +15 min')}" autocomplete="off"></label>
      <div class="chat-time-shortcuts">
        <button type="button" data-time-shortcut="+15 min">+15 min</button>
        <button type="button" data-time-shortcut="+1 day">${tr('Dia seguinte','Next day')}</button>
        <button type="button" data-time-shortcut="now">${tr('Agora no iPhone','Now on iPhone')}</button>
      </div>
      <label>${tr('Data e hora exatas','Exact date and time')}<input id="f_${field.k}" type="datetime-local" required value="${esc(field.v)}"></label>
      <p class="chat-time-feedback" aria-live="polite"></p>
      <small>${tr('“Hoje” e “amanhã” seguem o relógio da história. Intervalos como “+15 min” partem da hora sugerida para a conversa.','“Today” and “tomorrow” follow the story clock. Time gaps like “+15 min” start at the suggested time for the conversation.')}</small>
    </div>`;
  }

  function mount(panel) {
    const root = panel.querySelector('.chat-time');
    if (!root) return;
    const natural = root.querySelector('.chat-time-text'), date = root.querySelector('[type=datetime-local]');
    const status = root.querySelector('.chat-time-feedback');
    const base = Number(root.dataset.base), story = Number(root.dataset.story);
    const english = SiteLanguage.lang==='en', tr = SiteLanguage.text;
    const fail = tr('Não reconheci essa data. Tente “amanhã às 18h”, “+15 min” ou use o calendário.','Could not read that date. Try “tomorrow at 6pm”, “+15 min”, or use the calendar.');
    function apply(text) {
      const result = text.trim() ? parse(text,base,story,english) : null;
      natural.setCustomValidity(text.trim() && result===null ? fail : '');
      status.textContent = natural.validationMessage;
      if (result!==null) {
        date.value=toL(result);
        date.setCustomValidity('');
        date.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    natural.addEventListener('input',()=>apply(natural.value));
    date.addEventListener('input',()=>{
      natural.value='';natural.setCustomValidity('');
      date.setCustomValidity(date.value&&calendar(date.value)===null?fail:'');
      status.textContent=date.validity.customError?fail:'';
    });
    root.addEventListener('click',event=>{
      const shortcut = event.target.closest('[data-time-shortcut]');
      if (!shortcut) return;
      natural.value='';
      apply(shortcut.dataset.timeShortcut);
    });
  }

  return {parse,calendar,markup,mount};
})();
