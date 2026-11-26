/* Motion-inspired lock-screen stack. Dismissals live only in the simulator session. */
const NotificationStack = (() => {
  const stacks = new WeakMap();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.18,.85,.27,1)';

  function mount(host) {
    const tr = SiteLanguage.text;
    host.innerHTML = `<div class="notice-stack-viewport" role="list" aria-label="${tr('Notificações','Notifications')}"></div>
      <button type="button" class="notice-stack-toggle" aria-expanded="false"></button>`;
    const list = host.firstElementChild, toggle = host.lastElementChild;
    const state = {story:null,entries:[],dismissed:new Set(),expanded:false,drag:null,skipClick:false};
    stacks.set(host,state);

    function cards() { return [...list.children]; }
    function animateFrom(before) {
      if (reduced.matches) return;
      for (const row of cards()) {
        if (row.hidden) continue;
        const old = before.get(row), next = row.getBoundingClientRect();
        if (old) {
          const distance = old.top - next.top;
          if (Math.abs(distance)>1) row.animate([{translate:`0 ${distance}px`},{translate:'0 0'}],{duration:320,easing});
        } else if (state.expanded) {
          row.animate([{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:280,easing});
        }
      }
    }
    function positions() {
      return new Map(cards().filter(row=>!row.hidden).map(row=>[row,row.getBoundingClientRect()]));
    }
    function sync() {
      const rows = cards();
      if (rows.length<2) state.expanded=false;
      host.toggleAttribute('data-expanded',state.expanded);
      host.hidden=!rows.length;
      toggle.hidden=rows.length<2;
      toggle.setAttribute('aria-expanded',String(state.expanded));
      toggle.textContent=state.expanded ? tr('Recolher notificações','Show fewer notifications') :
        tr(`Ver notificações (${rows.length})`,`Show notifications (${rows.length})`);
      rows.forEach((row,index)=>{
        row.hidden=!state.expanded&&index>2;
        row.inert=!state.expanded&&index>0;
        row.style.setProperty('--notice-depth',index);
      });
      if (!state.expanded) list.scrollTop=0;
    }
    function expand(open,before=positions()) {
      if (state.expanded===open || list.children.length<2) return;
      state.expanded=open;
      sync();animateFrom(before);
    }
    function settle(surface) {
      surface.style.transform='';
      surface.style.opacity='';
    }
    async function dismiss(row,direction) {
      if (row.hasAttribute('data-leaving') || !row.isConnected) return;
      const oldStory=state.story;
      const notice=state.entries[cards().indexOf(row)];
      if (!notice) return;
      row.dataset.leaving='';
      const surface=row.firstElementChild;
      if (!reduced.matches) {
        const animation=surface.animate([
          {transform:getComputedStyle(surface).transform,opacity:getComputedStyle(surface).opacity},
          {transform:`translateX(${direction*(list.clientWidth+24)}px) rotate(${direction*5}deg)`,opacity:0},
        ],{duration:210,easing,fill:'forwards'});
        await animation.finished.catch(()=>{});
      }
      if (state.story!==oldStory) return;
      const before=positions();
      state.dismissed.add(notice);
      const index=state.entries.indexOf(notice);
      if(index>=0)state.entries.splice(index,1);
      row.remove();
      sync();animateFrom(before);
    }
    state.update = (story,notices,markup) => {
      if(state.story!==story){
        state.story=story;state.entries=[];state.dismissed.clear();state.expanded=false;state.drag=null;
        host.style.removeProperty('--notice-lift');
        list.replaceChildren();
      }
      const records=notices.filter(record=>!state.dismissed.has(record));
      if(records.length===state.entries.length&&records.every((record,index)=>record===state.entries[index])){
        host.hidden=!records.length;
        return;
      }
      const previous=new Map(state.entries.map((record,index)=>[record,list.children[index]]));
      const before=positions();
      for (const [index,record] of records.entries()) {
        let row=previous.get(record);
        if(!row){
          row=document.createElement('div');
          row.className='notice-stack-card';
          row.setAttribute('role','listitem');
          row.innerHTML=`<div class="notice-stack-surface">${markup(record)}</div>`;
        }
        if(list.children[index]!==row)list.insertBefore(row,list.children[index]||null);
      }
      while(list.children.length>records.length)list.lastElementChild.remove();
      state.entries=records;
      sync();animateFrom(before);
    };

    host.addEventListener('click',event=>{
      if(state.skipClick&&event.detail){
        event.stopPropagation();event.preventDefault();return;
      }
      const row=event.target.closest('.notice-stack-card');
      if(event.target===toggle)expand(!state.expanded);
      else if(row&&!state.expanded)expand(true);
    });
    host.addEventListener('wheel',event=>{
      if(!state.expanded&&event.deltaY&&list.children.length>1){event.preventDefault();expand(true)}
    },{passive:false});
    host.addEventListener('pointerdown',event=>{
      const row=event.target.closest('.notice-stack-card');
      if(state.drag||!row||row.hasAttribute('data-leaving')||event.button!==0||!event.isPrimary)return;
      state.skipClick=false;
      state.drag={id:event.pointerId,row,surface:row.firstElementChild,x:event.clientX,y:event.clientY,
        scroll:list.scrollTop,at:performance.now(),axis:null};
    });
    host.addEventListener('pointermove',event=>{
      const drag=state.drag;
      if(!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.axis){
        if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;
        drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
        host.setPointerCapture(event.pointerId);
      }
      if(drag.axis==='x'){
        drag.surface.style.transform=`translateX(${dx}px) rotate(${Math.max(-5,Math.min(5,dx/32))}deg)`;
        drag.surface.style.opacity=String(Math.max(.38,1-Math.abs(dx)/(list.clientWidth*1.15)));
      }else if(state.expanded)list.scrollTop=drag.scroll-dy;
      else if(dy<0)host.style.setProperty('--notice-lift',`${Math.min(26,-dy*.42)}px`);
    });
    function end(event,cancelled) {
      const drag=state.drag;
      if(!drag||event.pointerId!==drag.id)return;
      state.drag=null;
      if(!drag.axis)return;
      state.skipClick=true;
      setTimeout(()=>{state.skipClick=false},0);
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      const opening=drag.axis==='y'&&!cancelled&&dy<-24&&!state.expanded;
      const before=opening?positions():undefined;
      host.style.removeProperty('--notice-lift');
      if(drag.axis==='x'){
        const fast=performance.now()-drag.at<220 && Math.abs(dx)>42;
        if(!cancelled&&(Math.abs(dx)>list.clientWidth*.3||fast)){dismiss(drag.row,Math.sign(dx));return}
        const from={transform:getComputedStyle(drag.surface).transform,opacity:getComputedStyle(drag.surface).opacity};
        settle(drag.surface);
        if(!reduced.matches)drag.surface.animate([from,{transform:'none',opacity:1}],{duration:220,easing});
      } else if(opening)expand(true,before);
      else if(!cancelled&&dy>45&&state.expanded&&drag.scroll===0)expand(false);
    }
    host.addEventListener('pointerup',event=>end(event,false));
    host.addEventListener('pointercancel',event=>end(event,true));
    host.addEventListener('lostpointercapture',event=>{if(event.target===host)end(event,true)});
    host.addEventListener('pointerleave',event=>{if(!state.drag?.axis)end(event,true)});
    return state;
  }

  return {render(host,story,records,markup){(stacks.get(host)||mount(host)).update(story,records,markup)}};
})();
