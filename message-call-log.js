const MessageCallLog = (() => {
  const handset = '<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z"/>';
  const icon = () => I(handset,18,'none','currentColor',1.8);
  const button = (text, attrs) => `<button type="button" ${attrs}>${icon()}<span>${esc(text)}</span></button>`;
  const details = document.getElementById('message-call-details');
  const play = details.querySelector('.message-call-play');
  const thread = () => cur === 'msg' && !cinfo && S.chats.find(chat => chat.id == cid);
  const record = message => message?.callLog?.kind === 'call' ? StoryConnections.resolve(message.callLog)?.record : null;
  const direction = call => ({in:'Incoming Call',out:'Outgoing Call',miss:'Missed Call'})[call.dir] || 'Phone Call';
  const label = message => {
    const call = record(message);
    return call ? direction(call) : 'Call Unavailable';
  };

  function render(message,index) {
    const call = record(message);
    const time = call?.ts ? fT(call.ts) : '';
    const scripted = call?.lines?.length > 0;
    return `<button type="button" class="message-call-row${call?.dir === 'miss' ? ' is-missed' : ''}" data-message-call="${index}"${!call && (readerMode || !ed) ? ' disabled' : ''}>
      <span class="message-call-symbol" aria-hidden="true">${icon()}</span><span class="message-call-copy"><strong>${label(message)}</strong><small>${esc(call?.name || message.callLog.title || 'Phone')}${scripted?' · Replay available':''}</small></span>${time ? `<time>${esc(time)}</time>` : ''}<span class="message-call-chevron" aria-hidden="true"></span>
    </button>`;
  }

  function show(call) {
    if (!call || details.open) return;
    details.querySelector('.message-call-symbol').innerHTML = icon();
    details.querySelector('h2').textContent = call.name || 'Unknown Caller';
    const fields = [['Type',direction(call)], ['Date & time',call.ts ? fFull(call.ts) : '—']];
    if (call.sub) fields.push(['Label',call.sub]);
    if (Number(call.n) > 1) fields.push(['Calls',call.n]);
    details.querySelector('dl').innerHTML = fields.map(([title,value]) =>
      `<div><dt>${title}</dt><dd>${esc(value)}</dd></div>`).join('');
    const lines = scCleanLines(call.lines);
    play.hidden = !lines.length;
    play.onclick = () => {
      if (scActive || !lines.length) return;
      details.close();
      scStart({name:call.name,lines,speed:call.speed},true,true);
    };
    details.showModal();
  }

  function append(chat,ref) {
    if (chat !== thread() || !ref || chat.msgs.some(message => StoryConnections.same(message.callLog,ref))) return;
    const ts = chatCursor(chat);
    chat.msgs.push({m:3,ts,callLog:ref});
    chat.cursor = ts + 60000;
    return true;
  }

  function restoreDraft(draft) {
    if (!thread()) return;
    if (draft && $('#mi')) {
      $('#mi').value = draft;
      msgGlassInput($('#mi'));
    }
    $('#bd .message-call-row:last-child')?.focus({preventScroll:true});
  }

  function choose() {
    const chat = thread();
    if (readerMode || !chat) return;
    const tr = SiteLanguage.text;
    if (!$('#ios-msg-appstrip').hidden) msgToggleApps();
    const alreadyUsed = new Set(chat.msgs.map(message => record(message)?.scriptSource).filter(Boolean));
    const scripts = scData().map((call,index) => ({call,index})).filter(({call}) =>
      scCleanLines(call.lines).length && !alreadyUsed.has(call.id));
    const reuse = scripts.length ? `<label class="message-call-reuse">${tr('Usar roteiro de uma chamada interativa','Use a script from an interactive call')}<select data-message-call-script><option value="">${tr('Selecione uma chamada','Choose a call')}</option>${scripts.map(({call,index}) => `<option value="${index}">${esc(scName(call))}</option>`).join('')}</select></label>` : '';
    StoryConnections.openPicker({
      kind:'call',
      title:tr('Adicionar ligação à conversa','Add call to conversation'),
      hint:tr('Escolha uma ligação do histórico ou adicione uma com roteiro.','Choose a recent call or add one with a script.'),
      context:`<div class="message-call-options">${button(tr('Registrar ligação','Log a call'),'class="message-call-create" data-message-call-create')}${button(tr('Escrever chamada passada','Write a past call'),'class="message-call-create" data-message-call-past')}</div>${reuse}`,
      exclude:chat.msgs.map(message => message.callLog).filter(Boolean),
      onSelect:ref => {
        const draft = $('#mi')?.value || '';
        if (!append(chat,ref)) return;
        save();R();
        restoreDraft(draft);
      },
    });
  }

  async function scripted(index) {
    const chat = thread(), story = S, source = index === undefined ? null : scData()[index];
    if (readerMode || !chat || (index !== undefined && !source)) return;
    const draft = $('#mi')?.value || '';
    await closeEditorDialog($('#story-item-picker'));
    if (S !== story || chat !== thread()) return;
    function store(fields) {
      if (S !== story || chat !== thread()) return false;
      const call = {...fields,dir:'in',sub:'mobile',n:1};
      S.calls.push(call);
      append(chat,StoryConnections.callReference(call));
      save();R();
      $('#narration').addEventListener('close',() => {
        if (S === story && chat === thread()) restoreDraft(draft);
      },{once:true});
      return true;
    }
    if (source) {
      const lines = scCleanLines(source.lines);
      if (!scData().includes(source) || !lines.length || (source.id && chat.msgs.some(message => record(message)?.scriptSource === source.id))) return;
      scEditPast({name:scName(source),ts:chatCursor(chat),lines,speed:source.speed}, fields => store({...fields,scriptSource:source.id}));
      return;
    }
    scEditPast({name:chat.mem.length === 1 ? cname(chat) : '',ts:chatCursor(chat)},store);
  }

  async function create() {
    const chat = thread(), story = S;
    if (readerMode || !chat) return;
    await closeEditorDialog($('#story-item-picker'));
    if (S !== story || chat !== thread()) return;
    const draft = $('#mi')?.value || '';
    form('New call',callF2({name:chat.mem.length === 1 ? cname(chat) : '',ts:chatCursor(chat)}), values => {
      if (S !== story || chat !== thread() || !values.name.trim()) return false;
      const call = callU({...values,name:values.name.trim()});
      S.calls.push(call);
      append(chat,StoryConnections.callReference(call));
    },'#md',{},() => {
      if (S === story && chat === thread()) restoreDraft(draft);
    });
  }

  function decorate() {
    if (readerMode || !thread()) return;
    const text = SiteLanguage.text('Adicionar ligação','Add call');
    $('#ios-msg-appstrip')?.insertAdjacentHTML('beforeend',button(text,'data-message-call-choose'));
    $('#mqa .conv-section:last-child [data-story-attach]')?.insertAdjacentHTML('afterend',
      `<button type="button" data-message-call-choose data-panel-action="phone">${esc(text)}</button>`);
  }

  details.querySelector('button').addEventListener('click',() => details.close());
  details.addEventListener('click',event => {
    if (event.target !== details) return;
    const box = details.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) details.close();
  });
  document.addEventListener('click',event => {
    const control = event.target.closest('button[data-message-call],button[data-message-call-choose],button[data-message-call-create],button[data-message-call-past]');
    if (!control) return;
    if ('messageCallChoose' in control.dataset) choose();
    else if ('messageCallCreate' in control.dataset) create();
    else if ('messageCallPast' in control.dataset) scripted();
    else {
      const index = Number(control.dataset.messageCall);
      const message = thread()?.msgs[index];
      if (!message?.callLog) return;
      if (ed && !readerMode) del2(index);
      else show(record(message));
    }
  });
  document.addEventListener('change',event => {
    const select = event.target;
    if (select.matches('[data-message-call-script]') && select.value !== '') {
      const index = Number(select.value);
      select.disabled = true;
      scripted(index);
    }
  });

  return {render,label,decorate};
})();
