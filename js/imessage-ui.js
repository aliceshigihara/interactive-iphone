/* Messages UI: shared inbox controls, reply references and photo groups. */
const IMessageUI = (() => {
  const host = document.getElementById('app');
  const tr = (pt,en) => SiteLanguage.text(pt,en);
  const icon = (d,n=22) => I(d,n,'none','currentColor',1.8);
  const heart = '<path d="M12 20.5 4.4 13A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 7.6 6Z"/>';
  const photosIcon = '<rect x="5" y="3" width="16" height="16" rx="3"/><path d="M3 7v12a2 2 0 0 0 2 2h12M5 15l5-5 4 4 3-3 4 4"/><circle cx="16" cy="7" r="1"/>';
  let draft = null, gallery = null, query = '', filter = 'all', inboxStory = null;
  const thread = () => cur === 'msg' && S.chats.find(c => c.id == cid);
  const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const valid = m => m && m.m !== 2 && !m.callLog;
  const photos = m => [m.image,...(Array.isArray(m.photoStack)?m.photoStack:[])].filter(chatValidImage);
  const summary = m => String(m?.t || (m?.audio?'Audio message':m?.image?'Photo':'Message')).slice(0,180);
  const replyTarget = c => draft?.chat===c && c.msgs.includes(draft.message) ? draft.message : null;
  function consume(c){
    const m=replyTarget(c); if(!m)return {};
    m.imessageId ||= uid(); draft=null;
    return {imessageReply:{id:m.imessageId,text:summary(m),mine:m.m===1,sender:m.s??null}};
  }
  function quote(c,m,i){
    const ref=m.imessageReply; if(!ref || typeof ref.id!=='string')return '';
    const idx=c.msgs.findIndex(x=>x.imessageId===ref.id), target=c.msgs[idx];
    const text=target?summary(target):String(ref.text||'Message');
    const mine=target?target.m===1:ref.mine;
    const count=c.msgs.filter(x=>x.imessageReply?.id===ref.id).length;
    return `<div class="im-reply-context ${mine?'im-quote-mine':'im-quote-theirs'}"><button type="button" class="im-quote" ${idx<0?'disabled':`data-im-jump="${idx}"`}>${esc(text)}</button>${count>1?`<small>${count} Replies</small>`:''}<span class="im-reply-curve" aria-hidden="true"></span></div>`;
  }
  function row(c,m,i,bubble,group,end){
    const img=photos(m), isStack=img.length>1&&!m.viewOnce;
    const reaction=m.imessageHeart?`<span class="im-tapback" aria-label="Heart reaction">${I(heart,13,'#ff527c','#ff527c',1.2)}</span>`:'';
    const showAvatar=group&&!m.m&&end;
    const avatar=showAvatar?`<span class="im-group-person">${av(ch(m.s),28)}</span>`:'';
    return `<div class="im-message-unit ${m.m?'im-out':'im-in'}${group?' im-group':''}${showAvatar?' im-group-end':''}${m.imessageReply?' im-has-reply':''}${isStack?' im-has-stack':''}" data-im-row="${i}">${quote(c,m,i)}<div class="im-message-line">${avatar}<div class="im-bubble-host">${bubble}${reaction}</div>${readerMode||ed?'':`<button class="im-message-options" type="button" data-im-options="${i}" aria-label="${tr('Opções da mensagem','Message options')}">${icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',17)}</button>`}</div></div>`;
  }
  function content(m,i){
    const imgs=photos(m);
    if(m.viewOnce||imgs.length<2)return chatImageContent(m);
    const shown=imgs.slice(0,3);
    return `<button class="im-photo-stack" type="button" data-im-gallery="${i}" aria-label="${imgs.length} photos" data-count="${shown.length}">${shown.map((src,j)=>`<img src="${src}" alt="" draggable="false" style="--im-photo:${j}">`).join('')}<span>${imgs.length} Photos</span></button>${m.t?`<span class="chat-caption">${esc(m.t)}</span>`:''}${StoryConnections.messageMarkup(m)}`;
  }
  function composer(c){
    const m=replyTarget(c); return m?`<div class="im-reply-draft"><div><strong>${tr('Respondendo','Replying to')} ${esc(m.m?tr('Você','You'):ch(m.s).name)}</strong><span>${esc(summary(m))}</span></div><button type="button" data-im-cancel aria-label="Cancel reply">×</button></div>`:'';
  }
  function redraw(c,focus=false){const input=host.querySelector('#mi'),value=input?.value,top=host.querySelector('#bd')?.scrollTop;R();if(thread()!==c)return;const next=host.querySelector('#mi');if(next&&value!==undefined){next.value=value;msgGlassInput(next);if(focus)next.focus({preventScroll:true})}const sc=host.querySelector('#bd');if(sc&&top!==undefined)sc.scrollTop=top;}
  function options(c,i){const m=c.msgs[i];if(!valid(m)||readerMode||ed)return;
    const row=host.querySelector(`[data-im-row="${i}"]`), existing=row?.querySelector('.im-action-menu');
    host.querySelectorAll('.im-action-menu').forEach(el=>el.remove());if(!row||existing)return;
    const menu=document.createElement('div');menu.className='im-action-menu';
    menu.innerHTML=`<button type="button" data-im-reply="${i}">${icon('<path d="m9 10-5 5 5 5M4 15h10a6 6 0 0 0 6-6V5"/>',19)} ${tr('Responder','Reply')}</button><button type="button" data-im-heart="${i}">${I(heart,19,m.imessageHeart?'#ff527c':'none',m.imessageHeart?'#ff527c':'currentColor',1.8)} ${m.imessageHeart?tr('Remover coração','Remove heart'):tr('Reagir com coração','React with heart')}</button>`;
    row.append(menu);menu.querySelector('button')?.focus({preventScroll:true});
  }
  function action(c,i,reply){const m=c.msgs[i];if(!valid(m)||readerMode||ed)return;if(reply){draft={chat:c,message:m};redraw(c,true);}else{m.imessageHeart=!m.imessageHeart;save();redraw(c);}}
  function galleryShow(c,i,n=0){const m=c.msgs[i];if(!m||m.viewOnce)return;const imgs=photos(m);if(!imgs.length)return;gallery={c,m,n:Math.max(0,Math.min(n,imgs.length-1))};const el=document.getElementById('photo-lightbox');el.style.display='flex';el.innerHTML=`<div class="photo-view-top"><button type="button" data-im-gallery-close>‹ Close</button><span>${gallery.n+1} / ${imgs.length}</span><span></span></div><img class="chat-full-image im-gallery-image" src="${imgs[gallery.n]}" alt="Photo ${gallery.n+1}"><div class="im-gallery-nav"><button type="button" data-im-gallery-step="-1" ${gallery.n===0?'disabled':''}>${icon('<path d="m15 5-7 7 7 7"/>')}</button><button type="button" data-im-gallery-step="1" ${gallery.n===imgs.length-1?'disabled':''}>${icon('<path d="m9 5 7 7-7 7"/>')}</button></div>`;}
  function galleryStep(n){if(!gallery||thread()!==gallery.c)return;const i=gallery.c.msgs.indexOf(gallery.m);if(i>=0)galleryShow(gallery.c,i,gallery.n+n);}
  function pickGroup(){const c=thread();if(!c||readerMode)return;const story=S, sender=snd(c)[who%snd(c).length],caption=host.querySelector('#mi')?.value.trim()||'';const reply=replyTarget(c);const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.multiple=true;picker.hidden=true;document.body.append(picker);picker.addEventListener('cancel',()=>picker.remove(),{once:true});picker.addEventListener('change',async()=>{const files=[...picker.files].slice(0,5);picker.remove();if(!files.length)return;try{const images=[];for(let i=0;i<files.length;i++){const img=await cropImageFile(files[i],null,1000,`${i+1} / ${files.length}`,{encode:chatCompress});if(!img)return;images.push(img);}if(S!==story||!S.chats.includes(c)||readerMode)return;const ts=chatCursor(c);let ref={};if(reply&&c.msgs.includes(reply)){reply.imessageId ||= uid();ref={imessageReply:{id:reply.imessageId,text:summary(reply),mine:reply.m===1,sender:reply.s??null}};if(replyTarget(c)===reply)draft=null;}c.msgs.push({...(sender.id?{m:0,s:sender.id}:{m:1}),t:caption,image:images[0],photoStack:images.slice(1),ts,...ref});c.cursor=ts+60000;pop=true;save();R();}catch(e){alert(e.message||tr('Não foi possível anexar as fotos.','Could not attach photos.'));}},{once:true});picker.click();}
  function inbox(){if(inboxStory!==S){inboxStory=S;query='';filter='all';}const rows=S.chats.map((c,i)=>({c,i,t:cts(c)})).sort((a,b)=>b.t-a.t).map(({c,i,t})=>{const l=[...c.msgs].reverse().find(m=>m.m!==2),pre=l?(l.m===0&&c.mem.length>1?ch(l.s).name+': ':'')+chatPreview(l):'No messages';return `<button type="button" class="im-inbox-row" data-im-open="${i}" data-unread="${!!c.unread}" data-im-search="${esc(cname(c)+' '+pre)}"><span class="im-unread-dot"></span>${gav(c,48)}<span class="im-inbox-copy"><span class="im-inbox-top"><strong>${esc(cname(c))}</strong><span class="im-inbox-time">${esc(fList(t))}${icon('<path d="m9 5 7 7-7 7"/>',13)}</span></span><span class="im-preview">${esc(pre)}</span></span></button>`}).join('');return `<header class="im-inbox-head"><div class="im-inbox-nav"><button type="button" data-im-filter-menu>${icon('<path d="m14 5-7 7 7 7"/>',19)} Filters</button><span></span>${readerMode?'':`<button type="button" data-im-edit-menu aria-label="More">${icon('<circle cx="12" cy="12" r="10"/><path d="M7 12h.01m5 0h.01m5 0h.01"/>')}</button><button type="button" data-im-new aria-label="New Message">${icon('<path d="M12 4H5v15h15v-7M17 3l4 4-9 9-5 1 1-5z"/>')}</button>`}</div><div class="im-inbox-menu" hidden></div><h1>Messages</h1><label class="im-search">${icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',19)}<input class="native-search-input" type="search" placeholder="Search" value="${esc(query)}" aria-label="Search messages">${icon('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0m-7 7v3"/>',17)}</label></header><div class="bd im-inbox-list">${rows}<p class="im-inbox-empty" hidden>No conversations</p></div>`;}
  function filterRows(){const list=host.querySelector('.im-inbox-list');if(!list)return;let n=0;for(const el of list.querySelectorAll('[data-im-open]')){el.hidden=(filter==='unread'&&el.dataset.unread!=='true')||!el.dataset.imSearch.toLowerCase().includes(query.toLowerCase());if(!el.hidden)n++;}list.querySelector('.im-inbox-empty').hidden=!!n;}
  function menu(kind){const box=host.querySelector('.im-inbox-menu');if(!box)return;if(!box.hidden&&box.dataset.kind===kind){box.hidden=true;return;}box.dataset.kind=kind;box.hidden=false;box.innerHTML=kind==='filter'?`<button data-im-filter="all">All Messages ${filter==='all'?'✓':''}</button><button data-im-filter="unread">Unread Messages ${filter==='unread'?'✓':''}</button>`:`<button data-im-delete>${ed?'Done':'Delete conversations'}</button><button data-im-read>Mark all as read</button>`;}
  host.addEventListener('input',e=>{if(e.target.matches('.im-search input')){query=e.target.value;filterRows();}});
  host.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn||cur!=='msg')return;const c=thread(),d=btn.dataset;if('imOpen'in d){const chat=S.chats[+d.imOpen];if(!chat)return;if(ed&&!readerMode){del('chats',+d.imOpen);return;}cid=chat.id;who=0;if(!readerMode){chat.unread=false;save();}R();}else if('imFilterMenu'in d)menu('filter');else if('imEditMenu'in d&&!readerMode)menu('edit');else if('imFilter'in d){filter=d.imFilter;host.querySelector('.im-inbox-menu').hidden=true;filterRows();}else if('imNew'in d&&!readerMode)addChat();else if('imDelete'in d&&!readerMode){ed=!ed;R();}else if('imRead'in d&&!readerMode){S.chats.forEach(c=>c.unread=false);save();R();}else if('imOptions'in d&&c)options(c,+d.imOptions);else if('imReply'in d&&c)action(c,+d.imReply,true);else if('imHeart'in d&&c)action(c,+d.imHeart,false);else if('imCancel'in d&&c){draft=null;redraw(c,true);}else if('imJump'in d){const target=host.querySelector(`[data-im-row="${+d.imJump}"]`);target?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target?.classList.remove('im-flash');if(target){void target.offsetWidth;target.classList.add('im-flash');}}else if('imGallery'in d&&c){if(ed&&!readerMode)del2(+d.imGallery);else galleryShow(c,+d.imGallery);}else if('imPickGroup'in d&&!readerMode){msgToggleApps();pickGroup();}});
  document.addEventListener('click',e=>{if(!e.target.closest('.im-action-menu,[data-im-options]'))host.querySelectorAll('.im-action-menu').forEach(el=>el.remove());if(!e.target.closest('.im-inbox-menu,[data-im-filter-menu],[data-im-edit-menu]')){const m=host.querySelector('.im-inbox-menu');if(m)m.hidden=true;}});
  const lightbox=document.getElementById('photo-lightbox');let swipe=null;
  lightbox.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if('imGalleryClose'in b.dataset){gallery=null;vPhotoClose();}else if('imGalleryStep'in b.dataset)galleryStep(+b.dataset.imGalleryStep);});
  lightbox.addEventListener('pointerdown',e=>{if(e.target.matches('.im-gallery-image'))swipe=e.clientX;});lightbox.addEventListener('pointerup',e=>{if(swipe!==null){const dx=e.clientX-swipe;swipe=null;if(Math.abs(dx)>40)galleryStep(dx<0?1:-1);}});lightbox.addEventListener('pointercancel',()=>swipe=null);
  document.addEventListener('keydown',e=>{if(!lightbox.querySelector('.im-gallery-image')||lightbox.style.display==='none')return;if(e.key==='ArrowLeft')galleryStep(-1);if(e.key==='ArrowRight')galleryStep(1);if(e.key==='Escape'){gallery=null;vPhotoClose();}});
  return {row,content,composer,consume,inbox,filterRows,photos,photosIcon:()=>icon(photosIcon,23)};
})();
