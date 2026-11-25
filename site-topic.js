(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 for(const card of document.querySelectorAll('.glow-card')){
  card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;card.style.setProperty('--gx',x+'px');card.style.setProperty('--gy',y+'px');card.style.setProperty('--glow',String(Math.max(.15,1-Math.min(x,y,r.width-x,r.height-y)/100)));});
  card.addEventListener('pointerleave',()=>card.style.setProperty('--glow','0'));
 }
 const entries=[...document.querySelectorAll('.guide-entry')],links=[...document.querySelectorAll('.guide-nav a')];
 const active=id=>links.forEach(a=>a.toggleAttribute('aria-current',a.hash==='#'+id));
 if(entries.length){
  const observer=new IntersectionObserver(items=>{const first=items.filter(i=>i.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(first)active(first.target.id);},{rootMargin:'-10% 0px -65% 0px'});entries.forEach(el=>observer.observe(el));
  links.forEach(a=>a.addEventListener('click',()=>{active(a.hash.slice(1));const el=document.getElementById(a.hash.slice(1));if(!reduced.matches)el?.animate([{transform:'translateY(8px)',opacity:.65},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.22,1.2,.36,1)'});}));
  document.querySelector('#guide-search').addEventListener('input',e=>{const q=e.target.value.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');let count=0;entries.forEach((el,i)=>{const match=el.dataset.search.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').includes(q);el.hidden=!match;links[i].hidden=!match;if(match)count++;});document.querySelector('#guide-empty').hidden=!!count;});
 }
 document.querySelector('#copy-report')?.addEventListener('click',async()=>{const text=SiteLanguage.text('Descrição:\nNavegador e dispositivo:\nPassos para reproduzir:\nResultado observado:\nResultado esperado:\n','Description:\nBrowser and device:\nSteps to reproduce:\nObserved result:\nExpected result:\n');try{await navigator.clipboard.writeText(text);document.querySelector('#report-status').textContent=SiteLanguage.text('Modelo copiado.','Template copied.');}catch{document.querySelector('#report-status').textContent=text;}});
})();
