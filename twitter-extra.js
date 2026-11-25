/* Explore, activity and chat are driven by the current fictional story. */
const TwitterExtra = (() => {
  const topics = ['Explore','Trending','News','Sports','Entertainment'];
  const examples = [
    {title:'Football under the lights',subtitle:'The biggest game of the week',category:'Sports',time:'Today',feature:true},
    {title:'A new wave of independent creators takes over the timeline',category:'News',time:'3 hours ago',count:'1.1K posts',mark:'✦'},
    {title:'Fans turn a pixelated guessing game into a viral challenge',category:'Entertainment',time:'20 hours ago',count:'1K posts',mark:'▦'},
    {title:'A sold-out weekend puts the season’s biggest release in the spotlight',category:'Entertainment',time:'11 hours ago',count:'304 posts',mark:'◈'}
  ];
  const localRead = new WeakMap();
  let topic='Explore', activity='All', inbox='All', dmQuery='';
  const items = key => Array.isArray(S[key])?S[key]:[];
  const nextId = () => globalThis.crypto?.randomUUID?.()||String(Date.now());
  const dmRows = () => items('xDms').filter(d=>d.pid!=null&&String(d.owner??S.xOwner)===String(S.xOwner));
  const getThread = id => dmRows().find(d=>String(d.id)===String(id));
  const profileExists = id => xData().some(p=>String(p.id)===String(id));
  const profileOptions = (predicate=()=>true) => xData().filter(predicate).map(p=>({v:p.id,l:`@${p.user}`}));
  const xOwner = p => String(p)===String(S.xOwner);
  const tabs = (values,selected,handler,icons={}) => `<nav class="x-extra-tabs${values.length>2?' is-scrollable':''}" aria-label="${values.length>2?'Explore categories':'Notification filters'}">${values.map(t=>`<button type="button" ${selected===t?'aria-pressed="true"':'aria-pressed="false"'} onclick="${handler}(${xArg(t)})"><span>${icons[t]?xi(icons[t],17):''}${t}</span></button>`).join('')}</nav>`;
  const searchBox = (value,handler,label='Search') => `<label class="x-extra-search">${xi('search',18)}<input type="search" class="native-search-input" placeholder="Search" aria-label="${label}" value="${esc(value)}" oninput="${handler}(this.value)"></label>`;
  const gear = (section) => `<button type="button" class="x-extra-gear" aria-label="${section} settings" onclick="TwitterExtra.settings('${section}')">${xDrawerIcon('settings',22)}</button>`;
  const header = (avatar,middle,right='') => `<header class="x-extra-head">${avatar}${middle}${right||'<span></span>'}</header>`;
  const fab = (label,handler,icon) => !readerMode?`<button type="button" class="x-fab" aria-label="${label}" onclick="${handler}">${icon}</button>`:'';
  const postFab = () => fab('New post','xPostForm()',I('<path d="M12 5v14M5 12h14"/>',27,'none','#fff'));
  const empty = (title,desc='') => `<div class="x-empty x-extra-empty"><b>${title}</b>${desc?`<p>${desc}</p>`:''}</div>`;

  function featured(item,index=null) {
    const tag=index==null?'div':'button';
    return `<${tag} class="x-explore-feature"${index!=null?` type="button" onclick="TwitterExtra.showStory(${index})"`:''}>
      ${chatValidImage(item.photo)?`<img src="${esc(item.photo)}" alt="">`:`<span class="x-explore-feature-art" aria-hidden="true"><span></span><span></span><span></span></span>`}
      <span class="x-explore-feature-copy"><strong>${esc(item.title)}</strong>${item.subtitle?`<span>${esc(item.subtitle)}</span>`:''}<small>${esc(item.category)}${item.time?` · ${esc(item.time)}`:''}</small></span></${tag}>`;
  }
  const stories = () => items('xExplore').length?items('xExplore'):examples;
  function exploreRows() {
    if(xQuery.trim())return xResults()||empty('No results','Try a different name or keyword.');
    const list=stories(),feature=topic==='Explore'?list.findIndex(p=>p.feature):-1;
    const news=list.map((p,i)=>[p,i]).filter(([p,i])=>i!==feature&&(topic==='Explore'||topic==='Trending'||p.category===topic));
    return `${feature>=0?featured(list[feature],feature):''}<section class="x-explore-news"><h2>${topic==='Explore'?"Today's News":topic}</h2>
      ${news.map(([p,i])=>`<button type="button" class="x-explore-news-row" onclick="TwitterExtra.showStory(${i})"><span><b>${esc(p.title)}</b><small>${[p.time,p.category,p.count].filter(Boolean).map(esc).join(' · ')}</small></span>${chatValidImage(p.photo)?`<img src="${esc(p.photo)}" alt="">`:`<span class="x-news-art" data-color="${i%3}" aria-hidden="true">${esc(p.mark||'✦')}</span>`}</button>`).join('')||empty('No stories yet')}</section>`;
  }
  function explore(avatar) {
    return {head:header(avatar,searchBox(xQuery,'xSearch'),gear('Explore'))+tabs(topics,topic,'TwitterExtra.pickTopic'),body:exploreRows(),footer:postFab()};
  }
  function pickTopic(value){if(topics.includes(value)){topic=value;xQuery='';R();$('.x-extra-tabs [aria-pressed=true]')?.focus({preventScroll:true})}}
  function showStory(i){if(stories()[i])xVisit('news',i)}
  function story(id){const p=stories()[Number(id)];return p?`${featured(p)}<div class="x-menu-content">${esc(p.details||p.subtitle||p.title)}</div>`:empty('Story unavailable')}
  function exploreForm(){
    if(readerMode)return;
    form('Notícia do Twitter',[{k:'title',l:'Título'},{k:'subtitle',l:'Subtítulo (opcional)'},{k:'category',l:'Categoria',t:'sel',v:'News',o:topics.slice(2).map(v=>({v,l:v}))},{k:'time',l:'Horário (ex.: 3h)'},{k:'count',l:'Volume (ex.: 1.1K posts)'},{k:'feature',l:'Destaque em Explore',t:'sel',v:'no',o:[{v:'no',l:'Não'},{v:'yes',l:'Sim'}]},{k:'details',l:'Texto da notícia',t:'area'},{k:'photo',l:'Imagem',t:'file'}],v=>{
      if(!v.title.trim())return false;
      S.xExplore=[{...v,id:nextId(),feature:v.feature==='yes'},...items('xExplore')];
    },'#pm');
  }

  function activityRows(){
    const owner=xPerson(S.xOwner);
    const mentions=S.xPosts.filter(p=>{
      if(!owner.user||owner.id==null||xOwner(p.pid)||!xCanSee(xPerson(p.pid)))return false;
      const byReply=p.parent!=null&&xOwner(xFindPost(p.parent)?.pid);
      const byMention=(String(p.text||'').match(/@[A-Za-z0-9_]+/g)||[]).some(m=>m.slice(1).toLowerCase()===String(owner.user).toLowerCase());
      return byReply||byMention;
    }).map(p=>({post:p,reply:p.parent!=null&&xOwner(xFindPost(p.parent)?.pid),stamp:+p.ts||Number(p.id)||0}));
    const likes=new Map();
    if(activity==='All')for(const a of items('xActivity')){
      const p=xFindPost(a.post);if(!p||!xOwner(p.pid)||!profileExists(a.pid))continue;
      const key=String(a.post);if(!likes.has(key))likes.set(key,{like:a,people:new Set(),stamp:+a.ts||0});
      likes.get(key).people.add(String(a.pid));
    }
    const rows=[...mentions,...likes.values()].sort((a,b)=>b.stamp-a.stamp);
    return rows.map(({post,reply,like,people})=>{
      if(post)return xPost(post,{replyingTo:reply?owner:null});
      const p=xFindPost(like.post),a=xPerson(like.pid);
      const avatars=[...people].slice(0,3).map(id=>`<button type="button" class="x-avatar-button" aria-label="${esc(xPerson(id).name)}" onclick="xOpenProfile(${xArg(id)})">${av(xPerson(id),32)}</button>`).join('');
      const others=people.size-1;
      return `<div class="x-activity-like">${xPostIcon('heartFilled',24)}<div class="x-activity-copy"><div class="x-activity-avatars">${avatars}</div><button type="button" class="x-activity-post" onclick="xOpenPost(${xArg(p.id)})"><span><b>${esc(a.name)}</b>${others?` and ${others} ${others===1?'other':'others'}`:''} liked your post${like.time?` <small>· ${esc(like.time)}</small>`:''}</span>${p.text?`<span class="x-activity-snippet">${esc(p.text)}</span>`:''}</button></div>${chatValidImage(p.photo)?`<img src="${esc(p.photo)}" alt="">`:''}</div>`;
    }).join('')||empty(activity==='Mentions'?'No mentions yet':'No notifications yet','Activity on your posts will show up here.');
  }
  function notifications(avatar) {
    return {head:header(avatar,'<h2>Notifications</h2>',gear('Notifications'))+tabs(['All','Mentions'],activity,'TwitterExtra.pickActivity',{All:'bell'}),body:activityRows(),footer:postFab()};
  }
  function pickActivity(t){if(['All','Mentions'].includes(t)){activity=t;R();$('.x-extra-tabs [aria-pressed=true]')?.focus({preventScroll:true})}}
  function likeForm(){
    if(readerMode)return;
    const posts=S.xPosts.filter(p=>xOwner(p.pid)),people=profileOptions(p=>!xOwner(p.id));
    if(!posts.length||!people.length){alert('Crie um post do dono do iPhone e outro perfil primeiro.');return}
    form('Notificação de curtida',[{k:'pid',l:'Quem curtiu',t:'sel',o:people},{k:'post',l:'Post',t:'sel',o:posts.map(p=>({v:p.id,l:String(p.text||'Imagem').slice(0,80)}))},{k:'time',l:'Horário (ex.: 2h)'}],v=>{
      S.xActivity=[{...v,id:nextId(),ts:Date.now()},...items('xActivity')];
    },'#pm');
  }

  const readSet = () => {
    if(!localRead.has(S))localRead.set(S,new WeakSet());
    return localRead.get(S);
  };
  const isUnread = d => !!d.unread&&!readSet().has(d);
  function chatsRows(){
    const q=dmQuery.trim().toLowerCase();
    return dmRows().filter(d=>inbox!=='Unread'||isUnread(d)).filter(d=>{
      const p=xPerson(d.pid);
      return `${p.name} ${p.user} ${(d.msgs||[]).at(-1)?.text||''}`.toLowerCase().includes(q);
    }).map(d=>{
      const p=xPerson(d.pid),last=(d.msgs||[]).at(-1);
      return `<button type="button" class="x-chat-row${isUnread(d)?' is-unread':''}" onclick="TwitterExtra.openDM(${xArg(d.id)})">${av(p,53)}<span class="x-chat-meta"><span><b>${esc(p.name)}${p.verified?` <span class="x-verified">${xPostIcon('verified',14)}</span>`:''}</b><time>${esc(last?.time||'')}</time></span><small>${esc(last?.text||'New conversation')}</small></span></button>`;
    }).join('')||empty(q?'No matching chats':inbox==='Unread'?'No unread chats':'Your inbox is empty',q?'':'No direct messages to show.');
  }
  function filterDM(value){dmQuery=value;const list=$('#x-chat-list');if(list)list.innerHTML=chatsRows()}
  function pickInbox(t){if(['All','Unread'].includes(t)){inbox=t;R()}}
  function mail(avatar){
    const options=`<details class="x-chat-filter"><summary>${inbox}${I('<path d="m6 9 6 6 6-6"/>',16,'none','currentColor',2.4)}</summary><div>${['All','Unread'].map(t=>`<button type="button" onclick="TwitterExtra.pickInbox('${t}')">${t}</button>`).join('')}</div></details>`;
    return {head:header(avatar,'<h2>Chat</h2>',options)+`<div class="x-chat-search">${searchBox(dmQuery,'TwitterExtra.filterDM','Search chats')}</div>`,
      body:`<div id="x-chat-list">${chatsRows()}</div>`,footer:fab('New chat','TwitterExtra.dmForm()',`${xi('reply',27)}<span class="x-fab-plus" aria-hidden="true">+</span>`)};
  }
  function openDM(id){const d=getThread(id);if(!d)return;readSet().add(d);xVisit('dm',id)}
  function thread(id){
    const d=getThread(id);if(!d)return {title:'Chat',body:empty('Conversation unavailable'),footer:''};
    const p=xPerson(d.pid);
    return {title:esc(p.name),body:`<div class="x-dm-intro">${av(p,54)}<b>${esc(p.name)} ${xBadges(p)}</b><span>@${esc(p.user)}</span></div><div class="x-dm-bubbles">${(d.msgs||[]).map(m=>`<div class="x-dm-bubble${m.out?' is-out':''}"><span>${esc(m.text)}</span>${m.time?`<time>${esc(m.time)}</time>`:''}</div>`).join('')}</div>`,
    footer:!readerMode?`<div class="x-reply-footer"><button type="button" onclick="TwitterExtra.dmForm(${xArg(id)})">Add message</button></div>`:''};
  }
  function dmForm(id){
    if(readerMode)return;
    const d=id==null?null:getThread(id),people=profileOptions(p=>!xOwner(p.id));
    if(!d&&(!profileExists(S.xOwner)||!people.length)){alert('Escolha o perfil do dono do iPhone e crie outro perfil para conversar.');return}
    form(d?'Mensagem do Twitter':'Nova conversa do Twitter',[...(d?[]:[{k:'pid',l:'Perfil',t:'sel',o:people}]),{k:'text',l:'Mensagem',t:'area'},{k:'time',l:'Horário (ex.: 41m)',v:'now'},{k:'out',l:'Quem enviou?',t:'sel',v:'no',o:[{v:'no',l:'Contato'},{v:'yes',l:'Dono do iPhone'}]},{k:'unread',l:'Marcar como não lida',t:'sel',v:'no',o:[{v:'no',l:'Não'},{v:'yes',l:'Sim'}]}],v=>{
      if(!v.text.trim())return false;
      let target=d||dmRows().find(q=>String(q.pid)===String(v.pid));
      if(!target){target={id:nextId(),pid:v.pid,owner:S.xOwner,msgs:[]};S.xDms.unshift(target)}
      target.msgs=[...(target.msgs||[]),{text:v.text.trim(),time:v.time,out:v.out==='yes'}];
      target.unread=v.unread==='yes';readSet().delete(target);
      S.xDms=[target,...S.xDms.filter(q=>q!==target)];
    },'#pm');
  }
  function settings(section){
    if(!readerMode){(section==='Explore'?exploreForm:likeForm)();return}
    xVisit('menu',section);
  }
  function reset(){topic='Explore';activity='All';inbox='All';dmQuery=''}
  return {reset,explore,exploreRows,pickTopic,showStory,story,exploreForm,notifications,pickActivity,likeForm,mail,filterDM,pickInbox,openDM,thread,dmForm,settings};
})();
