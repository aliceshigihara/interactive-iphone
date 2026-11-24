const {resolveFormPreview, mountFormPreview} = (() => {
  const text = (value, fallback = '') => esc(String(value ?? '').trim() || fallback);
  const image = value => typeof value === 'string' && /^data:image\/(?:jpeg|png|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(value) ? value : '';
  const photo = (value, cls = '') => image(value) ? `<img class="${cls}" src="${image(value)}" alt="">` : '';
  const avatar = (name, src, size = 44) => av({name, photo: image(src)}, size);
  const count = value => num(Math.max(0, Number(value) || 0));
  const fmtDate = value => value ? new Date(value).toLocaleDateString('en-US', {dateStyle: 'medium'}) : '';

  function resolveFormPreview(title, fields, app, base) {
    if (!fields.length || /^(Nova|Renomear) história$/.test(title)) return null;
    const keys = new Set(fields.map(f => f.k));
    const has = (...names) => names.every(name => keys.has(name));
    const inMessenger = ['msg', 'wa', 'ka'].includes(app) ? app : 'msg';
    const card = (key, render) => ({app: key, render});
    const profileStats = (first, second, posts) => `<div class="fp-stats">${posts === undefined ? '' : `<span><b>${posts}</b>posts</span>`}<span><b>${text(first, '0')}</b>followers</span><span><b>${text(second, '0')}</b>following</span></div>`;
    if (has('from','subj','body')) return card('mail', v => `<div class="fp-mail-head">${avatar(v.from, '', 42)}<div><b>${text(v.from,'Remetente')}</b><small>To: Me${v.ts ? ` · ${text(fmtDate(v.ts))}` : ''}</small></div>${v.r === '0' ? '<i class="fp-unread" aria-label="Não lido"></i>' : ''}</div><h3>${text(v.subj,'Assunto')}</h3><p class="fp-copy">${text(v.body,'O texto do e-mail aparece aqui.')}</p>`);
    if (has('brand','tier','last4')) return card('wallet', v => walletCard({...v,last4:/^\d{4}$/.test(v.last4)?v.last4:'0000'},0,false));
    if (has('cap','likes')) return card('ig', v => {
      const a = pf(v.pid || base.pid);
      const imgs = v.imgs?.length ? v.imgs : base.imgs?.length ? base.imgs : [base.img];
      return `<div class="fp-social-head">${avatar(a.user,a.photo,32)}<b>${text(a.user,'username')}</b><span>⋯</span></div><div class="fp-media">${photo(imgs[0]) || '<span>Foto da publicação</span>'}${imgs.length>1?`<i>1/${imgs.length}</i>`:''}</div><div class="fp-post-actions">${[HRT,CMT,SND,BKM].map(d=>I(d,21)).join('')}</div><b>${count(v.likes)} likes</b><p class="fp-copy"><b>${text(a.user,'username')}</b> ${text(v.cap,'Legenda da publicação')}</p>${v.views ? `<small>${count(v.views)} views</small>` : ''}${v.ts ? `<small>${text(igAgo(fromL(v.ts)))}</small>` : ''}`;
    });
    if (has('b','f1','f2') || has('bio','fol','fng')) return card('ig', v => {
      const user = (v.u ?? v.user ?? '').trim().replace(/\s+/g,'.').toLowerCase();
      const posts = S.posts.filter(p=>p.pid===base.id).length;
      return `<div class="fp-social-head"><b>${text(user,'username')}</b><span>⋯</span></div><div class="fp-profile-head"><div class="${v.s||base.story?'fp-story-ring':''}">${avatar(user,v.p||v.photo||base.photo,57)}</div>${profileStats(v.f1??v.fol,v.f2??v.fng,posts)}</div><b>${text(v.n??v.name,'Nome do perfil')}</b><p class="fp-copy">${text(v.b??v.bio,'Bio do perfil')}</p>${v.l||v.link?`<p class="fp-link">${text(v.l||v.link)}</p>`:''}<div class="fp-profile-actions"><span>Edit profile</span><span>Share profile</span></div>`;
    });
    if (has('pid','text','reposts')) return card('x', v => {
      const a = xPerson(v.pid);
      return `<div class="fp-tweet">${avatar(a.name,a.photo,37)}<div><div class="fp-tweet-meta"><b>${text(a.name,'Nome')}</b><small>@${text(a.user,'username')} · ${text(v.time,'now')}</small></div><p class="fp-copy">${text(v.text,'Texto da publicação')}</p>${photo(v.photo || base.photo,'fp-tweet-photo')}<div class="fp-tweet-actions">${[['reply',''],['repost',v.reposts],['heart',v.likes],['views',v.views],['bookmark',''],['share','']].map(([k,n])=>`<span>${xPostIcon(k,15)}${Number(n)>0?count(n):''}</span>`).join('')}</div></div></div>`;
    });
    if (has('user','followers','following')) return card('x', v => `<div class="fp-banner">${photo(v.banner||base.banner)}</div><div class="fp-banner-avatar">${avatar(v.name,v.photo||base.photo,54)}</div><b>${text(v.name,'Nome do perfil')}${v.protected==='yes'?` ${xPostIcon('lock',13)}`:''}</b><small>@${text(v.user,'username')}</small><p class="fp-copy">${text(v.bio,'Bio do perfil')}</p>${profileStats(v.followers,v.following)}`);
    if (has('n','p') || title==='Editar contato' || title==='Apple ID') return card(title==='Apple ID'?'st':inMessenger, v => {
      const name = v.n || v.name || 'Nome do contato';
      return `<div class="fp-contact">${avatar(name,v.p||v.photo||base.photo,72)}<h3>${text(name)}</h3>${v.phone||v.email?`<small>${text(v.phone||v.email)}</small>`:''}<div><span>message</span><span>audio</span><span>video</span></div></div>`;
    });
    if (has('m','names','photos')) return card(inMessenger, v => {
      const members = (v.m||[]).map(ch).concat((v.names||'').split(',').map(s=>s.trim()).filter(Boolean).map((name,i)=>({name,photo:v.photos?.[i]})));
      return `<div class="fp-contact"><div class="fp-avatars">${(members.length?members.slice(0,4):[{name:'?'}]).map(p=>avatar(p.name,p.photo,46)).join('')}</div><h3>${text(v.n||members.map(p=>p.name).join(', '),'Nova conversa')}</h3><small>${members.length} ${members.length===1?'participante':'participantes'}</small></div>`;
    });
    if (title==='Informações do grupo' || title==='Date & time' || title==='Edit date & time') return card(inMessenger, v => `<div class="fp-contact"><h3>${text(v.name || (v.ts && new Date(v.ts).toLocaleString('en-US')), 'Data e hora da conversa')}</h3></div>`);
    if (title==='Add story') return card('ig', v => `<div class="fp-story">${photo(v.i)||'<span>Foto do story</span>'}<i></i></div>`);
    if (has('channel','duration','ytthumb')) return card('yt', v => {
      const c = ytChannel({channel:v.channel});
      return `<div class="fp-video">${ytThumb({thumb:image(v.ytthumb||base.thumb),duration:v.duration})}</div><div class="fp-social-head">${avatar(c.name,c.photo,36)}<div><b>${text(v.title,'Título do vídeo')}</b><small>${text(c.name)} · ${text(v.views,'0')} views${v.date?` · ${text(v.date)}`:''}</small></div></div><p class="fp-copy">${text(v.description)}</p>`;
    });
    if (has('handle','subs','ytbanner')) return card('yt', v => `<div class="fp-banner">${photo(v.ytbanner||base.banner)}</div><div class="fp-social-head">${avatar(v.name,v.photo||base.photo,53)}<div><b>${text(v.name,'Nome do canal')}</b><small>@${text(v.handle?.replace(/^@/,''),'username')} · ${text(v.subs,'0')} inscritos</small></div></div><p class="fp-copy">${text(v.bio)}</p>`);
    if (has('name','text','likes')) return card('yt', v => `<div class="fp-social-head">${avatar(v.name,'',35)}<b>${text(v.name,'Nome')}</b></div><p class="fp-copy">${text(v.text,'Comentário')}</p><small>♡ ${text(v.likes,'0')}</small>`);
    if (has('dir','sub','n')) return card('ph', v => `<div class="fp-recents"><div>${PH_I}</div><div><b class="${v.dir==='miss'?'fp-missed':''}">${text(v.name,'Contato')}${+v.n>1?` (${count(v.n)})`:''}</b><small>${text(v.sub,'mobile')}</small></div><small>${text(v.ts ? fList(fromL(v.ts)) : '')}</small></div>`);
    if (has('city','off')) return card('clk', v => {
      const d = new Date(nowTs()); d.setHours(d.getHours()+(Number(v.off)||0));
      return `<div class="fp-recents"><div><b>${text(v.city,'Cidade')}</b><small>${text(v.off,'0')} HRS</small></div><strong>${text(fT(+d))}</strong></div>`;
    });
    if (has('enabled','time') || title==='Sleep | Wake Up') return card('clk', v => `<div class="fp-recents"><div><strong>${text(v.time||v.wake,'07:00')}</strong><small>${text(v.label,'Sleep | Wake Up')}</small></div><span class="fp-toggle ${v.enabled==='0'?'off':''}"></span></div>`);
    if (has('t','date','c')) return card('cal', v => `<div class="fp-event"><i style="background:${Object.values(EC).includes(v.c)?v.c:EC.Purple}"></i><div><b>${text(v.t,'Título do evento')}</b><small>${text(fmtDate(v.date))}</small></div><small>${text(v.time,'All-day')}</small></div>`);
    if (has('person','place','status')) return card('find', v => {
      const person = findAvatar(v);
      return `<div class="fp-place">◎</div><div class="fp-social-head">${avatar(person.name,person.photo,40)}<div><b>${text(person.name,'Pessoa')}</b><small>${text(v.place,'Local não definido')}</small><small>${text(v.status,'Now')}</small></div></div>`;
    });
    if (/pino|localização|recent place/i.test(title)) return card(['find','map'].includes(app)?app:'map', v => `<div class="fp-place">📍</div><h3>${text(v.name||v.place||v.p,'Nome do local')}</h3><p class="fp-copy">${text(v.description,'Local da história')}</p>`);
    if (has('s') && /search/i.test(title)) return card('saf', v => `<div class="fp-search">⌕ ${text(v.s,'Pesquisar no Safari')}</div>`);
    if (has('title','category','summary')) return card('saf', v => `<small>${text(v.category,'News')}</small><h3>${text(v.title,'Manchete')}</h3><small>${text(v.author)} ${text(v.date)}</small>${photo(v.image||base.image,'fp-tweet-photo')}<p class="fp-copy">${text(v.summary||v.body,'Resumo da notícia')}</p>`);
    if (has('name','tagline')) return card('saf', v => `<h3>${text(v.name,'Nome do jornal')}</h3><p class="fp-copy">${text(v.tagline,'Subtítulo')}</p>`);
    if (has('currency','balance')) return card('bar', v => `<div class="fp-bank"><b>${text(v.accountName||v.name,'Bank')}</b><small>${text(v.accountType||v.holder)}</small><strong>${text((v.currency||'GBP')+' '+(v.balance||'0'))}</strong></div>`);
    if (has('amount')) return card('bar', v => `<div class="fp-recents"><div><b>${text(v.merchant||v.name,'Transação')}</b><small>${text(v.when||v.date||v.category)}</small></div><strong>${text(v.amount,'0')}</strong></div><p class="fp-copy">${text(v.note)}</p>`);
    if (app && FN[app]) return card(app, v => `<h3>${text(title)}</h3><dl class="fp-fields">${fields.map(f=>{
      const raw=v[f.k],value=f.o?.find(option=>String(option.v)===String(raw))?.l??raw;
      return `<div><dt>${text(f.l)}</dt><dd>${f.t==='file'?photo(Array.isArray(raw)?raw[0]:raw)||'—':text(Array.isArray(value)?value.join(', '):value,'—')}</dd></div>`;
    }).join('')}</dl>`);
    return null;
  }

  function mountFormPreview(panel, preview, read) {
    const form = document.createElement('div'), side = document.createElement('aside'), tabs = document.createElement('div');
    form.className = 'fp-editor';
    form.append(...panel.childNodes);
    side.className = `fp-aside fp-${preview.app}`;
    side.setAttribute('aria-label', 'Prévia');
    side.innerHTML = `<div class="fp-heading"><span>PRÉVIA AO VIVO</span><span>${text(FN[preview.app])}</span></div><div class="fp-device"><div class="fp-status"><b>${text(sT())}</b><i></i><span>● ▰</span></div><div class="fp-app-title"><span class="fp-icon">${iconOf(preview.app)}</span><b>${text(FN[preview.app])}</b></div><div class="fp-app-card"></div></div>`;
    panel.classList.add('fp-panel');
    tabs.className = 'fp-tabs';
    tabs.setAttribute('role','group');
    tabs.setAttribute('aria-label','Visualização do formulário');
    tabs.innerHTML = '<button type="button" data-fp-view="edit" aria-pressed="true">Editar</button><button type="button" data-fp-view="preview" aria-pressed="false">Prévia ao vivo</button>';
    panel.dataset.fpTab = 'edit';
    for (const button of tabs.children) button.onclick = () => {
      panel.dataset.fpTab = button.dataset.fpView;
      for (const tab of tabs.children) tab.setAttribute('aria-pressed', String(tab===button));
      panel.scrollTop = 0;
    };
    panel.append(tabs,form,side);
    const surface = side.querySelector('.fp-app-card');
    const refresh = () => { surface.innerHTML = preview.render(read()); };
    form.addEventListener('input', refresh);
    form.addEventListener('change', refresh);
    refresh();
    return refresh;
  }

  return {resolveFormPreview, mountFormPreview};
})();
