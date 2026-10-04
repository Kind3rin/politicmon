// Review-only interaction states. No game state, storage, combat or network imports.
const detail=document.querySelector('#detail');
const showDetail=title=>{detail.querySelector('h2').textContent=title;detail.showModal()};
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.dataset.link)location.href=b.dataset.link;
 if(b.hasAttribute('data-close'))location.href='esplorazione.html';
 if(b.hasAttribute('data-collapse'))b.classList.toggle('folded');
 if(b.hasAttribute('data-run')){b.classList.toggle('active');b.style.background=b.classList.contains('active')?'var(--yellow)':'';b.setAttribute('aria-label',b.classList.contains('active')?'Disattiva corsa':'Attiva corsa')}
 if(b.dataset.tab){document.querySelectorAll('.tab-page').forEach(p=>p.hidden=p.id!==b.dataset.tab);b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b))}
 if(b.hasAttribute('data-bag-tab')||b.hasAttribute('data-map-tab')){b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b))}
 if(b.dataset.item){const s=document.querySelector('#item-sheet');s.querySelector('h2').textContent=b.dataset.item+' del bar sport';s.hidden=false}
 if(b.hasAttribute('data-place'))document.querySelector('#place-sheet').hidden=false;
 if(b.hasAttribute('data-dismiss')){document.querySelectorAll('.sheet-shade').forEach(s=>s.hidden=true);detail.close()}
 if(b.dataset.detail)showDetail(b.dataset.detail);
 if(b.hasAttribute('data-recipient')&&!b.classList.contains('unavailable')){document.querySelector('#item-sheet').hidden=true;showDetail('Cura applicata')}
 if(b.hasAttribute('data-choice')){document.querySelector('.dialog-box p').textContent='«Meno tasse. Più…» Tre parole. È già campagna elettorale.';document.querySelector('.dialog-choices').hidden=true}
 if(b.hasAttribute('data-zoom'))document.querySelector('.map-world').style.scale=document.querySelector('.map-world').style.scale==='0.6'?'1':'0.6';
});
let hold;document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',()=>hold=setTimeout(()=>showDetail(b.dataset.move),450));['pointerup','pointercancel','pointerleave'].forEach(e=>b.addEventListener(e,()=>clearTimeout(hold)));b.addEventListener('contextmenu',e=>{e.preventDefault();showDetail(b.dataset.move)})});
const atlas=document.querySelector('.map-world');
if(atlas){let origin;atlas.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;origin={x:e.clientX,y:e.clientY,left:atlas.offsetLeft,top:atlas.offsetTop};atlas.setPointerCapture(e.pointerId)});atlas.addEventListener('pointermove',e=>{if(!origin)return;atlas.style.left=origin.left+e.clientX-origin.x+'px';atlas.style.top=origin.top+e.clientY-origin.y+'px'});atlas.addEventListener('pointerup',()=>origin=null);atlas.addEventListener('pointercancel',()=>origin=null)}
