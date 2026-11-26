const EditorUndo = (() => {
  let pending, bar;
  const tr = SiteLanguage.text;

  function sync() {
    if (!pending || pending.story !== S) {
      pending = null;
      if (bar?.matches(':popover-open')) bar.hidePopover();
      if (bar) bar.hidden = true;
      return;
    }
    const parent = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body;
    if (bar.parentElement !== parent) parent.append(bar);
    bar.hidden = false;
    if (bar.showPopover && !bar.matches(':popover-open')) bar.showPopover();
  }

  function redraw(after) {
    const selector = '#app :is(#mi,#third-input,#ig-dm-input)';
    const composer = document.querySelector(selector);
    const value = composer?.value;
    const app = cur;
    save();R();
    const next = document.querySelector(selector);
    if (next && app===cur && next.id===composer?.id) {
      next.value=value;
      if (next.id==='mi') msgGlassInput(next);
    }
    after?.();
  }

  function notify({pt,en},restore,after) {
    if (readerMode) return;
    if (!bar) {
      bar = document.createElement('div');
      bar.className='editor-undo';
      if (bar.showPopover) bar.setAttribute('popover','manual');
      bar.innerHTML=`<span role="status"></span><button type="button">${tr('Desfazer','Undo')}</button>
        <button type="button" aria-label="${tr('Dispensar aviso','Dismiss notification')}">×</button>`;
      bar.children[1].addEventListener('click',()=>{
        const action=pending;
        pending=null;sync();
        if (!action || action.story!==S || action.restore()===false) return;
        redraw(action.after);
      });
      bar.children[2].addEventListener('click',()=>{pending=null;sync()});
      new MutationObserver(records=>{
        if (pending && records.some(record=>record.target.tagName==='DIALOG')) sync();
      }).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
    }
    pending={story:S,restore,after};
    sync();
    bar.firstElementChild.textContent=tr(pt,en);
  }

  function remove(items,index,label,valid=()=>true,after) {
    if (readerMode || !Array.isArray(items) || !Number.isInteger(index) || index<0 || index>=items.length) return false;
    const previous=items[index-1],next=items[index+1],hadPrevious=index>0,hadNext=index+1<items.length;
    const [item]=items.splice(index,1);
    notify(label,()=>{
      if (!valid()) return false;
      const previousIndex=hadPrevious ? items.indexOf(previous) : -1;
      const nextIndex=hadNext ? items.indexOf(next) : -1;
      items.splice(nextIndex>=0?nextIndex:previousIndex>=0?previousIndex+1:Math.min(index,items.length),0,item);
    },after);
    return true;
  }

  function property(object,key) { return {value:object[key],present:Object.hasOwn(object,key)}; }
  function same(a,b) { return a.present===b.present && Object.is(a.value,b.value); }
  function restoreProperty(object,key,before) {
    if(before.present)object[key]=before.value;
    else delete object[key];
  }

  function edit(label,targets,valid,apply) {
    if (readerMode) return;
    const fields=targets.flatMap(([object,keys,check])=>keys.map(key=>({object,key,check,before:property(object,key)})));
    apply();
    const changes=fields.map(field=>({...field,after:property(field.object,field.key)}))
      .filter(field=>!same(field.before,field.after));
    if (!changes.length) return;
    notify(label,()=>{
      if (!valid()) return false;
      for (const {object,key,check,before,after} of changes) {
        if ((!check||check()) && same(after,property(object,key))) restoreProperty(object,key,before);
      }
    });
  }

  function appendTime(chat,ts,valid) {
    const marker={m:2,ts};
    const previous=property(chat,'cursor');
    chat.msgs.push(marker);chat.cursor=ts;
    notify({pt:'Marcador adicionado.',en:'Time marker added.'},()=>{
      const index=chat.msgs.indexOf(marker);
      if (!valid() || index<0) return false;
      if (chat.msgs.at(-1)===marker && chat.cursor===ts) restoreProperty(chat,'cursor',previous);
      chat.msgs.splice(index,1);
    });
  }

  return {sync,remove,edit,appendTime};
})();
