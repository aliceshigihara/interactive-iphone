/* Shared, story-local destinations for the planner, contact cards and chat links. */
const StoryConnections = (() => {
  const byId = id => document.getElementById(id);
  const CHAT = {messages: ['msg', 'chats'], whatsapp: ['wa', 'waChats'], kakao: ['ka', 'kaChats']};
  const kinds = {
    messages: ['msg', 'Conversas · Messages'], whatsapp: ['wa', 'Conversas · WhatsApp'], kakao: ['ka', 'Conversas · KakaoTalk'],
    mail: ['mail', 'E-mails'], call: ['ph', 'Ligações'], event: ['cal', 'Eventos do calendário'], note: ['nt', 'Notas'],
    instagram: ['ig', 'Perfis do Instagram'], igPost: ['ig', 'Publicações do Instagram'],
    twitter: ['x', 'Perfis do Twitter'], tweet: ['x', 'Tweets'],
    place: ['map', 'Locais no Maps'], photo: ['pho', 'Fotos'], channel: ['yt', 'Canais do YouTube'], video: ['yt', 'Vídeos do YouTube']
  };
  const paths = {mail:'mails',call:'calls',event:'events',note:'notes',instagram:'profiles',igPost:'posts',twitter:'xProfiles',tweet:'xPosts',place:'places',photo:'photos',channel:'ytChannels',video:'ytVideos'};
  const names = {mail:'E-mail',call:'Ligação',event:'Evento',note:'Nota',instagram:'Perfil',igPost:'Publicação',twitter:'Perfil',tweet:'Tweet',place:'Local',photo:'Foto',channel:'Canal',video:'Vídeo'};
  const contactKinds = new Set(['messages','whatsapp','kakao','mail','call','instagram','twitter','channel']);
  const picker = byId('story-item-picker'), dialog = byId('story-contact-dialog');
  const chars = () => Array.isArray(S.chars) ? S.chars : [];
  const items = (kind, state = S) => {
    if (!Object.hasOwn(kinds, kind)) return [];
    const list = state[Object.hasOwn(CHAT,kind) ? CHAT[kind][1] : paths[kind]];
    return Array.isArray(list) ? list : [];
  };
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const norm = value => String(value ?? '').trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();
  const firstLine = value => String(value ?? '').trim().split('\n', 1)[0].slice(0, 100);
  const same = (a,b) => !!a && !!b && a.kind === b.kind && String(a.id) === String(b.id);
  const validRef = value => value && Object.hasOwn(kinds,value.kind) && typeof value.id === 'string' && !!value.id;
  const refList = value => Array.isArray(value) ? value.filter(validRef) : [];
  const icons = app => `<span class="story-ref-icon" aria-hidden="true">${iconOf(app)}</span>`;
  const pad = n => String(n).padStart(2,'0');
  const prettyDate = iso => iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : '';
  const photoHashes = new Map();
  let pickerState, contactState, feedbackTimer;

  function photoId(value) {
    if (typeof value !== 'string') return '';
    if (photoHashes.has(value)) return photoHashes.get(value);
    // Include the whole image so moving a photo within the library doesn't change its link.
    let a=2166136261,b=5381;
    for(let i=0;i<value.length;i++){const ch=value.charCodeAt(i);a=Math.imul(a^ch,16777619);b=Math.imul(b,33)^ch}
    const key=`${value.length}-${a>>>0}-${b>>>0}`;
    if(photoHashes.size>=128)photoHashes.delete(photoHashes.keys().next().value);
    photoHashes.set(value,key);
    return key;
  }
  function recordId(kind, record, state = S, create = false) {
    if (kind==='photo') return photoId(record);
    if (kind==='place') {
      if(typeof record!=='string') return '';
      const refs=Array.isArray(state.placeRefs)?state.placeRefs:[];
      const match=refs.find(p=>p?.name===record);
      if(match) return String(match.id);
      if(!create) return '';
      const key=id();refs.push({name:record,id:key});state.placeRefs=refs;return key;
    }
    if (!record || typeof record!=='object') return '';
    if(record.id!==undefined&&record.id!==null&&String(record.id))return String(record.id);
    if(record._storyRef)return String(record._storyRef);
    if(create)return record._storyRef=id();
    return '';
  }
  function renamePlace(old,name) {
    const ref=Array.isArray(S.placeRefs)&&S.placeRefs.find(p=>p?.name===old);
    if(ref)ref.name=name;
  }
  function removePlace(name) {
    if(Array.isArray(S.placeRefs))S.placeRefs=S.placeRefs.filter(p=>p?.name!==name);
  }
  function localDay(ts) {
    if (!Number.isFinite(ts) || !ts) return '';
    const d=new Date(ts);
    return Number.isNaN(+d)?'':`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
  function dates(kind,r) {
    if(Object.hasOwn(CHAT,kind)){
      const days=(r.msgs||[]).filter(m=>m.m!==2).map(m=>localDay(m.ts)).filter(Boolean);
      return [...new Set(days)].sort();
    }
    if(kind==='event')return Number.isInteger(r.y)&&Number.isInteger(r.m)&&Number.isInteger(r.d)?[`${r.y}-${pad(r.m+1)}-${pad(r.d)}`]:[];
    const day=localDay(r?.ts);
    return day?[day]:[];
  }
  function description(kind,r,index) {
    const [app,group]=kinds[kind];
    let title, subtitle;
    if(Object.hasOwn(CHAT,kind)) {title=cname(r);subtitle=`${(r.msgs||[]).filter(m=>m.m!==2).length} mensagens`;}
    else if(kind==='mail'){title=r.subj;subtitle=r.from;}
    else if(kind==='call'){title=r.name;subtitle=({in:'Recebida',out:'Efetuada',miss:'Perdida'})[r.dir];}
    else if(kind==='event'){title=r.title;subtitle=r.time;}
    else if(kind==='note')title=r.title;
    else if(kind==='instagram'||kind==='twitter'){title=r.user?`@${r.user}`:r.name;subtitle=r.user?r.name:'';}
    else if(kind==='igPost'||kind==='tweet'){const author=kind==='igPost'?pf(r.pid):xPerson(r.pid);title=firstLine(r.cap??r.text);subtitle=author.user?`@${author.user}`:'';}
    else if(kind==='photo')title=`Foto ${index+1}`;
    else if(kind==='place')title=r;
    else if(kind==='channel'){title=r.name;subtitle=r.handle?`@${r.handle}`:'';}
    else title=r.title;
    return {kind,app,group,title:String(title||names[kind]||group),subtitle:String(subtitle||''),dates:dates(kind,r),record:r,index};
  }
  function resolve(ref) {
    if(!validRef(ref))return null;
    const list=items(ref.kind),index=list.findIndex(r=>recordId(ref.kind,r)===ref.id);
    return index<0?null:description(ref.kind,list[index],index);
  }
  function snapshot(item) {
    const key=recordId(item.kind,item.record,S,true);
    return key?{kind:item.kind,id:key,title:item.title.slice(0,100)}:null;
  }
  function dateLabel(days) {
    if(!days.length)return '';
    return days.length===1?prettyDate(days[0]):`${prettyDate(days[0])} – ${prettyDate(days.at(-1))}`;
  }
  function feedback(text) {
    const status=byId('story-link-feedback');
    clearTimeout(feedbackTimer);status.textContent=text;status.hidden=false;
    feedbackTimer=setTimeout(()=>{status.hidden=true},2600);
  }
  function availability(ref) {
    const item=resolve(ref);
    if(!item)return 'Registro removido ou indisponível.';
    return visibleApps().includes(item.app)?'':`${FN[item.app]} está oculto nesta história.`;
  }
  function open(ref) {
    return openItem(resolve(ref));
  }
  function openItem(item) {
    if(!item){feedback('Este registro não está mais disponível.');return false}
    if(!visibleApps().includes(item.app)){feedback(`${FN[item.app]} está oculto nesta história.`);return false}
    if(locked){if(readerMode)return false;doUnlock()}
    if(ccOpen)closeCC();
    vPhotoClose();
    if(!readerMode&&matchMedia('(max-width:760px)').matches)mobileView('phone');
    const {kind,app,record:r,index}=item;
    go(app,null,()=>{
      if(Object.hasOwn(CHAT,kind)){cid=r.id;who=0}
      else if(kind==='mail')mid=index;
      else if(kind==='event'){cy_=r.y;cmo=r.m;csel=r.d}
      else if(kind==='note'){nview=2;nid=r.id}
      else if(kind==='instagram')igv={t:'prof',id:r.id};
      else if(kind==='igPost')igv={t:'post',i:index};
      else if(kind==='twitter'||kind==='tweet'){xTab=kind==='twitter'?'profile':'post';xDetail=String(r.id)}
      else if(kind==='channel'||kind==='video'){ytTab=kind==='channel'?'channel':'watch';ytIndex=index}
      else if(kind==='place'){mSelected=index;const point=globePoint(r);if(point){[globeLon,globeLat]=point;mZoom=30}}
      else if(kind==='photo')photoTab='library';
    });
    if(kind==='photo'){photoSelected=index;vPhotoOpen()}
    if(kind==='call'||kind==='event'){
      const row=$(`#app [data-story-record-index="${index}"]`);
      if(row){row.classList.add('story-destination-focus');row.scrollIntoView({block:'nearest',inline:'nearest'});}
    }
    return true;
  }

  function pickerResults() {
    const state=pickerState;if(!state||S!==state.story)return;
    const kind=byId('story-item-kind').value, query=norm(byId('story-item-query').value);
    state.selection=null;byId('story-picker-confirm').disabled=true;byId('story-picker-selection').textContent=SiteLanguage.text('Selecione um registro','Select an item');
    for(const b of byId('story-picker-categories').children)b.setAttribute('aria-pressed',String(b.dataset.kind===kind));
    const root=byId('story-item-results');root.replaceChildren();
    const records=items(kind);
    const shown=records.map((r,i)=>description(kind,r,i)).filter(item=>(
      !state.exclude?.some(ref=>validRef(ref)&&ref.kind===kind&&ref.id===recordId(kind,item.record))&&
      !state.excludeItems?.some(other=>other?.kind===kind&&other.record===item.record)&&
      (!query||norm(`${item.title} ${item.subtitle} ${item.group}`).includes(query))
    ));
    byId('story-picker-count').textContent=`${shown.length} ${SiteLanguage.text('registros encontrados','items found')}`;
    if(!shown.length){root.innerHTML='<p class="story-ref-empty">Nenhum registro disponível para este filtro.</p>';return}
    for(const item of shown.slice(0,100)){
      const button=document.createElement('button');
      button.type='button';button.className='story-picker-item';
      const info=[item.subtitle,dateLabel(item.dates),!visibleApps().includes(item.app)?'App oculto':''].filter(Boolean).join(' · ');
      const visual=item.kind==='photo'&&chatValidImage(item.record)?`<img class="story-picker-photo" src="${item.record}" alt="">`:icons(item.app);
      button.innerHTML=`${visual}<span><b>${esc(item.title)}</b>${info?`<small>${esc(info)}</small>`:''}</span><span class="story-ref-chevron" aria-hidden="true">›</span>`;
      button.setAttribute('aria-pressed','false');
      button.onclick=()=>{
        if(pickerState!==state||S!==state.story||state.busy)return;
        state.selection=item;
        for(const b of root.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));
        byId('story-picker-selection').textContent=item.title;
        byId('story-picker-confirm').disabled=false;
      };
      root.append(button);
    }
    if(shown.length>100){const hint=document.createElement('p');hint.className='story-ref-empty';hint.textContent='Use a pesquisa para encontrar mais resultados.';root.append(hint)}
  }
  function openPicker(options) {
    if(readerMode||picker.open)return;
    const available=Object.keys(kinds).filter(kind=>
      (options.mode!=='contact'||contactKinds.has(kind))&&
      (!options.kind||kind===options.kind)&&
      (options.mode!=='message'||visibleApps().includes(kinds[kind][0]))&&items(kind).length
    );
    pickerState={...options,story:S};
    byId('story-item-title').textContent=options.title;
    byId('story-item-hint').textContent=options.hint||'Escolha um registro que já existe nesta história.';
    byId('story-item-context').innerHTML=options.context||'';
    const kindField = byId('story-item-kind');
    kindField.closest('label').hidden = Boolean(options.kind);
    kindField.innerHTML=available.map(kind=>`<option value="${kind}">${esc(kinds[kind][1])}</option>`).join('')||'<option value="">Nenhum conteúdo</option>';
    byId('story-item-query').value='';
    const categories=byId('story-picker-categories');categories.replaceChildren();categories.hidden=Boolean(options.kind);
    for(const kind of available){const b=document.createElement('button');b.type='button';b.dataset.kind=kind;b.innerHTML=icons(kinds[kind][0])+`<span>${esc(kinds[kind][1])}</span>`;b.onclick=()=>{kindField.value=kind;kindField.dispatchEvent(new Event('change',{bubbles:true}))};categories.append(b)}
    pickerResults();
    openEditorDialog(picker);
  }

  function matchesIdentity(recordValue, person, type) {
    const raw=String(recordValue??''), value=norm(raw);
    if(!value)return false;
    const name=norm(person.name);
    if(name&&value===name)return true;
    if(type==='mail'){
      const email=norm(person.email);
      const pieces=raw.match(/^(.*?)\s*<([^<>]+)>\s*$/);
      return !!((email&&(value===email||email===norm(pieces?.[2])))||(pieces&&name&&norm(pieces[1].replace(/^["']|["']$/g,''))===name));
    }
    const phone=String(person.phone??'').replace(/\D/g,'');
    return phone.length>=5&&phone===raw.replace(/\D/g,'');
  }
  function owners(kind,record) {
    const explicit=chars().filter(p=>refList(p.connections).some(ref=>ref.kind===kind&&ref.id===recordId(kind,record)));
    if(explicit.length||!['mail','call'].includes(kind))return explicit;
    const matches=chars().filter(p=>matchesIdentity(kind==='mail'?record.from:record.name,p,kind));
    return matches.length===1?matches:[];
  }
  function connected(person, includeHidden = false) {
    const out=[], manual=refList(person.connections);
    const add=(ref,auto,item)=>{
      if(!out.some(entry=>(ref.id&&entry.ref.id&&same(entry.ref,ref))||(item&&entry.item?.record===item.record&&entry.item.kind===item.kind))&&
        (includeHidden||item&&visibleApps().includes(item.app)))out.push({ref,auto,item});
    };
    for(const ref of manual)add(ref,false,resolve(ref));
    for(const kind of contactKinds){
      items(kind).forEach((record,index)=>{
        const belongs=Object.hasOwn(CHAT,kind)?record.mem?.some(x=>String(x)===String(person.id)):
          ['mail','call'].includes(kind)&&owners(kind,record).includes(person);
        if(belongs)add({kind,id:recordId(kind,record),title:description(kind,record,index).title},true,description(kind,record,index));
      });
    }
    return out;
  }
  function refAttrs(ref){return `data-story-destination="${esc(ref.kind)}" data-story-destination-id="${esc(ref.id)}"`}
  function contactLink(p) {return `<button type="button" class="story-contact-pill" data-story-person="${esc(p.id)}">Contato: ${esc(p.name)}</button>`}
  function contactRows(person, canEdit) {
    const rows=connected(person,canEdit).map(({ref,item,auto})=>{
      const app=kinds[ref.kind][0], warning=!item?'Registro removido':!visibleApps().includes(app)?'App oculto':auto?'Conexão automática':'';
      const title=item?.title||ref.title||'Registro indisponível';
      const launch=item&&visibleApps().includes(app)?`<button type="button" class="story-ref-open" ${ref.id?refAttrs(ref):`data-story-auto-kind="${ref.kind}" data-story-auto-index="${item.index}"`}>${icons(app)}<span><b>${esc(title)}</b><small>${esc([FN[app],warning].filter(Boolean).join(' · '))}</small></span><span class="story-ref-chevron" aria-hidden="true">›</span></button>`:`<span class="story-ref-open">${icons(app)}<span><b>${esc(title)}</b><small>${esc(warning)}</small></span></span>`;
      return `<div class="story-ref-row">${launch}${canEdit&&!auto?`<button type="button" class="story-ref-remove" data-story-remove-connection-kind="${esc(ref.kind)}" data-story-remove-connection-id="${esc(ref.id)}" aria-label="Desvincular ${esc(title)}">×</button>`:''}</div>`;
    }).join('');
    return rows||'<p class="story-ref-empty">Nenhum registro conectado a este contato.</p>';
  }
  function renderContact(person) {
    const canEdit=!readerMode&&chars().includes(person);
    byId('story-contact-title').textContent=person.name||'Contato';
    byId('story-contact-hint').textContent=canEdit
      ?'Os vínculos com apps visíveis também aparecem no modo leitor.'
      :'Abra os registros deste personagem nos apps do iPhone.';
    const details=[person.phone,person.email].filter(Boolean).map(s=>`<small>${esc(s)}</small>`).join('');
    byId('story-contact-content').innerHTML=`<div class="story-connected-identity">${av(person,54)}<div><b>${esc(person.name||'Contato')}</b>${details}</div></div>${canEdit?'<button type="button" data-story-connect class="planner-primary">+ Vincular registro</button><p class="story-ref-empty">Conversas do personagem e correspondências exatas de Mail e Phone entram automaticamente.</p>':''}<div class="story-connected-list">${contactRows(person,canEdit)}</div>`;
  }
  function openContact(person) {
    if(!person)return;
    contactState={person,story:S};
    renderContact(person);
    if(!dialog.open)openEditorDialog(dialog);
  }
  function openParticipants(chat, rename) {
    contactState={rename,story:S};
    byId('story-contact-title').textContent=cname(chat);
    byId('story-contact-hint').textContent='Abra a ficha de um participante.';
    byId('story-contact-content').innerHTML=chat.mem.map(cid=>{
      const p=ch(cid);
      return `<button type="button" class="story-ref-open story-participant" data-story-participant="${esc(cid)}">${av(p,36)}<span><b>${esc(p.name)}</b></span><span class="story-ref-chevron" aria-hidden="true">›</span></button>`;
    }).join('')+(readerMode?'':'<button type="button" class="planner-soft" data-story-rename-group>Renomear grupo</button>');
    if(!dialog.open)openEditorDialog(dialog);
  }
  function manageContact() {
    const current=contactState;
    if(readerMode||!current||current.story!==S||!chars().includes(current.person))return;
    const person=current.person;
    const existing=connected(person,true);
    openPicker({mode:'contact',title:`Vincular a ${person.name}`,exclude:existing.map(e=>e.ref),excludeItems:existing.map(e=>e.item),onSelect:ref=>{
      if(!chars().includes(person))return;
      person.connections=[...refList(person.connections),ref];
      save();renderContact(person);
    }});
  }

  function messageTitle(message) {
    const ref=refList(message.links)[0];
    return ref?(resolve(ref)?.title||ref.title||'Link'):'';
  }
  function messageMarkup(message) {
    return refList(message.links).map((ref,i)=>{
      const item=resolve(ref), app=kinds[ref.kind][0];
      const title=esc(item?.title||ref.title||'Link');
      return `<span class="story-chat-link"><button type="button" ${refAttrs(ref)}>${icons(app)}<span><small>${esc(item?FN[app]:'Registro indisponível')}</small><b>${title}</b></span><span class="story-ref-chevron" aria-hidden="true">›</span></button>${readerMode?'':`<button type="button" class="story-chat-unlink" data-story-unlink="${i}" aria-label="Remover link ${title}">×</button>`}</span>`;
    }).join('');
  }
  function currentThread() {
    if(isMessenger(cur)&&cid){
      const thread=activeChatsFor(cur).find(c=>c.id==cid);
      return thread?{thread,input:$(cur==='msg'?'#mi':'#third-input'),ig:false}:null;
    }
    if(cur==='ig'&&igv?.t==='dm'){
      const thread=igThread(igv.id);
      return {thread,input:$('#ig-dm-input'),ig:true};
    }
    return null;
  }
  function addMessageLink() {
    if(readerMode)return;
    const ctx=currentThread();if(!ctx)return;
    const {thread,input,ig}=ctx;
    const text=input?.value.trim()||'', draft=input?.value||'', app=cur;
    const sender=ig?null:snd(thread)[who%snd(thread).length];
    const available=thread.msgs.filter(m=>m.m!==2&&!m.callLog&&!m.viewOnce).slice(-30).reverse();
    const label=m=>firstLine((ig?m.text:m.t)||messageTitle(m))||(m.image?'Foto':'Mensagem');
    const context=`<label class="story-link-source">Onde colocar o link<select id="story-item-source"><option value="new">Nova mensagem${text?' com o texto digitado':''}</option>${available.map((m,i)=>`<option value="${i}">${esc(`${ig?(m.mine?'Me':'Contato'):(m.m===1?'Me':ch(m.s).name)} · ${label(m)}`)}</option>`).join('')}</select></label>`;
    openPicker({mode:'message',title:'Anexar link entre apps',context,onSelect:(ref,choice)=>{
      if(cur!==app||currentThread()?.thread!==thread)return;
      if(choice==='new'){
        if(ig)thread.msgs.push({mine:true,text,time:S.time,links:[ref]});
        else{
          const ts=chatCursor(thread);
          thread.msgs.push({...(sender?.id?{m:0,s:sender.id}:{m:1}),t:text,ts,links:[ref]});
          thread.cursor=ts+60000;thread.t=S.time;pop=true;
        }
      }else{
        const m=available[Number(choice)];
        if(!m||!thread.msgs.includes(m)||refList(m.links).some(link=>same(link,ref)))return;
        m.links=[...refList(m.links),ref];
      }
      save();R();
      if(choice!=='new'){
        const field=currentThread()?.input;
        if(field){field.value=draft;if(app==='msg')msgGlassInput(field)}
      }
      if(ig)igScrollChat();
      else if(app!=='msg'){const sc=$('#third-messages');if(sc)sc.scrollTop=sc.scrollHeight}
    }});
  }
  function unlinkMessage(button) {
    if(readerMode)return;
    const ctx=currentThread();if(!ctx)return;
    const bubble=button.closest(ctx.ig?'.ig-msg':'[data-sc-msg]');
    if(!bubble)return;
    const i=ctx.ig?[...$('#ig-chat-scroll').querySelectorAll('.ig-msg')].indexOf(bubble):Number(bubble.dataset.scMsg);
    const message=ctx.thread.msgs[i];
    if(!message)return;
    message.links=refList(message.links).filter((_,n)=>n!==Number(button.dataset.storyUnlink));
    if(!message.links.length&&!(ctx.ig?message.text:message.t)&&!message.image)ctx.thread.msgs.splice(i,1);
    save();R();
  }
  function addOwnerPills(root,kind,record) {
    if(root&&record)root.insertAdjacentHTML('beforeend',owners(kind,record).map(contactLink).join(''));
  }
  function decorateApp() {
    const app=$('#app');
    // Panels and app views are rebuilt by R(); decorations don't belong in the data model.
    if(!readerMode){
      const tools=$('#mqa .conv-section:last-child');
      if(tools&&isMessenger(cur)&&cid)tools.querySelector('h3')?.insertAdjacentHTML('afterend','<button type="button" data-panel-action="link" data-story-attach>Anexar link entre apps</button>');
      if(cur==='msg'&&cid)app.querySelector('.ios-glass-menu')?.insertAdjacentHTML('beforeend','<button type="button" data-story-attach><span aria-hidden="true">↗</span><span>Link entre apps</span></button>');
      if((cur==='wa'||cur==='ka')&&cid)app.querySelector('.third-compose')?.insertAdjacentHTML('afterbegin','<button type="button" class="third-icon-btn" data-story-attach aria-label="Anexar link entre apps" title="Anexar link entre apps">↗</button>');
    }
    if(cur==='msg'&&cid&&cinfo){
      const chat=S.chats.find(c=>c.id==cid),person=chat&&ch(chat.mem[0]),body=app.querySelector('.ci-body');
      if(person&&body){
        if(chars().includes(person)||connected(person).length){
          const link=`<div class="ci-list story-ci-connections"><div><small>Conexões no iPhone</small><button type="button" class="story-contact-pill" data-story-person="${esc(person.id)}">Ver conexões</button></div></div>`;
          (body.querySelector('.ci-actions')||body.firstElementChild)?.insertAdjacentHTML('afterend',link);
        }
      }
    }else if((cur==='wa'||cur==='ka')&&cid){
      app.querySelector('.third-detail-header [aria-label="Opções"]')?.setAttribute('data-story-chat-contact','');
    }else if(cur==='mail'&&mid!==null){
      addOwnerPills(app.querySelector('.bd .r2 .x'),'mail',S.mails[mid]);
    }else if(cur==='ph'){
      const calls=S.calls.map((c,i)=>({c,i})).filter(({c})=>!cflt||c.dir==='miss').sort((a,b)=>ordS(a.c.ts,b.c.ts));
      const rows=[...app.querySelectorAll('.cr2')];
      if(calls.length)rows.slice(-calls.length).forEach((row,n)=>{
        row.dataset.storyRecordIndex=calls[n].i;
        // Keep the record association without adding a redundant contact badge.
      });
    }else if(cur==='cal'){
      const indices=S.events.map((e,i)=>({e,i})).filter(({e})=>e.y==cy_&&e.m==cmo&&e.d==csel);
      app.querySelectorAll('.ev2').forEach((row,n)=>{if(indices[n])row.dataset.storyRecordIndex=indices[n].i});
    }else if(cur==='ig'&&igv?.t==='prof'){
      addOwnerPills(app.querySelector('.pbio'),'instagram',S.profiles.find(p=>String(p.id)===String(igv.id)));
    }else if(cur==='ig'&&igv?.t==='dm'){
      if(!readerMode)app.querySelector('.ig-chat-compose')?.insertAdjacentHTML('afterbegin','<button type="button" data-story-attach aria-label="Anexar link entre apps" title="Anexar link entre apps">↗</button>');
    }else if(cur==='x'&&xTab==='profile'){
      addOwnerPills(app.querySelector('.x-profile-info'),'twitter',S.xProfiles.find(p=>String(p.id)===String(xDetail||S.xOwner)));
    }else if(cur==='yt'&&ytTab==='channel'){
      addOwnerPills(app.querySelector('.yt-channel-profile'),'channel',S.ytChannels[ytIndex]);
    }
  }
  byId('story-picker-confirm').addEventListener('click',async()=>{
    const state=pickerState,item=state?.selection;
    if(!item||state.busy||S!==state.story||!items(item.kind).includes(item.record))return;
    state.busy=true;const destination=byId('story-item-source')?.value;
    await closeEditorDialog(picker);
    if(S!==state.story||!items(item.kind).includes(item.record))return;
    const ref=snapshot(item);if(ref)state.onSelect(ref,destination);
  });
  byId('story-item-kind').addEventListener('change',pickerResults);
  byId('story-item-query').addEventListener('input',pickerResults);
  for(const d of [picker,dialog])d.addEventListener('click',event=>{
    if(event.target!==d)return;
    const box=d.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeEditorDialog(d);
  });
  document.addEventListener('click',async event=>{
    const target=event.target.closest?.('button[data-story-destination],button[data-story-auto-kind],button[data-story-person],button[data-story-dialog-close],button[data-story-connect],button[data-story-remove-connection-kind],button[data-story-participant],button[data-story-rename-group],button[data-story-attach],button[data-story-unlink],button[data-story-chat-contact]');
    if(!target)return;
    event.stopPropagation();
    const d=target.dataset;
    if('storyDialogClose' in d){await closeEditorDialog(target.closest('dialog'));return}
    if('storyAttach' in d){addMessageLink();return}
    if('storyUnlink' in d){unlinkMessage(target);return}
    if('storyChatContact' in d){openChatContact();return}
    if('storyPerson' in d){openContact(chars().find(p=>String(p.id)===d.storyPerson)||(cur==='msg'&&cinfo?ch(d.storyPerson):null));return}
    if('storyParticipant' in d){openContact(ch(d.storyParticipant));return}
    if('storyConnect' in d){manageContact();return}
    if('storyRenameGroup' in d){const edit=contactState?.rename;await closeEditorDialog(dialog);if(!readerMode)edit?.();return}
    if('storyRemoveConnectionKind' in d){
      const current=contactState;
      if(readerMode||!current||current.story!==S||!chars().includes(current.person))return;
      current.person.connections=refList(current.person.connections).filter(ref=>!same(ref,{kind:d.storyRemoveConnectionKind,id:d.storyRemoveConnectionId}));
      save();renderContact(current.person);return;
    }
    const story=S;
    const closeOverlays=async()=>{
      if(dialog.open)await closeEditorDialog(dialog);
      const planner=byId('story-planner');if(planner.open)await closeEditorDialog(planner);
    };
    if('storyAutoKind' in d){
      const kind=d.storyAutoKind,index=Number(d.storyAutoIndex),record=items(kind)[index];
      if(record&&dialog.open){await closeOverlays();if(S===story&&items(kind)[index]===record)openItem(description(kind,record,index))}
    }else{
      const ref={kind:d.storyDestination,id:d.storyDestinationId};
      await closeOverlays();
      if(S===story)open(ref);
    }
  },true);

  return {openPicker,openContact,openParticipants,decorateApp,messageTitle,messageMarkup,renamePlace,removePlace,refList,same,resolve,availability,open,dateLabel,
    callReference:record=>snapshot(description('call',record,S.calls.indexOf(record)))};
})();
