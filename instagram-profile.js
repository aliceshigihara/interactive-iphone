const InstagramProfile = (() => {
  const icons={
    home:'<path d="M2.8 10.5 12 3l9.2 7.5V21h-6.4v-6H9.2v6H2.8z"/>',
    reels:'<rect x="3.5" y="2.7" width="17" height="18.6" rx="5"/><path d="m10 8.2 5.8 3.8-5.8 3.8z"/>',
    search:'<circle cx="10.3" cy="10.3" r="7.2"/><path d="m16 16 5 5"/>',
    user:'<circle cx="12" cy="12" r="9.4"/><circle cx="12" cy="8.9" r="2.8"/><path d="M6.4 18.8a5.8 5.8 0 0 1 11.2 0"/>',
    plus:'<path d="M12 3v18M3 12h18"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2.7"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    down:'<path d="m5 9 7 7 7-7"/>',
    back:'<path d="m14 5-7 7 7 7"/>',
    menu:'<path d="M3 5h18M3 12h18M3 19h18"/>',
    threads:'<path d="M20.5 7C18.9 4.1 16.2 3 12.4 3 6.8 3 4 6.8 4 12s2.8 9 8.4 9c4.9 0 7.5-2.4 7.5-5.7 0-3.1-2.7-4.7-6-4.7-2.8 0-4.2 1.1-4.2 2.8 0 1.5 1.2 2.4 2.8 2.4 2.5 0 3.6-2.1 3.6-4.8 0-3.2-1.5-4.5-3.7-4.5-1.6 0-2.6.6-3.2 1.5"/>',
    people:'<circle cx="15" cy="8" r="3"/><path d="M9 20v-1.5a6 6 0 0 1 12 0V20zm-6-9v6m-3-3h6"/>',
    reposts:'<path d="m13 3 4 4-4 4m4-4H8a5 5 0 0 0-5 5v2m8 7-4-4 4-4m-4 4h9a5 5 0 0 0 5-5v-2"/>',
    tagged:'<path d="M8 5l2-2h4l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><circle cx="12" cy="11" r="3"/><path d="M6.7 20a5.4 5.4 0 0 1 10.6 0"/>',
    music:'<path d="m8 4 12 8-12 8z"/>',
    carousel:'<path d="M21 7v10a4 4 0 0 1-4 4H7" fill="none"/><rect x="3" y="3" width="14" height="14" rx="3" fill="currentColor"/>',
    grid:[3,10,17].flatMap(y=>[3,10,17].map(x=>`<rect x="${x}" y="${y}" width="4.5" height="4.5" rx=".7" fill="currentColor" stroke="none"/>`)).join('')
  };
  const dmIcon=(size=24)=>I('<path d="M3.9 3.8h15.4c1.6 0 2.4 1.4 1.5 2.7l-8.5 13.6c-.9 1.4-2.6 1.1-3-.5l-1.7-6.8-5-6.4c-.9-1.2-.2-2.6 1.3-2.6Z"/><path d="m7.6 12.8 12.7-8.1"/>',size,'none','currentColor',2.15);
  const svg=(name,size=24)=>name==='inbox'?dmIcon(size):I(icons[name],size,'none','currentColor',1.9);
  const arg=v=>esc(JSON.stringify(v));
  const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
  const own=p=>same(p.id,me()?.id);
  const canManage=p=>own(p)&&!readerMode;
  const tabs=[['grid','Posts'],['reels','Reels'],['reposts','Reposts'],['tagged','Tagged']];
  const find=id=>S.profiles.find(p=>same(p.id,id));
  const highlights=p=>Array.isArray(p.highlights)?p.highlights:[];
  const button=(label,code,content,cls='')=>`<button type="button" class="${cls}" aria-label="${label}" onclick="${code}">${content}</button>`;
  const go=t=>{igv=t?{t}:null;R()};
  function nav(){
    const t=igv?.t,active=['dm','newdm'].includes(t)?'inbox':t==='prof'||t==='highlight'?'profile':t||'home';
    return `<nav class="ig-native-nav" aria-label="Instagram">${[['home','Home','InstagramProfile.go(null)'],['reels','Reels',`InstagramProfile.go('reels')`],['inbox','Direct messages',`InstagramProfile.go('inbox')`],['search','Search',`InstagramProfile.go('search')`],['profile','Profile','goMe()']].map(([key,label,code])=>`<button type="button" aria-label="${label}"${active===key?' aria-current="page"':''} onclick="${code}">${key==='profile'?me()?.photo?avp(me(),23):svg('user',24):svg(key,24)}${key==='inbox'&&S.igDms?.some(d=>d.unread)?'<i class="ig-nav-dot" aria-hidden="true"></i>':''}</button>`).join('')}</nav>`;
  }
  function fields(p){
    return [{k:'private',l:'Mostrar cadeado no perfil',t:'sel',v:p.private?'yes':'no',o:[{v:'no',l:'Não'},{v:'yes',l:'Sim'}]},
      {k:'song',l:'Música do perfil (opcional)',v:p.song},{k:'artist',l:'Artista (opcional)',v:p.artist},{k:'threads',l:'Link do Threads (opcional)',v:p.threads}];
  }
  function musicForm(id){
    const p=find(id);if(!p||!canManage(p))return;
    form('Música do perfil',[{k:'song',l:'Nome da música',v:p.song},{k:'artist',l:'Artista',v:p.artist}],v=>{p.song=v.song.trim();p.artist=v.artist.trim()},'#pm');
  }
  function addHighlight(id){
    const p=find(id);if(!p||!canManage(p))return;
    form('Novo destaque',[{k:'title',l:'Nome do destaque'},{k:'igHighlight',l:'Foto do destaque',t:'file'}],v=>{
      if(!v.title.trim()||!v.igHighlight){alert('Informe o nome e escolha uma foto.');return false}
      p.highlights=[...highlights(p),{title:v.title.trim(),image:v.igHighlight}];
    },'#pm');
  }
  function showHighlight(id,index){const p=find(id);if(p&&highlights(p)[index]){igv={t:'highlight',id:p.id,index,tab:igv?.tab};R()}}
  function highlightView(){
    const p=find(igv.id),h=p&&highlights(p)[igv.index];
    if(!h)return render(igv.id);
    return `<header class="ig-profile-top ig-highlight-top">${button('Back',`InstagramProfile.fromPost(${arg(p.id)},${arg(igv.tab||'grid')})`,svg('back'))}<strong>${esc(h.title)}</strong><span></span></header><div class="bd ig-highlight-screen">${chatValidImage(h.image)?`<img src="${esc(h.image)}" alt="${esc(h.title)}">`:''}</div>${nav()}`;
  }
  function setTab(id,tab){if(!tabs.some(([key])=>key===tab))return;igv={t:'prof',id,tab};R();$('.ig-profile-tabs [aria-pressed=true]')?.focus({preventScroll:true})}
  function fromPost(id,tab){igv=id==null?{t:'search'}:{t:'prof',id,tab};R()}
  function openTile(i,id,tab){if(!S.posts[i])return;igv={t:'post',i,id,tab};R()}
  async function share(id){
    const p=find(id);if(!p)return;
    const text=`${p.name||p.user} (@${p.user})`;
    try{if(navigator.share)await navigator.share({text});else await navigator.clipboard.writeText(text)}
    catch(e){if(e.name!=='AbortError')prompt('Copiar perfil',text)}
  }
  function follow(id){
    if(readerMode)return;const p=find(id);if(!p||own(p))return;p.f=!p.f;save();R();
  }
  function render(id){
    const p=find(id);if(!p)return `<div class="bd ig-profile-empty">Profile unavailable</div>${nav()}`;
    const key=arg(p.id),mine=own(p),editable=canManage(p),tab=igv?.tab||'grid';
    const authored=S.posts.filter(post=>same(post.pid,id)),story=p.story&&chatValidImage(p.story);
    const user=`${p.private?svg('lock',15):''}<strong>${esc(p.user)}</strong>${mine?svg('down',14):''}`;
    const switcher=mine?`<details class="ig-profile-picker"><summary aria-label="Choose profile">${user}</summary><div>${S.profiles.map(n=>button('Open profile',`InstagramProfile.fromPost(${arg(n.id)},'grid')`,`${avp(n,26)} <span>${esc(n.user)}</span>`)).join('')}</div></details>`:`<div class="ig-profile-title">${user}</div>`;
    const menu=`<details class="ig-profile-menu"><summary aria-label="Profile menu">${svg('menu')}</summary><div>${editable?button('Edit profile',`this.closest('details').open=false;editProf(${key})`,'Edit profile'):''}${button('Share profile',`this.closest('details').open=false;InstagramProfile.share(${key})`,'Share profile')}${mine?button('Activity',`InstagramProfile.go('activity')`,'Activity'):''}</div></details>`;
    const avatar=story?button('View story',`openSty(${key})`,avp(p,76),'ig-profile-story-avatar'):avp(p,76);
    const controls=mine?`${editable?button('Edit profile',`editProf(${key})`,'Edit profile'):''}${button('Share profile',`InstagramProfile.share(${key})`,'Share profile')}`:
      `${!readerMode?button(p.f?'Following':'Follow',`InstagramProfile.follow(${key})`,p.f?'Following':'Follow',p.f?'':'ig-follow') : ''}${button('Message',`igStartDm(${key})`,'Message')}`;
    const h=highlights(p);
    const highlightBar=editable||h.length?`<div class="ig-profile-highlights">${editable?button('New highlight',`InstagramProfile.addHighlight(${key})`,`<span class="ig-highlight-cover is-new">${svg('plus',27)}</span><span>New</span>`):''}${h.map((entry,index)=>button('Open highlight',`InstagramProfile.showHighlight(${key},${index})`,`<span class="ig-highlight-cover">${chatValidImage(entry.image)?`<img src="${esc(entry.image)}" alt="">`:''}</span><span>${esc(entry.title)}</span>`)).join('')}</div>`:'';
    const link=xWebsite(p.link);
    const music=p.song||editable?`<div class="ig-profile-music">${p.song?`<span>${svg('music',14)} <b>${esc(p.song)}</b>${p.artist?` ${esc(p.artist)}`:''}</span>`:''}${editable?button(p.song?'Edit profile music':'Add profile music',`InstagramProfile.musicForm(${key})`,`${svg('plus',13)} ${p.song?'Edit':'Add'}`):''}</div>`:'';
    const profileTabs=`<nav class="ig-profile-tabs" aria-label="Profile sections">${tabs.map(([t,label])=>`<button type="button" aria-label="${label}" aria-pressed="${tab===t}" onclick="InstagramProfile.setTab(${key},'${t}')">${svg(t,23)}</button>`).join('')}</nav>`;
    const posts=S.posts.map((post,i)=>({post,i})).filter(({post})=>tab==='tagged'?same(post.igTagged,id):tab==='reposts'?same(post.igRepost,id):same(post.pid,id)&&(tab!=='reels'||!!post.views));
    const grid=posts.map(({post,i})=>{
      const src=post.imgs?.[0]||post.img;
      return button('Open post',`InstagramProfile.openTile(${i},${key},'${tab}')`,`${chatValidImage(src)?`<img src="${esc(src)}" alt="">`:post.cap?`<span class="ig-grid-caption">${esc(post.cap)}</span>`:''}${post.views?`<i>${svg('reels',15)}</i>`:post.imgs?.length>1?`<i>${svg('carousel',15)}</i>`:''}`,'ig-profile-tile');
    }).join('');
    const threads=xWebsite(p.threads);
    return `<header class="ig-profile-top${threads?' has-threads':''}">${editable?button('Create post',`addPost(${key})`,svg('plus')):!mine?button('Back','InstagramProfile.go(null)',svg('back')):'<span></span>'}${switcher}<span class="ig-profile-tools">${threads?`<a href="${esc(threads)}" target="_blank" rel="noopener noreferrer" aria-label="Threads">${svg('threads',23)}</a>`:''}${menu}</span></header>
      <div class="bd ig-profile-page"><section class="ig-profile-summary">
        <div class="ig-profile-person"><div class="ig-profile-photo">${avatar}${editable?button('Add story',`addStory(${key})`,svg('plus',14),'ig-profile-add-story'):''}</div><div class="ig-profile-stats"><h2>${esc(p.name||p.user)}</h2><div><span><b>${authored.length}</b> posts</span><span><b>${esc(p.fol||'0')}</b> followers</span><span><b>${esc(p.fng||'0')}</b> following</span></div></div></div>
        ${p.bio?`<p class="ig-profile-bio">${esc(p.bio)}</p>`:''}${link?`<a class="ig-profile-link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(p.link)}</a>`:''}
        ${music}<div class="ig-profile-actions">${controls}${button('Discover accounts',`InstagramProfile.go('search')`,svg('people',18),'ig-profile-discover')}</div>
        ${highlightBar}</section>${profileTabs}${grid?`<div class="ig-profile-grid">${grid}</div>`:`<div class="ig-profile-empty">${tab==='grid'?'No posts yet':tab==='tagged'?'No tagged posts':`No ${tab} yet`}</div>`}</div>${nav()}`;
  }
  return {nav,render,go,fields,musicForm,addHighlight,showHighlight,highlightView,setTab,fromPost,openTile,share,follow,dmIcon};
})();
