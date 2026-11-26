const MessageAudio = (() => {
  const app = document.getElementById('app');
  const tr = SiteLanguage.text;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const maxBytes = 300 * 1024;
  const extensions = {
    mp3:'mpeg', m4a:'mp4', mp4:'mp4', aac:'aac', ogg:'ogg', oga:'ogg',
    opus:'ogg', wav:'wav', webm:'webm', flac:'flac'
  };
  const mime = '(?:mpeg|mp4|x-m4a|aac|ogg|wav|wave|x-wav|webm|flac|x-flac)';
  const audioType = new RegExp(`^audio/${mime}$`, 'i');
  const dataType = new RegExp(`^data:audio/${mime};base64,[A-Za-z0-9+/]+={0,2}$`, 'i');
  const playIcon = '<polygon points="6 3 20 12 6 21 6 3"/>';
  const pauseIcon = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
  const waveIcon = '<path d="M2 11v2M6 8v8M12 3v18M18 8v8M22 11v2"/>';
  const label = () => tr('Mensagem de áudio','Audio message');
  const addLabel = () => tr('Adicionar áudio','Add audio');
  const failed = () => tr('Não foi possível reproduzir este áudio.','Could not play this audio.');
  const thread = () => cur==='msg' && !locked && !cinfo && S.chats.find(chat=>chat.id==cid);
  const seconds = value => Number.isFinite(value) ? Math.max(0,Math.floor(value)) : 0;
  const clock = value => `${Math.floor(seconds(value)/60)}:${String(seconds(value)%60).padStart(2,'0')}`;

  let playback;
  const transcriptModes = new WeakMap();

  function composer(inMenu = false) {
    const icon = I(inMenu?waveIcon:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0m-7 7v3m-3 0h6"/>',24,'none','currentColor',inMenu?2.5:1.7);
    if (readerMode) return inMenu?'':`<span class="ios-glass-wave" aria-hidden="true">${icon}</span>`;
    return inMenu
      ? `<button type="button" data-message-audio-add>${icon}<span>${addLabel()}</span></button>`
      : `<button type="button" class="ios-glass-wave" data-message-audio-add aria-label="${addLabel()}">${icon}</button>`;
  }

  function source(audio) {
    const src = audio?.src;
    if (typeof src!=='string' || src.length>maxBytes*4/3+64 || !dataType.test(src)) return '';
    return src;
  }

  function durationFor(message) {
    if (message.audio.src) return Number(message.audio.duration);
    const words = String(message.t||'').match(/\S+/g)?.length || 0;
    return Math.max(2,Math.ceil(words*.45+.5));
  }

  function isPlaying(session) {
    if (!session || session.error) return false;
    return session.media ? !session.media.paused && !session.media.ended : !!session.timer;
  }

  function render(message, index, classes) {
    const text = String(message.t || '').trim();
    const duration = durationFor(message);
    const transcriptId = `message-audio-text-${index}`;
    const transcript = text ? `<div class="message-audio-text" id="${transcriptId}" hidden>
      <span class="message-audio-sr">${esc(text)}</span>
      <p aria-hidden="true">${(text.match(/\s+|\S+/g)||[]).map(part=>/\S/.test(part)?`<span class="message-audio-word">${esc(part)}</span>`:esc(part)).join('')}</p>
    </div>` : '';
    const track = `<span class="message-audio-wave" aria-hidden="true">${Array.from({length:20},(_,i)=>`<i style="--wave-delay:${i*50}ms"></i>`).join('')}</span>
      <time datetime="PT${seconds(duration)}S">${clock(duration)}</time>`;
    const transcriptLabel = tr('Ver transcrição','Show transcript');
    const edit = ed&&!readerMode
      ? `<button type="button" class="chat-edit-attachment" data-chat-edit="${index}" data-chat-edit-action="attachment" aria-label="${tr('Excluir áudio','Delete audio')}">×</button>`
      : ChatEditing.attachmentButton(index,message);
    return `<div class="message-audio ${classes}" data-message-audio="${index}" data-sc-msg="${index}"${ChatEditing.bubble(index,message)}>
      <div class="message-audio-player">
        <button type="button" class="message-audio-play" aria-label="${tr('Reproduzir áudio','Play audio')}">${I(playIcon,16,'currentColor','currentColor',2)}</button>
        ${text ? `<button type="button" class="message-audio-track message-audio-transcript" aria-expanded="false" aria-controls="${transcriptId}" aria-label="${transcriptLabel}" title="${transcriptLabel}">${track}</button>`
          : `<div class="message-audio-track">${track}</div>`}
      </div>${transcript}${StoryConnections.messageMarkup(message)}${edit}<p class="message-audio-error" role="status" hidden></p>
    </div>`;
  }

  function cardFor(message) {
    const index = thread()?.msgs.indexOf(message);
    return index>=0 ? app.querySelector(`[data-message-audio="${index}"]`) : null;
  }

  function paint(card, message, session = playback?.message===message ? playback : null) {
    const media = session?.media;
    const playing = isPlaying(session);
    const control = card.querySelector('.message-audio-play');
    card.classList.toggle('is-playing',playing);
    if (control.dataset.playing!==String(playing)) {
      control.dataset.playing = String(playing);
      control.innerHTML = I(playing?pauseIcon:playIcon,16,'currentColor','currentColor',2);
      control.setAttribute('aria-label',playing?tr('Pausar áudio','Pause audio'):tr('Reproduzir áudio','Play audio'));
    }
    const duration = Number.isFinite(media?.duration) ? media.duration : session?.duration ?? durationFor(message);
    const currentTime = media?.currentTime ?? session?.time ?? 0;
    const elapsed = playing || (currentTime>0 && currentTime<duration) ? currentTime : duration;
    const display = card.querySelector('time');
    if (display.textContent!==clock(elapsed)) {
      display.textContent = clock(elapsed);
      display.dateTime = `PT${seconds(elapsed)}S`;
    }
    const error = card.querySelector('.message-audio-error');
    error.hidden = !session?.error;
    if (session?.error && !error.textContent) error.textContent = failed();
    const words = card.querySelector('.message-audio-text');
    if (!words) return;
    const mode = transcriptModes.get(message);
    const opening = words.hidden && !!mode;
    words.hidden = !mode;
    const toggle = card.querySelector('.message-audio-transcript');
    toggle.setAttribute('aria-expanded',String(!!mode));
    const toggleLabel = mode==='full' ? tr('Ocultar transcrição','Hide transcript')
      : mode==='live' ? tr('Ver transcrição completa','Show full transcript') : tr('Ver transcrição','Show transcript');
    toggle.setAttribute('aria-label',toggleLabel);
    toggle.title = toggleLabel;
    if (!mode) return;
    const spans = words.querySelectorAll('.message-audio-word');
    const count = mode==='full'||reduce.matches ? spans.length
      : Math.min(spans.length,1+Math.floor(currentTime*spans.length/Math.max(duration||0,1)));
    let newest;
    spans.forEach((word,i)=>{
      const visible = i<count;
      if (visible && !word.classList.contains('is-revealed')) newest = word;
      word.classList.toggle('is-revealed',visible);
      word.classList.toggle('phone-transcript-word',mode==='live' && visible);
    });
    if (mode==='live' && newest) words.scrollTop = Math.max(0,newest.offsetTop + newest.offsetHeight - words.clientHeight);
    if (opening) {
      const scroll = card.closest('.bd');
      const overhang = words.getBoundingClientRect().bottom-scroll.getBoundingClientRect().bottom;
      if (overhang>0) scroll.scrollTop += overhang;
    }
  }

  function update(session) {
    if (playback!==session) return;
    const card = cardFor(session.message);
    if (card) paint(card,session.message,session);
  }

  function stop() {
    if (!playback) return;
    const session = playback;
    playback = null;
    clearInterval(session.timer);
    session.media?.pause();
    session.media?.removeAttribute('src');
    session.media?.load();
    if (transcriptModes.get(session.message)==='live') transcriptModes.set(session.message,'full');
    const card = cardFor(session.message);
    if (card) paint(card,session.message,null);
  }

  function pause(session) {
    if (!session) return;
    if (session.media) session.media.pause();
    else {
      clearInterval(session.timer);
      session.timer = null;
      update(session);
    }
  }

  function finish(session) {
    if (playback!==session) return;
    clearInterval(session.timer);
    session.timer = null;
    if (transcriptModes.get(session.message)==='live') transcriptModes.set(session.message,'full');
    update(session);
  }

  function togglePlayback(message, card) {
    if (playback?.message===message && isPlaying(playback)) {
      pause(playback);
      return;
    }
    if (playback?.message!==message || playback?.error) {
      stop();
      const media = message.audio.src ? new Audio() : null;
      const session = {story:S,chat:thread(),message,media,text:message.t,duration:durationFor(message),time:0};
      playback = session;
      if (media) {
        for (const event of ['play','pause','timeupdate','loadedmetadata']) media.addEventListener(event,()=>update(session));
        media.addEventListener('ended',()=>finish(session));
        media.addEventListener('error',()=>{session.error=true;update(session)});
        const src = source(message.audio);
        if (!src) { session.error=true; paint(card,message,session); return; }
        media.src = src;
      }
    }
    const session = playback;
    const ended = session.media?.ended ?? (session.time>=session.duration);
    if (String(message.t||'').trim() && (!transcriptModes.has(message) || ended)) {
      transcriptModes.set(message,'live');
    }
    if (!session.media) {
      if (ended) session.time = 0;
      const started = performance.now()-session.time*1000;
      session.timer = setInterval(()=>{
        session.time = Math.min(session.duration,(performance.now()-started)/1000);
        if (session.time>=session.duration) finish(session);
        else update(session);
      },80);
      update(session);
      return;
    }
    session.media.play().catch(error=>{
      if (playback===session && error.name!=='AbortError') {session.error=true;update(session)}
    });
  }

  function readFile(file, type) {
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(new Blob([file],{type}));
    });
  }

  function metadata(player, url) {
    return new Promise((resolve,reject)=>{
      const finish = success => {
        clearTimeout(timeout);
        player.onloadedmetadata = player.ondurationchange = player.onerror = null;
        if (success && Number.isFinite(player.duration) && player.duration>0) resolve(player.duration);
        else reject(new Error(failed()));
      };
      const timeout = setTimeout(()=>finish(false),8000);
      player.onloadedmetadata = () => {
        if (player.duration===Infinity) {
          // A WebM recorded without a duration header exposes it after seeking to the end.
          player.ondurationchange = ()=>{if (Number.isFinite(player.duration)) finish(true)};
          player.currentTime = Number.MAX_SAFE_INTEGER;
        } else finish(true);
      };
      player.onerror = ()=>finish(false);
      player.src = url;
    });
  }

  function compose() {
    const chat = thread(), story = S;
    if (readerMode || !chat || document.querySelector('.message-audio-editor[open]')) return;
    pause(playback);
    const sender = snd(chat)[who%snd(chat).length];
    const draft = app.querySelector('#mi')?.value;
    if (!$('#ios-msg-appstrip').hidden) msgToggleApps();
    const dialog = document.createElement('dialog');
    dialog.className = 'message-audio-editor';
    dialog.setAttribute('aria-labelledby','message-audio-title');
    dialog.innerHTML = `<form>
      <h2 id="message-audio-title">${addLabel()}</h2>
      <label>${tr('Transcrição','Transcript')}<textarea rows="4" maxlength="4000" placeholder="${tr('Escreva o que é dito no áudio','Write what is said in the audio')}" autofocus></textarea></label>
      <p class="message-audio-hint">${tr('Basta escrever a transcrição para criar um áudio simulado.','Just write the transcript to create a simulated audio message.')}</p>
      <details class="message-audio-file">
        <summary>${tr('Anexar arquivo de áudio (opcional)','Attach an audio file (optional)')}</summary>
        <input type="file" accept="audio/*,.m4a,.opus,.webm" aria-label="${tr('Arquivo de áudio','Audio file')}">
        <p class="message-audio-hint">${tr('Até 300 KB por áudio.','Up to 300 KB per clip.')}</p>
        <audio controls preload="metadata" hidden></audio>
      </details>
      <p class="message-audio-form-status" role="status"></p>
      <footer><button type="button">${tr('Cancelar','Cancel')}</button><button type="submit" disabled>${tr('Enviar áudio','Send audio')}</button></footer>
    </form>`;
    const input = dialog.querySelector('input'), player = dialog.querySelector('audio');
    const transcript = dialog.querySelector('textarea');
    const submit = dialog.querySelector('[type=submit]'), status = dialog.querySelector('[role=status]');
    let url, audio, posted, loading = false, selection = 0;
    function updateSubmit() {
      submit.disabled = loading || (!audio && !transcript.value.trim());
    }
    transcript.oninput = updateSubmit;
    function clearPreview() {
      player.pause();
      player.removeAttribute('src');
      player.load();
      player.hidden = true;
      if (url) URL.revokeObjectURL(url);
      url = '';
    }
    input.onchange = async () => {
      const current = ++selection;
      clearPreview();
      status.textContent = '';
      audio = null;
      loading = false;
      updateSubmit();
      const file = input.files[0];
      if (!file) return;
      const extension = file.name.split('.').at(-1).toLowerCase();
      const type = audioType.test(file.type) ? file.type.toLowerCase()
        : Object.hasOwn(extensions,extension) ? `audio/${extensions[extension]}` : '';
      if (!type || !file.size || file.size>maxBytes) {
        input.value = '';
        status.textContent = tr('Escolha um arquivo de áudio de até 300 KB.','Choose an audio file up to 300 KB.');
        return;
      }
      loading = true;
      updateSubmit();
      status.textContent = tr('Carregando áudio…','Loading audio…');
      const probe = new Audio();
      const previewUrl = url = URL.createObjectURL(new Blob([file],{type}));
      try {
        const duration = await metadata(probe,previewUrl);
        const src = await readFile(file,type);
        if (selection!==current || !dialog.open) return;
        audio = {src,duration};
        player.src = previewUrl;
        player.hidden = false;
        status.textContent = '';
      } catch {
        if (selection===current && dialog.open) {
          clearPreview();
          input.value = '';
          status.textContent = failed();
        }
      } finally {
        probe.removeAttribute('src');
        probe.load();
        if (selection===current && dialog.open) {
          loading = false;
          updateSubmit();
        }
      }
    };
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const text = transcript.value.trim();
      if (loading || (!audio&&!text) || submit.disabled || readerMode || S!==story || thread()!==chat) return;
      submit.disabled = true;
      const ts = chatCursor(chat);
      posted = {...(sender.id?{m:0,s:sender.id}:{m:1}),t:text,ts,audio:audio||{}};
      chat.msgs.push(posted);
      chat.cursor = ts+60000;
      pop = true;
      closeEditorDialog(dialog);
      save();R();
      const composer = app.querySelector('#mi');
      if (composer && draft!==undefined) {composer.value=draft;msgGlassInput(composer)}
    };
    dialog.querySelector('[type=button]').onclick = ()=>closeEditorDialog(dialog);
    dialog.addEventListener('close',()=>{
      selection++;
      clearPreview();
      dialog.remove();
      if (thread()!==chat || S!==story) return;
      const target = posted ? cardFor(posted)?.querySelector('.message-audio-play')
        : app.querySelector('.ios-glass-wave:not([hidden]), #mi');
      target?.focus({preventScroll:true});
    },{once:true});
    document.body.append(dialog);
    openEditorDialog(dialog);
  }

  function sync() {
    const chat = thread();
    if (playback && (playback.story!==S || playback.chat!==chat || !cardFor(playback.message)
      || (!playback.media && playback.text!==playback.message.t))) stop();
    if (!chat) return;
    for (const card of app.querySelectorAll('[data-message-audio]')) {
      paint(card,chat.msgs[Number(card.dataset.messageAudio)]);
    }
  }

  app.addEventListener('click',event=>{
    const button = event.target.closest('button');
    if (button?.hasAttribute('data-message-audio-add')) { compose(); return; }
    const card = button?.closest('[data-message-audio]');
    if (!card || (ed&&!readerMode)) return;
    const message = thread()?.msgs[Number(card.dataset.messageAudio)];
    if (!message?.audio) return;
    if (button.matches('.message-audio-play')) togglePlayback(message,card);
    if (button.matches('.message-audio-transcript')) {
      if (transcriptModes.get(message)==='full') transcriptModes.delete(message);
      else transcriptModes.set(message,'full');
      paint(card,message);
    }
  });
  return {composer,render,sync,stop,label};
})();
