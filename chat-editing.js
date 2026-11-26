const ChatEditing = (() => {
  const app = document.getElementById('app');
  const tr = SiteLanguage.text;
  const editLabel = () => tr('Editar mensagem', 'Edit message');
  const timeLabel = () => tr('Editar horário', 'Edit time');
  const hasAttachment = message => Boolean(message.image || message.links?.length);

  function thread() {
    if (isMessenger(cur) && cid != null) return activeChatsFor(cur).find(chat => String(chat.id) === String(cid));
    if (cur === 'ig' && igv?.t === 'dm') return igThread(igv.id);
    if (cur === 'x' && xTab === 'dm') return TwitterExtra.getThread(xDetail);
  }

  function bubble(index, message) {
    if (readerMode) {
      return message.image ? ` onclick="chatImageOpen(${index}${cur === 'ig' ? ',igv.id' : ''})"` : '';
    }
    const label = ed && cur !== 'x' ? tr('Excluir mensagem', 'Delete message') : editLabel();
    return ` data-chat-edit="${index}"${hasAttachment(message) ? '' : ` role="button" tabindex="0" title="${label}"`}`;
  }

  function time(index, marker = false) {
    if (readerMode || (ed && !marker)) return '';
    const label = ed ? tr('Excluir marcador', 'Delete time marker') : timeLabel();
    return ` data-chat-edit="${index}" data-chat-edit-action="time" role="button" tabindex="0" title="${label}"`;
  }

  function attachmentButton(index, message) {
    if (readerMode || ed || !hasAttachment(message)) return '';
    return `<button type="button" class="chat-edit-attachment" data-chat-edit="${index}" data-chat-edit-action="attachment" aria-label="${editLabel()}" title="${editLabel()}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 20 4-.8L20 7l-3-3L5 16zM14 7l3 3"/></svg></button>`;
  }

  function linkedTriggers(chat, message) {
    return [...scData(), ...storyEvents()].filter(trigger => {
      if (trigger.trigger !== 'message' || trigger.app !== cur || String(trigger.chat) !== String(chat.id)) return false;
      const matches = entry => entry && entry.m === trigger.messageType && entry.t === trigger.messageText
        && (!trigger.messageTs || entry.ts === trigger.messageTs);
      const indexed = chat.msgs[Number(trigger.message)];
      return (matches(indexed) ? indexed : chat.msgs.find(matches)) === message;
    });
  }

  function open(chat, message, trigger) {
    const story = S, appKey = cur;
    const dated = isMessenger(cur);
    const textKey = dated ? 't' : 'text';
    const originalTime = dated ? toL(Number(message.ts) || chat.base || nowTs()) : String(message.time ?? '');
    const inputSelector = appKey === 'msg' ? '#mi' : dated ? '#third-input' : '#ig-dm-input';
    const scrollSelector = dated && appKey !== 'msg' ? '#third-messages' : '.bd';
    const input = app.querySelector(inputSelector);
    const draft = input?.value;
    const scroll = app.querySelector(scrollSelector)?.scrollTop ?? 0;
    const index = chat.msgs.indexOf(message);
    const action = trigger.dataset.chatEditAction;
    const fields = [
      {k:'messageText', l:message.image ? tr('Legenda', 'Caption') : tr('Mensagem', 'Message'), t:'area', v:message[textKey]},
      {k:'messageTime', l:dated ? tr('Data e horário', 'Date and time') : tr('Horário exibido', 'Displayed time'),
        t:dated ? 'datetime-local' : 'text', v:originalTime}
    ];

    const modal = form(editLabel(), fields, values => {
      if (readerMode || S !== story || cur !== appKey || thread() !== chat || !chat.msgs.includes(message)) return false;
      if (!hasAttachment(message) && !values.messageText.trim()) {
        return invalid(textField, tr('Escreva uma mensagem.', 'Enter a message.'));
      }
      const timestamp = dated && values.messageTime ? fromL(values.messageTime) : NaN;
      if (dated && !Number.isFinite(timestamp)) {
        return invalid(timeField, tr('Informe uma data e um horário válidos.', 'Enter a valid date and time.'));
      }
      const bindings = dated ? linkedTriggers(chat, message) : [];
      const chats = () => dated ? activeChatsFor(appKey) : appKey==='ig' ? S.igDms : S.xDms;
      const currentBindings = () => [...scData(),...storyEvents()];
      const targets = [
        [message,[textKey,dated?'ts':'time','timeEdited']],
        [chat,['cursor'],()=>chat.msgs.at(-1)===message],
        ...bindings.map(binding=>[binding,['message','messageText','messageTs'],()=>currentBindings().includes(binding)]),
      ];
      EditorUndo.edit({pt:'Mensagem alterada.',en:'Message changed.'},targets,
        ()=>chats()?.includes(chat)&&chat.msgs.includes(message),()=>{
        if (message[textKey] != null || values.messageText) message[textKey] = values.messageText;
        if (values.messageTime !== originalTime) {
          if (dated) {
            message.ts = timestamp;
            if (chat.msgs.at(-1) === message) chat.cursor = timestamp + 60000;
          } else {
            message.time = values.messageTime.trim();
          }
          message.timeEdited = true;
        }
        for (const binding of bindings) {
          binding.message = chat.msgs.indexOf(message);
          binding.messageText = message.t;
          binding.messageTs = message.ts || null;
        }
      });
    }, '#md', {}, () => {
      if (thread() !== chat) return;
      const composer = app.querySelector(inputSelector);
      if (composer && draft !== undefined) {
        composer.value = draft;
        if (appKey === 'msg') msgGlassInput(composer);
      }
      const target = [...app.querySelectorAll(`[data-chat-edit="${index}"]`)]
        .find(node => node.dataset.chatEditAction === action) || app.querySelector(`[data-chat-edit="${index}"]`);
      target?.focus({preventScroll:true});
      const scroller = app.querySelector(scrollSelector);
      if (scroller) scroller.scrollTop = scroll;
    });
    const textField = modal.querySelector('#f_messageText');
    const timeField = modal.querySelector('#f_messageTime');
    for (const field of [textField,timeField]) field?.addEventListener('input', () => field.setCustomValidity(''));
    const focus = action === 'time' ? timeField : textField;
    requestAnimationFrame(() => focus?.focus({preventScroll:true}));
  }

  function invalid(field, label) {
    field.setCustomValidity(label);
    field.reportValidity();
    return false;
  }

  function activate(event) {
    if (readerMode || event.defaultPrevented) return;
    const target = event.target.closest('[data-chat-edit]');
    const nestedControl = event.target.closest('button, a, input, textarea, select');
    if (!target || (nestedControl && nestedControl !== target)) return;
    if (event.type === 'keydown') {
      if (!['Enter',' '].includes(event.key) || target.matches('button')) return;
      event.preventDefault();
    }
    const chat = thread(), index = Number(target.dataset.chatEdit), message = chat?.msgs[index];
    if (!message || message.callLog) return;
    const action = target.dataset.chatEditAction;
    if (ed && cur !== 'x') {
      if (action === 'time' && message.m !== 2) return;
      if (cur === 'ig') igMsgAction(chat.id, index);
      else del2(index);
    } else if (isMessenger(cur) && message.m === 2) {
      editTime(index);
    } else if (message.image && !action) {
      chatImageOpen(index, cur === 'ig' ? chat.id : null);
    } else {
      open(chat, message, target);
    }
  }

  app.addEventListener('click', activate);
  app.addEventListener('keydown', activate);
  return {bubble,time,attachmentButton};
})();
