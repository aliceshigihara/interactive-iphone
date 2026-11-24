/* Phone's extra tabs use story data; dialing never contacts a real number. */
const PhoneApp = (() => {
  const tabs = [
    ['favorites','Favorites','<path fill="currentColor" stroke-linejoin="round" d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z"/>'],
    ['recents','Recents','<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 1 1 0-20Zm.8 4.5a.8.8 0 0 0-1.6 0v5H7a.8.8 0 0 0 0 1.6h5a.8.8 0 0 0 .8-.8V6.5Z"/>'],
    ['contacts','Contacts','<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 1 1 0-20Zm0 4.2a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 1 0 0-6.2Zm-6 11.2a7.9 7.9 0 0 0 12 0c-.8-2-3.1-3.5-6-3.5s-5.2 1.5-6 3.5Z"/>'],
    ['keypad','Keypad',`<g fill="currentColor" stroke="none">${[5,12,19].flatMap(y=>[5,12,19].map(x=>`<circle cx="${x}" cy="${y}" r="2.45"/>`)).join('')}</g>`],
    ['voicemail','Voicemail','<circle cx="7" cy="12" r="3.5"/><circle cx="17" cy="12" r="3.5"/><path d="M7 15.5h10"/>']
  ];
  const hand = '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>';
  const bubble = '<path d="M12 3C6.5 3 2 6.7 2 11.2c0 2.7 1.7 5.1 4.2 6.5l-.8 3 3.7-2a13 13 0 0 0 2.9.4c5.5 0 10-3.6 10-7.9S17.5 3 12 3z"/>';
  const stopHand = '<path d="M5.8 11.7V6.2a1.3 1.3 0 1 1 2.6 0v4.4h.8V3.5a1.3 1.3 0 0 1 2.6 0v7.1h.8V2.9a1.3 1.3 0 1 1 2.6 0v7.7h.8V5.1a1.3 1.3 0 1 1 2.6 0v8l1.1-1.5a1.4 1.4 0 0 1 2.3 1.6l-2.3 4.2a9.2 9.2 0 0 1-8.1 4.8 6.1 6.1 0 0 1-6.1-6.1z"/>';
  const chars = () => S.chars;
  const person = id => chars().find(c => String(c.id) === String(id));
  const favorites = () => Array.isArray(S.phoneFavorites) ? S.phoneFavorites : [];
  const messages = () => Array.isArray(S.phoneVoicemails) ? S.phoneVoicemails : [];
  const norm = value => String(value ?? '').trim().toLowerCase();
  const dialDigits = value => String(value ?? '').replace(/[^\d*#+]/g,'');
  const readInSession = new WeakSet();
  const blockedInSession = new WeakMap();
  const voicemailPaces = [
    {v:250,l:'Rápida · 0,25 s'},
    {v:450,l:'Normal · 0,45 s'},
    {v:700,l:'Lenta · 0,70 s'},
    {v:950,l:'Muito lenta · 0,95 s'}
  ];
  const keyPresses = new WeakMap();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let tab='recents', contact=null, voicemail=null, liveSession=null, query='', number='', call=null, keyTimer, longZero=false, transcriptRun=null, transcriptTimer;

  function reset() { tab='recents'; contact=call=null; query=number=''; clearTimeout(keyTimer); longZero=false; closeVoicemail(); }
  function switchTab(next) {
    if(!tabs.some(([key])=>key===next))return;
    tab=next;contact=null;query='';cedit=false;cflt=0;closeVoicemail();R();
    $(`#app [data-phone-tab="${tab}"]`)?.focus({preventScroll:true});
  }
  const action = (code, value) => `data-phone-action="${code}"${value==null?'':` data-phone-value="${esc(value)}"`}`;
  const button = (code, label, value, css='') => `<button type="button" class="${css}" ${action(code,value)}>${esc(label)}</button>`;
  const phoneIcon = (d, size=24) => I(d,size,'none','currentColor',1.75);
  const nav = () => {
    const unread = messages().some(v=>!isRead(v));
    return `<nav class="phone-tabbar" aria-label="Phone">${tabs.map(([key,label,icon])=>`<button type="button" data-phone-tab="${key}" ${tab===key?'aria-current="page"':''}${key==='voicemail'&&unread?' aria-label="Voicemail, novos recados"':''}>${phoneIcon(icon,23)}<span>${label}</span>${key==='voicemail'&&unread?'<i class="phone-tab-unread" aria-hidden="true"></i>':''}</button>`).join('')}</nav>`;
  };
  const empty = (title,subtitle='') => `<div class="phone-empty"><b>${esc(title)}</b>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div>`;
  function heading(title, add, label) {
    const plus = add&&!readerMode ? `<button type="button" class="phone-add" ${action(add)} aria-label="${esc(label)}">${phoneIcon('<path d="M12 4v16M4 12h16"/>',23)}</button>` : '';
    return `<header class="phone-heading"><h2>${esc(title)}</h2>${plus}</header>`;
  }
  function navBack(label, code) {
    return `<div class="phone-detail-nav">${button(code,'‹ '+label)}${code==='back-contact'&&!readerMode?button('edit-contact','Edit'):''}</div>`;
  }
  function isFavorite(p) { return favorites().some(id=>String(id)===String(p.id)); }
  function markFavorite(p, value) {
    if(readerMode||!p)return;
    const next=favorites().filter(id=>String(id)!==String(p.id));
    if(value)next.push(p.id);
    S.phoneFavorites=next;save();R();
  }
  function chooseFavorite() {
    const available=chars().filter(p=>!isFavorite(p));
    if(!available.length){form('Nenhum contato disponível para adicionar aos favoritos.',[],()=>{},'#pm');return}
    form('Adicionar favorito',[{k:'favoriteContact',l:'Contato',t:'sel',o:available.map(p=>({v:p.id,l:p.name}))}],v=>markFavorite(person(v.favoriteContact),true),'#pm');
  }
  function editContact(p) {
    if(readerMode||!p)return;
    form('Editar contato',[{k:'name',l:'Nome',v:p.name},{k:'phone',l:'Telefone',v:p.phone||''},{k:'email',l:'E-mail',v:p.email||''},{k:'photo',l:'Foto',t:'file'}],v=>{
      p.name=v.name.trim()||p.name;p.phone=v.phone.trim();p.email=v.email.trim();if(v.photo)p.photo=v.photo;
    },'#pm',p);
  }
  function contactRow(p) {
    return `<button type="button" class="phone-list-row" ${action('show-contact',p.id)}>${av(p,39)}<span><b>${esc(p.name)}</b>${p.phone||p.email?`<small>${esc(p.phone||p.email)}</small>`:''}</span><span class="phone-disclosure">›</span></button>`;
  }
  function searchedContacts() {
    const q=norm(query);
    return [...chars()].sort((a,b)=>String(a.name).localeCompare(String(b.name))).filter(p=>!q||[p.name,p.phone,p.email].some(s=>norm(s).includes(q)));
  }
  function contacts() {
    const p=person(contact);
    if(p)return contactDetail(p);
    const list=searchedContacts();
    return heading('Contacts','new-contact','Adicionar contato')+`<label class="phone-search">${phoneIcon('<circle cx="10.5" cy="10.5" r="6.3"/><path d="m15 15 5 5"/>',17)}<input class="native-search-input" id="phone-contact-search" placeholder="Search" aria-label="Buscar contatos" value="${esc(query)}"></label><div class="bd phone-rows" id="phone-contact-results">${list.map(contactRow).join('')||empty('No contacts',chars().length?'No contacts match your search.':'Add a character to create a contact.')}</div>`;
  }
  function contactDetail(p) {
    const phone=String(p.phone||''), email=String(p.email||'');
    return navBack(tab==='favorites'?'Favorites':'Contacts','back-contact')+`<div class="bd phone-contact-card"><div class="phone-profile">${av(p,79)}<h2>${esc(p.name)}</h2></div><div class="phone-contact-actions">${phone?button('call-contact','Call',p.id,'phone-blue-action'):''}${button('connections','Conexões',p.id,'phone-blue-action')}</div><div class="phone-data">${phone?`<div><small>mobile</small><b>${esc(phone)}</b></div>`:''}${email?`<div><small>email</small><b>${esc(email)}</b></div>`:''}${!phone&&!email?'<div><small>No phone number or email.</small></div>':''}</div>${readerMode?'':button('favorite-toggle',isFavorite(p)?'Remove from Favorites':'Add to Favorites',p.id,'phone-blue-action')}</div>`;
  }
  function favoritesView() {
    const p=person(contact);if(p)return contactDetail(p);
    const people=favorites().map(person).filter(Boolean);
    return heading('Favorites','new-favorite','Adicionar favorito')+`<div class="bd phone-rows">${people.map(contactRow).join('')||empty('No Favorites','Your favorite contacts will appear here.')}</div>`;
  }
  function keypad() {
    const letters={2:'ABC',3:'DEF',4:'GHI',5:'JKL',6:'MNO',7:'PQRS',8:'TUV',9:'WXYZ',0:'+'};
    return `<section class="bd phone-keypad"><div class="phone-keypad-layout"><output id="phone-number" aria-label="Número digitado" aria-live="polite">${esc(number)}</output><div class="phone-digits" aria-label="Teclado numérico">${['1','2','3','4','5','6','7','8','9','*','0','#'].map(key=>`<button type="button" ${action('digit',key)} aria-label="${key}"><b>${key==='*'?'✱':key}</b>${letters[key]?`<small aria-hidden="true">${letters[key]}</small>`:''}</button>`).join('')}</div><div class="phone-key-controls"><span></span><button type="button" id="phone-dial" ${action('dial')} aria-label="Ligar (simulação)" ${number?'':'disabled'}>${I(hand,27,'currentColor','none')}</button><button type="button" id="phone-erase" ${action('erase')} aria-label="Apagar último dígito" ${number?'':'disabled'}>${phoneIcon('<path d="M21 5H9L2 12l7 7h12zM12 9l5 6m0-6-5 6"/>',23)}</button></div></div></section>`;
  }
  function animateKey(key) {
    if(!key||key.disabled||reducedMotion.matches||typeof key.animate!=='function')return Promise.resolve();
    keyPresses.get(key)?.cancel();
    key.classList.add('is-key-press');
    const motion=key.animate([
      {transform:'scale(.89,.91)'},
      {transform:'scale(1.07,1.05)',offset:.58},
      {transform:'scale(1)'}
    ],{duration:260,easing:'cubic-bezier(.18,.65,.32,1)'});
    keyPresses.set(key,motion);
    return motion.finished.catch(()=>{}).finally(()=>{
      if(keyPresses.get(key)!==motion)return;
      keyPresses.delete(key);
      key.classList.remove('is-key-press');
    });
  }
  function updateNumber() {
    const output=$('#phone-number');
    if(!output)return;
    output.textContent=number;
    $('#phone-dial').disabled=!number;$('#phone-erase').disabled=!number;
  }
  function digit(value) { if(/^[\d*#+]$/.test(value)&&number.length<24){number+=value;updateNumber()} }
  function erase() {
    const onErase=document.activeElement===$('#phone-erase');
    number=number.slice(0,-1);updateNumber();
    if(onErase&&!number)$('[data-phone-action="digit"][data-phone-value="0"]')?.focus({preventScroll:true});
  }
  function dial(raw,p) {
    const digits=dialDigits(raw);if(!digits)return;
    const matches=chars().filter(c=>dialDigits(c.phone)===digits);
    call={number:String(raw),name:(p||(matches.length===1?matches[0]:null))?.name||''};R();
  }
  function callView() {
    return `<div class="bd phone-dial-preview"><div class="phone-profile"><span class="phone-dial-avatar">${phoneIcon(hand,34)}</span><h2>${esc(call.name||call.number)}</h2>${call.name&&call.number?`<p>${esc(call.number)}</p>`:''}<small>Ligação simulada</small></div><div class="phone-call-actions">${readerMode?'':button('register-call','Registrar em Recents',null,'phone-blue-action')}<button type="button" class="phone-end-call" ${action('end-call')} aria-label="Encerrar ligação">${I(hand,25,'currentColor','none')}</button></div></div>`;
  }
  function finishCall(record) {
    if(!call)return;
    if(record&&!readerMode){
      S.calls.push({name:call.name||call.number,sub:'mobile',dir:'out',n:1,ts:nowTs()});save();
      tab='recents';cedit=false;cflt=0;
    }
    call=null;R();
  }
  function voicemailName(v) { return person(v.personId)?.name||v.caller||'Unknown Caller'; }
  function voicemailPoster(v) { return [v.vmposter,v.poster,person(v.personId)?.photo].find(chatValidImage)||''; }
  function isRead(v) { return !!v.read||readInSession.has(v); }
  function currentVoicemail() { return messages().find(m=>m.id===voicemail); }
  function voicemailKey(v) { return norm(v.caller)||String(v.id); }
  function isBlocked(v) { return !!blockedInSession.get(S)?.has(voicemailKey(v)); }
  function paceFor(value) { return voicemailPaces.find(p=>p.v===Number(value))||voicemailPaces[1]; }
  function accepted(v) { return liveSession?.voicemail===v&&liveSession.accepted; }
  function editVoicemail(existing) {
    const options=[{v:'',l:'Remetente personalizado'},...chars().map(p=>({v:p.id,l:p.name}))];
    form(existing?'Editar voicemail':'Novo voicemail',[{k:'personId',l:'Contato',t:'sel',v:existing?.personId||'',o:options},{k:'caller',l:'Nome ou número (se não usar um contato)',v:existing?.caller},{k:'ts',l:'Data e hora',t:'datetime-local',v:toL(existing?.ts||nowTs())},{k:'transcript',l:'Transcrição da mensagem',t:'area',v:existing?.transcript},{k:'speechInterval',l:'Ritmo da transcrição (tempo entre palavras)',t:'sel',v:paceFor(existing?.speechInterval).v,o:voicemailPaces},{k:'vmposter',l:'Pôster (opcional, usa a foto do contato se vazio)',t:'file'}],v=>{
      if(!v.transcript.trim()||(!v.caller.trim()&&!person(v.personId))){alert('Informe o remetente e a transcrição.');return false}
      const changes={personId:v.personId,caller:v.caller.trim(),ts:fromL(v.ts),transcript:v.transcript.trim(),speechInterval:paceFor(v.speechInterval).v,poster:v.vmposter||existing?.poster||''};
      if(existing){
        Object.assign(existing,changes);stopTranscript();
        if(liveSession?.voicemail===existing)liveSession.pace=paceFor(changes.speechInterval);
      }
      else{
        const id=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
        S.phoneVoicemails=[...messages(),{id,...changes,read:false}];
      }
    },'#pm',existing||{});
  }
  function stopTranscript() { clearTimeout(transcriptTimer);transcriptRun=null; }
  function closeVoicemail() { voicemail=liveSession=null;stopTranscript(); }
  function paintTranscript(v) {
    const el=$('#phone-live-transcript'),scroller=$('.phone-live-words');
    if(!el||!scroller||!accepted(v))return;
    const run=transcriptRun?.voicemail===v?transcriptRun:null;
    const text=run?run.text:String(v.transcript||'');
    const waiting=!!run&&!text;
    el.textContent=waiting?'Waiting…':text||'No transcription available.';
    el.classList.toggle('is-waiting',waiting);
    if(run)scroller.scrollTop=scroller.scrollHeight;
  }
  function showWholeTranscript(v) {
    if(!accepted(v))return;
    stopTranscript();paintTranscript(v);
    const accessible=$('#phone-live-transcript-status');
    if(accessible)accessible.textContent=String(v.transcript||'No transcription available.');
    const skip=$('[data-phone-action=voicemail-skip]');
    if(skip){if(document.activeElement===skip)$('[data-phone-action=voicemail-end]')?.focus({preventScroll:true});skip.hidden=true}
  }
  function playTranscript(v) {
    if(!accepted(v))return;
    stopTranscript();
    const parts=String(v.transcript||'').match(/\S+\s*|\s+/g)||[];
    if(!reducedMotion.matches&&parts.length)transcriptRun={voicemail:v,parts,visible:0,text:''};
    const run=transcriptRun;
    R();
    if(!run)return;
    const step=()=>{
      if(transcriptRun!==run)return;
      if(cur!=='ph'||locked||currentVoicemail()!==v||!accepted(v)){stopTranscript();return}
      run.text+=run.parts[run.visible++];
      paintTranscript(v);
      if(run.visible<run.parts.length)transcriptTimer=setTimeout(step,liveSession.pace.v);
      else showWholeTranscript(v);
    };
    transcriptTimer=setTimeout(step,liveSession.pace.v);
  }
  function messageDestination(p) {
    if(!p)return null;
    for(const [app,kind] of [['msg','messages'],['wa','whatsapp'],['ka','kakao']]){
      if(!visibleApps().includes(app))continue;
      const chat=activeChatsFor(app).find(c=>c.mem.length===1&&String(c.mem[0])===String(p.id));
      if(chat)return {kind,id:String(chat.id)};
    }
    return null;
  }
  function acceptVoicemail() {
    const v=currentVoicemail();if(!v||isBlocked(v)||liveSession?.voicemail!==v||accepted(v))return;
    liveSession.accepted=true;
    if(readerMode)readInSession.add(v);
    else if(!v.read){v.read=true;save()}
    playTranscript(v);
    $('[data-phone-action=voicemail-end]')?.focus({preventScroll:true});
  }
  function registerVoicemail() {
    const v=currentVoicemail();
    if(readerMode||!v||!accepted(v)||liveSession.recorded)return;
    liveSession.recorded=true;
    S.calls.push({name:voicemailName(v),sub:'mobile',dir:'in',n:1,ts:nowTs()});
    save();
    const control=$('[data-phone-action=voicemail-register]');
    if(control){control.textContent='Registered in Recents';control.disabled=true}
  }
  function changeVoicemailPace(step) {
    if(!liveSession||!['-1','1'].includes(step))return;
    const index=voicemailPaces.indexOf(liveSession.pace)+Number(step);
    if(!voicemailPaces[index])return;
    liveSession.pace=voicemailPaces[index];
    $('#phone-live-pace').textContent=liveSession.pace.l;
    const buttons=document.querySelectorAll('[data-phone-action=voicemail-pace]');
    buttons[0].disabled=index===0;
    buttons[1].disabled=index===voicemailPaces.length-1;
  }
  function toggleBlock() {
    const v=currentVoicemail();if(!v||person(v.personId))return;
    let list=blockedInSession.get(S);
    if(!list){list=new Set();blockedInSession.set(S,list)}
    const key=voicemailKey(v);
    if(list.has(key)){list.delete(key);R();return}
    list.add(key);backToVoicemails();
  }
  function openMessagesFromVoicemail() {
    const v=currentVoicemail(), p=v&&person(v.personId);
    if(!p)return;
    const ref=messageDestination(p);
    if(ref){stopTranscript();StoryConnections.open(ref)}
    else StoryConnections.openContact(p);
  }
  function liveButton(code,label,icon,style='',disabled=false) {
    return `<button type="button" class="phone-live-action ${style}" ${action(code)}${disabled?' disabled':''}><span>${I(icon,26,'currentColor','none')}</span>${esc(label)}</button>`;
  }
  function liveVoicemail(v) {
    const p=person(v.personId), poster=voicemailPoster(v), blocked=isBlocked(v);
    const started=accepted(v), pace=liveSession?.pace||paceFor(v.speechInterval);
    const paceIndex=voicemailPaces.indexOf(pace);
    const run=transcriptRun?.voicemail===v?transcriptRun:null;
    const seed=started?(run?run.text:String(v.transcript||'')):'';
    const waiting=!started||!!run&&!seed;
    const paceControls=`<div class="phone-live-pace"><small>Ritmo da transcrição</small><div><button type="button" ${action('voicemail-pace','-1')} aria-label="Mais rápido"${paceIndex===0?' disabled':''}>−</button><output id="phone-live-pace" aria-live="polite">${esc(pace.l)}</output><button type="button" ${action('voicemail-pace','1')} aria-label="Mais lento"${paceIndex===voicemailPaces.length-1?' disabled':''}>+</button></div></div>`;
    const register=started&&!readerMode?`<button type="button" ${action('voicemail-register')}${liveSession.recorded?' disabled':''}>${liveSession.recorded?'Registered in Recents':'Registrar em Recents'}</button>`:'';
    const options=`<details class="phone-live-info"><summary aria-label="Informações e ações do voicemail">${phoneIcon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',22)}</summary><div class="phone-live-info-menu">${v.ts?`<small>${esc(fFull(v.ts))}</small>`:''}${reducedMotion.matches?'':paceControls}${started?button('voicemail-replay','Replay transcription'):''}${register}${p?button('connections','Conexões',p.id):''}${readerMode?'':`${button('edit-voicemail','Edit Voicemail')}${button('delete-voicemail','Delete Voicemail',v.id,'phone-live-danger')}`}</div></details>`;
    return `<section class="phone-live-voicemail${poster?' has-poster':''}" aria-label="Live Voicemail">${poster?`<img class="phone-live-poster" src="${esc(poster)}" alt="">`:''}<header class="phone-live-header"><div class="phone-live-top"><button type="button" ${action('back-voicemail')} class="phone-live-back" aria-label="Voltar para os recados">${phoneIcon('<path d="m14 5-7 7 7 7"/>',21)}</button>${options}</div><p class="phone-live-label">Voicemail</p><h2>${esc(voicemailName(v))}</h2>${blocked?'<small class="phone-live-blocked">Blocked for this session</small>':''}</header>
    <div class="phone-live-body"><div class="phone-live-words"><p id="phone-live-transcript" class="${waiting?'is-waiting':''}" aria-hidden="true">${waiting?'Waiting…':esc(seed||'No transcription available.')}</p><span class="phone-live-sr-only" id="phone-live-transcript-status" role="status">${esc(!started?'Waiting for you to accept.':run?'Waiting for transcription…':seed||'No transcription available.')}</span></div>${run?`<button type="button" class="phone-live-skip" ${action('voicemail-skip')}>Show full transcript ›</button>`:''}</div>
    <footer class="phone-live-actions">${p?liveButton('voicemail-message',messageDestination(p)?'Message':'Contact',bubble):liveButton('voicemail-block',blocked?'Unblock':'Block',stopHand)}${started?liveButton('voicemail-end','End',hand,'is-end'):liveButton('voicemail-accept','Accept',hand,'is-accept',blocked)}</footer></section>`;
  }
  function openVoicemail(id) {
    const v=messages().find(m=>m.id===id);if(!v)return;
    stopTranscript();
    voicemail=v.id;
    liveSession={voicemail:v,pace:paceFor(v.speechInterval),accepted:false,recorded:false};
    R();
    $('.phone-live-back')?.focus({preventScroll:true});
  }
  function backToVoicemails() {
    const id=voicemail;closeVoicemail();R();
    [...document.querySelectorAll('.phone-voicemail-row')].find(row=>row.dataset.phoneValue===id)?.focus({preventScroll:true});
  }
  function voicemailView() {
    const list=[...messages()].sort((a,b)=>b.ts-a.ts);
    return heading('Voicemail','new-voicemail','Criar voicemail fictício')+`<div class="bd phone-rows">${list.map(m=>`<button type="button" class="phone-list-row phone-voicemail-row" ${action('open-voicemail',m.id)}><i class="${isRead(m)?'':'unread'}"></i><span><b>${esc(voicemailName(m))}</b><small>${isBlocked(m)?'Blocked · ':''}${m.ts?esc(fList(m.ts)):'Voicemail'}</small></span><span class="phone-disclosure">›</span></button>`).join('')||empty('No Voicemail','Transcripts of voice messages will appear here.')}</div>`;
  }
  function render(recents) {
    if(call)return callView();
    const v=tab==='voicemail'&&currentVoicemail();
    if(v)return liveVoicemail(v);
    const view={recents,contacts,favorites:favoritesView,keypad,voicemail:voicemailView};
    return view[tab]()+nav();
  }
  const handlers={
    'new-contact':()=>{if(!readerMode)addChar()},
    'show-contact':id=>{contact=person(id)?.id??null;R()},
    'back-contact':()=>{contact=null;R()},
    'edit-contact':()=>editContact(person(contact)),
    connections:id=>StoryConnections.openContact(person(id)),
    'new-favorite':()=>{if(!readerMode)chooseFavorite()},
    'favorite-toggle':id=>{const p=person(id);if(p)markFavorite(p,!isFavorite(p))},
    'call-contact':id=>{const p=person(id);if(p)dial(p.phone,p)},
    digit,erase,dial:()=>dial(number),
    'end-call':()=>finishCall(false),
    'register-call':()=>finishCall(true),
    'new-voicemail':()=>{if(!readerMode)editVoicemail()},
    'edit-voicemail':()=>{const v=currentVoicemail();if(!readerMode&&v)editVoicemail(v)},
    'open-voicemail':openVoicemail,
    'back-voicemail':backToVoicemails,
    'voicemail-end':backToVoicemails,
    'voicemail-replay':()=>{const v=currentVoicemail();if(v){playTranscript(v);$('.phone-live-back')?.focus({preventScroll:true})}},
    'voicemail-skip':()=>{const v=currentVoicemail();if(v)showWholeTranscript(v)},
    'voicemail-message':openMessagesFromVoicemail,
    'voicemail-block':toggleBlock,
    'voicemail-accept':acceptVoicemail,
    'voicemail-pace':changeVoicemailPace,
    'voicemail-register':registerVoicemail,
    'delete-voicemail':id=>{if(!readerMode&&confirm('Excluir este voicemail?')){S.phoneVoicemails=messages().filter(m=>m.id!==id);closeVoicemail();save();R()}}
  };
  document.addEventListener('click',async event=>{
    const control=event.target.closest?.('#app [data-phone-tab], #app [data-phone-action]');
    if(!control||cur!=='ph'||control.disabled)return;
    const {phoneTab,phoneAction,phoneValue}=control.dataset;
    if(phoneTab){switchTab(phoneTab);return}
    if(phoneAction==='digit'&&phoneValue==='0'&&longZero){longZero=false;return}
    if(phoneAction==='dial'){
      if(keyPresses.has(control))return;
      const pressedNumber=number;
      await animateKey(control);
      if(cur==='ph'&&!locked&&tab==='keypad'&&!call&&$('#phone-dial')===control&&pressedNumber===number)dial(pressedNumber);
      return;
    }
    if(phoneAction==='digit'||phoneAction==='erase')animateKey(control);
    if(Object.hasOwn(handlers,phoneAction))handlers[phoneAction](phoneValue);
  });
  document.addEventListener('input',event=>{
    if(event.target.id!=='phone-contact-search'||cur!=='ph')return;
    query=event.target.value;
    $('#phone-contact-results').innerHTML=searchedContacts().map(contactRow).join('')||empty('No contacts','No contacts match your search.');
  });
  document.addEventListener('pointerdown',event=>{
    const key=event.target.closest?.('#app .phone-digits button, #app #phone-dial');
    if(!key||event.button!==0)return;
    const rect=key.getBoundingClientRect();
    key.style.setProperty('--key-x',`${(event.clientX-rect.left)/rect.width*100}%`);
    key.style.setProperty('--key-y',`${(event.clientY-rect.top)/rect.height*100}%`);
    if(key.dataset.phoneValue!=='0')return;
    longZero=false;clearTimeout(keyTimer);keyTimer=setTimeout(()=>{if(!key.isConnected)return;longZero=true;digit('+');animateKey(key)},450);
  });
  for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>clearTimeout(keyTimer));
  document.addEventListener('contextmenu',event=>{if(event.target.closest?.('.phone-digits'))event.preventDefault()});
  document.addEventListener('keydown',event=>{
    if(cur!=='ph'||tab!=='keypad'||locked||call||event.altKey||event.ctrlKey||event.metaKey||
      $('#pm').style.display==='flex'||$('#md').style.display==='flex'||$('dialog[open]')||
      event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(event.key==='Backspace'){event.preventDefault();animateKey($('#phone-erase'));erase()}
    else if(/^[\d*#+]$/.test(event.key)){
      event.preventDefault();
      const key=event.key==='+'?'0':event.key;
      animateKey($(`#app [data-phone-action="digit"][data-phone-value="${key}"]`));
      digit(event.key);
    }
  });
  return {reset,render,voicemailPoster};
})();
