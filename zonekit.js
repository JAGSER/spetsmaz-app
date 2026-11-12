// ZoneKit: редактор зон приближения (общий для приложения и большого редактора)
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const r4=v=>Math.round(v*10000)/10000;
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=t=>{t=Math.max(0,t||0);const m=Math.floor(t/60),s=(t%60).toFixed(1);return m+':'+(s<10?'0':'')+s};
function visRect(z){const s=Math.max(1,Math.min(8,1/z.w,1/z.h));const cx=z.x+z.w/2,cy=z.y+z.h/2;return{x:cl(cx-0.5/s,0,1-1/s),y:cl(cy-0.5/s,0,1-1/s),w:1/s,h:1/s,s}}
function hintPos(z){return{x:z.x+z.w-0.03,y:z.y+0.03}}
const CSS=`
.zk{display:flex;flex-direction:column;gap:10px;align-items:center;width:100%}
.zk-bar{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;width:100%}
.zk-b{padding:9px 14px;border-radius:12px;border:1.5px solid rgba(0,0,0,.12);background:#fff;color:#1d1b1a;font-weight:700;font-size:15px;cursor:pointer;line-height:1.2}
.zk-b:disabled{opacity:.4;cursor:default}
.zk-b.pri{background:#1d1b1a;color:#fff;border-color:#1d1b1a}
.zk-b.ok{background:#1E9E58;color:#fff;border-color:#1E9E58}
.zk-b.red{color:#c00}
.zk-b.sm{padding:6px 10px;font-size:14px;border-radius:9px}
.zk-fr{position:relative;aspect-ratio:3/4;width:100%;max-width:100%;background:#ddd;border-radius:16px;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:0 6px 20px rgba(0,0,0,.12)}
.zk-fr.cam{outline:4px solid #ffd400;outline-offset:-4px;cursor:grab}
.zk-md{position:absolute;inset:0;transform-origin:0 0}
.zk-md img,.zk-md video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.zk-ov{position:absolute;inset:0;cursor:crosshair}
.zk-zr{position:absolute;border:3px solid #fff;background:rgba(215,20,26,.2);box-shadow:0 0 0 1.5px rgba(0,0,0,.45);border-radius:6px;cursor:move}
.zk-zr.sel{border-color:#ffd400;background:rgba(255,212,0,.15)}
.zk-zr .n{position:absolute;left:5px;top:3px;font-weight:900;color:#fff;text-shadow:0 1px 3px #000;font-size:14px;pointer-events:none;white-space:nowrap}
.zk-h{position:absolute;width:26px;height:26px;background:#ffd400;border:2.5px solid #000;border-radius:50%;display:none;touch-action:none;z-index:2}
.zk-h::after{content:'';position:absolute;inset:-12px}
.zk-zr.sel .zk-h{display:block}
.zk-h.nw{left:-14px;top:-14px;cursor:nwse-resize}.zk-h.ne{right:-14px;top:-14px;cursor:nesw-resize}.zk-h.sw{left:-14px;bottom:-14px;cursor:nesw-resize}.zk-h.se{right:-14px;bottom:-14px;cursor:nwse-resize}
.zk-h.n{left:50%;top:-14px;margin-left:-13px;cursor:ns-resize;border-radius:8px}.zk-h.s{left:50%;bottom:-14px;margin-left:-13px;cursor:ns-resize;border-radius:8px}.zk-h.w{top:50%;left:-14px;margin-top:-13px;cursor:ew-resize;border-radius:8px}.zk-h.e{top:50%;right:-14px;margin-top:-13px;cursor:ew-resize;border-radius:8px}
.zk-vis{position:absolute;border:3px dashed #ffd400;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,.45);border-radius:4px}
.zk-vis b{position:absolute;left:4px;bottom:3px;background:#ffd400;color:#000;font-size:12px;font-weight:800;padding:1px 6px;border-radius:6px;white-space:nowrap}
.zk-vis.o{border:1.5px dashed rgba(255,255,255,.75);box-shadow:none}
.zk-pl{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(255,255,255,.95);display:grid;place-items:center;font-weight:900;font-size:18px;color:#D7141A;box-shadow:0 0 0 2px rgba(0,0,0,.35);cursor:grab;z-index:3;touch-action:none}
.zk-pl.sel{box-shadow:0 0 0 4px #ffd400,0 0 0 6px #000}
.zk-pl::after{content:'';position:absolute;inset:-10px}
.zk-camui{position:absolute;right:10px;bottom:10px;display:flex;flex-direction:column;gap:8px;z-index:4}
.zk-camui button{width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:26px;font-weight:700;display:grid;place-items:center;border:0;cursor:pointer}
.zk-camlab{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.62);color:#fff;font-weight:700;padding:5px 10px;border-radius:10px;font-size:14px;z-index:4;pointer-events:none}
.zk-help{font-size:14px;color:#776b67;text-align:center;line-height:1.4;max-width:560px}
.zk-vc{display:flex;align-items:center;gap:8px;width:100%}
.zk-vc input{flex:1}
.zk-vc span{font-variant-numeric:tabular-nums;color:#776b67;font-size:13px;min-width:84px;text-align:right}
.zk-list{display:flex;flex-direction:column;gap:10px;width:100%}
.zk-list h3{font-size:17px;margin:0}
.zk-card{background:#faf6f4;border:1.5px solid rgba(0,0,0,.1);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px}
.zk-card.sel{border-color:#e0b800;background:#fffbe6}
.zk-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.zk-num{width:28px;height:28px;border-radius:50%;background:#D7141A;color:#fff;font-weight:900;display:grid;place-items:center;flex:none;font-size:14px}
.zk-card input[type=text]{flex:1;min-width:0;padding:8px 10px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;background:#fff;font-size:15px}
.zk-card input[type=number]{width:72px;padding:6px 8px;border:1.5px solid rgba(0,0,0,.12);border-radius:9px}
.zk-prev{position:relative;width:84px;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:#ddd;flex:none;border:2px solid rgba(0,0,0,.12);cursor:pointer}
.zk-prev .pi{position:absolute}.zk-prev img{width:100%;height:100%;object-fit:cover;display:block}
.zk-sm{font-size:13px;color:#776b67}
body.mood .zk-num{background:#1E9E58}
body.mood .zk-pl{color:#1E9E58}
`;
function css(){if(document.getElementById('zk-css'))return;const s=document.createElement('style');s.id='zk-css';s.textContent=CSS;document.head.appendChild(s)}

function mount(root,o){css();
 const K={zones:JSON.parse(JSON.stringify(o.zones||[])),sel:-1,cam:null,hist:[],listEl:o.listEl||null};
 const m=o.media;const isVid=m.type==='video';
 const prevSrc=m.type==='image'?m.src:(m.poster||'');
 const changed=()=>{o.onChange&&o.onChange(JSON.parse(JSON.stringify(K.zones)))};
 const snap=()=>{K.hist.push(JSON.stringify(K.zones));if(K.hist.length>60)K.hist.shift()};
 root.classList.add('zk');
 let fr,ov,md,vid;

 function render(){const c=K.cam;
  root.innerHTML=`${c?'':`<div class="zk-bar"><button class="zk-b pri" data-zka="camnew">🔍 Приблизить и сохранить вид</button><button class="zk-b" data-zka="undo" ${K.hist.length?'':'disabled'}>↶ Отменить</button></div>`}
  <div class="zk-fr ${c?'cam':''}" ${o.frameStyle?`style="${o.frameStyle}"`:''}><div class="zk-md">${m.type==='image'?`<img src="${esc(m.full||m.src)}" alt="">`:`<video src="${esc(m.src)}" poster="${esc(m.poster||'')}" muted loop playsinline autoplay></video>`}</div>
   ${c?`<div class="zk-camlab"></div><div class="zk-camui"><button data-zka="zin">+</button><button data-zka="zout">−</button></div>`:'<div class="zk-ov"></div>'}</div>
  ${isVid?`<div class="zk-vc"><button class="zk-b sm" data-zka="vplay">⏸</button><input type="range" min="0" max="1000" value="0"><span>0:00.0</span></div>`:''}
  ${c?`<div class="zk-bar">${c.i<0?`<button class="zk-b ok" data-zka="camsave">💾 Сохранить эту зону</button>`:`<button class="zk-b ok" data-zka="camsave">✓ Сохранить зону ${c.i+1}</button><button class="zk-b" data-zka="camsavenew">＋ Сохранить как новую</button>`}<button class="zk-b" data-zka="camcancel">Готово</button></div>
   <div class="zk-help">Приблизьте и сдвиньте картинку так, как человек должен её увидеть: пальцем двигать, щипком или кнопками +/− менять увеличение. Потом нажмите «Сохранить», можно сразу двигать дальше и сохранять следующую зону.</div>`:
   `<div class="zk-help">Приблизьте картинку кнопкой «🔍» и сохраните вид как зону, или нарисуйте зону пальцем прямо на картинке. Зону можно двигать и тянуть за жёлтые ручки.</div>`}
  ${K.listEl?'':'<div class="zk-list"></div>'}`;
  fr=root.querySelector('.zk-fr');ov=root.querySelector('.zk-ov');md=root.querySelector('.zk-md');vid=md.querySelector('video');
  if(vid)bindVid();
  if(c)bindCam();else{bindDraw();drawOv()}
  renderList()}

 function bindVid(){const r=root.querySelector('.zk-vc input'),t=root.querySelector('.zk-vc span');let sk=false;
  vid.addEventListener('timeupdate',()=>{if(!sk&&vid.duration)r.value=vid.currentTime/vid.duration*1000;t.textContent=fmt(vid.currentTime)+' / '+fmt(vid.duration)});
  r.addEventListener('input',()=>{sk=true;if(vid.duration)vid.currentTime=r.value/1000*vid.duration});r.addEventListener('change',()=>sk=false)}

 // ----- рисование -----
 function updBar(){const b=root.querySelector('[data-zka="camnew"]');if(b)b.textContent=K.sel>=0&&K.zones[K.sel]?'🔍 Приблизить зону '+(K.sel+1):'🔍 Приблизить и сохранить вид'}
 function drawOv(){updBar();if(!ov)return;const zs=K.zones;
  ov.innerHTML=zs.map((z,i)=>`<div class="zk-zr ${i===K.sel?'sel':''}" data-z="${i}" style="left:${z.x*100}%;top:${z.y*100}%;width:${z.w*100}%;height:${z.h*100}%"><span class="n">${i+1}${z.label?'. '+esc(z.label):''}</span>${['nw','ne','sw','se','n','s','w','e'].map(h=>`<i class="zk-h ${h}" data-h="${h}"></i>`).join('')}</div>`).join('')+
  zs.map((z,i)=>{if(i===K.sel)return'';const v=visRect(z);return `<div class="zk-vis o" style="left:${v.x*100}%;top:${v.y*100}%;width:${v.w*100}%;height:${v.h*100}%"></div>`}).join('')+
  (K.sel>=0&&zs[K.sel]?(()=>{const v=visRect(zs[K.sel]);return `<div class="zk-vis" style="left:${v.x*100}%;top:${v.y*100}%;width:${v.w*100}%;height:${v.h*100}%"><b>Будет видно ×${v.s.toFixed(1)}</b></div>`})():'')}
 function bindDraw(){let act=null;
  const pos=e=>{const r=ov.getBoundingClientRect();return{x:cl((e.clientX-r.left)/r.width,0,1),y:cl((e.clientY-r.top)/r.height,0,1)}};
  ov.addEventListener('pointerdown',e=>{e.preventDefault();const p=pos(e);const zs=K.zones;const pl=null;const h=e.target.dataset.h;const zEl=e.target.closest('.zk-zr');snap();
   if(pl){const i=+pl.dataset.pl;K.sel=i;act={type:'pl',i,p0:p,h0:hintPos(zs[i])}}
   else if(zEl){const i=+zEl.dataset.z;K.sel=i;act={type:h||'move',i,p0:p,z0:Object.assign({},zs[i])}}
   else{act={type:'new',p0:p};K.sel=-1}
   ov.setPointerCapture(e.pointerId);drawOv();renderList()});
  ov.addEventListener('pointermove',e=>{if(!act)return;const p=pos(e);const zs=K.zones;
   if(act.type==='pl'){const z=zs[act.i];z.hx=r4(cl(act.h0.x+p.x-act.p0.x,.02,.98));z.hy=r4(cl(act.h0.y+p.y-act.p0.y,.02,.98))}
   else if(act.type==='new'){const z={x:Math.min(p.x,act.p0.x),y:Math.min(p.y,act.p0.y),w:Math.abs(p.x-act.p0.x),h:Math.abs(p.y-act.p0.y)};
    if(act.i==null){if(z.w<.02&&z.h<.02)return;zs.push(Object.assign(z,{label:''}));act.i=zs.length-1;K.sel=act.i}else Object.assign(zs[act.i],z)}
   else{const z0=act.z0,dx=p.x-act.p0.x,dy=p.y-act.p0.y,z=zs[act.i];
    if(act.type==='move'){const nx=cl(z0.x+dx,0,1-z0.w),ny=cl(z0.y+dy,0,1-z0.h);if(z0.hx!=null){z.hx=r4(cl(z0.hx+nx-z0.x,.02,.98));z.hy=r4(cl(z0.hy+ny-z0.y,.02,.98))}z.x=nx;z.y=ny}
    else{let x1=z0.x,y1=z0.y,x2=z0.x+z0.w,y2=z0.y+z0.h;const t=act.type;if(t.includes('w'))x1=cl(x1+dx,0,x2-.03);if(t.includes('e'))x2=cl(x2+dx,x1+.03,1);if(t.includes('n'))y1=cl(y1+dy,0,y2-.03);if(t.includes('s'))y2=cl(y2+dy,y1+.03,1);Object.assign(z,{x:x1,y:y1,w:x2-x1,h:y2-y1})}}
   drawOv()});
  const end=()=>{if(!act)return;const zs=K.zones;
   if(act.type==='new'&&act.i==null)K.hist.pop();
   if(act.type==='new'&&act.i!=null){const z=zs[act.i];if(z.w<.03||z.h<.03){zs.splice(act.i,1);K.sel=-1}}
   zs.forEach(z=>{z.x=r4(z.x);z.y=r4(z.y);z.w=r4(z.w);z.h=r4(z.h)});act=null;drawOv();renderList();changed();updUndo()};
  ov.addEventListener('pointerup',end);ov.addEventListener('pointercancel',end)}
 function updUndo(){const b=root.querySelector('[data-zka="undo"]');if(b)b.disabled=!K.hist.length}

 // ----- приближение -----
 function bindCam(){const c=K.cam;const pts=new Map();let g0=null;
  const apply=()=>{const W=fr.clientWidth,H=fr.clientHeight;md.style.transform=`translate(${-c.x*W*c.s}px,${-c.y*H*c.s}px) scale(${c.s})`;const l=root.querySelector('.zk-camlab');if(l)l.textContent=(c.i<0?'Новая зона':'Зона '+(c.i+1))+' · ×'+c.s.toFixed(1)};
  const setS=s=>{s=cl(s,1,8);const cx=c.x+.5/c.s,cy=c.y+.5/c.s;c.s=s;c.x=cl(cx-.5/s,0,1-1/s);c.y=cl(cy-.5/s,0,1-1/s);apply()};
  K.zoom=k=>setS(c.s*k);
  const reset=()=>{g0={c:{...c},pts:new Map([...pts].map(([k,p])=>[k,{...p}]))}};
  fr.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;e.preventDefault();fr.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});reset()});
  fr.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)||!g0)return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const W=fr.clientWidth,H=fr.clientHeight,c0=g0.c;
   const ids=[...pts.keys()].filter(k=>g0.pts.has(k));
   if(ids.length>=2){const[a,b]=ids;const d0=Math.hypot(g0.pts.get(a).x-g0.pts.get(b).x,g0.pts.get(a).y-g0.pts.get(b).y),d1=Math.hypot(pts.get(a).x-pts.get(b).x,pts.get(a).y-pts.get(b).y);if(d0>10){Object.assign(c,c0);setS(c0.s*d1/d0)}}
   else if(ids.length===1){const k=ids[0];const dx=pts.get(k).x-g0.pts.get(k).x,dy=pts.get(k).y-g0.pts.get(k).y;c.x=cl(c0.x-dx/W/c0.s,0,1-1/c0.s);c.y=cl(c0.y-dy/H/c0.s,0,1-1/c0.s);apply()}});
  const up=e=>{pts.delete(e.pointerId);reset()};fr.addEventListener('pointerup',up);fr.addEventListener('pointercancel',up);
  fr.addEventListener('wheel',e=>{e.preventDefault();K.zoom(e.deltaY<0?1.12:1/1.12)},{passive:false});
  requestAnimationFrame(apply)}
 function camZone(){const c=K.cam;const w=r4(1/c.s);return{x:r4(c.x),y:r4(c.y),w,h:w}}

 // ----- список -----
 function setPrev(el,z){const v=visRect(z);const pi=el.querySelector('.pi');Object.assign(pi.style,{width:100/v.w+'%',height:100/v.h+'%',left:-v.x/v.w*100+'%',top:-v.y/v.h*100+'%'})}
 function renderList(){const L=K.listEl||root.querySelector('.zk-list');if(!L)return;const zs=K.zones;
  L.innerHTML=`<h3>Зоны: ${zs.length}</h3>${zs.length?'':'<div class="zk-sm">Зон нет: в приложении будет обычное приближение в точку нажатия.</div>'}
  ${zs.map((z,i)=>{const v=visRect(z);return `<div class="zk-card ${i===K.sel?'sel':''}" data-zcard="${i}">
   <div class="zk-row"><span class="zk-num">${i+1}</span><input type="text" data-zlab="${i}" value="${esc(z.label||'')}" placeholder="Подпись (для себя)"></div>
   <div class="zk-row" style="align-items:flex-start;flex-wrap:nowrap"><div class="zk-prev" data-zka="sel" data-zi="${i}"><div class="pi"><img src="${esc(prevSrc)}" alt=""></div></div>
    <div style="display:flex;flex-direction:column;gap:6px"><div class="zk-sm">Так увидит человек.<br>Увеличение ×${v.s.toFixed(1)}</div>
    <div class="zk-row"><button class="zk-b sm" data-zka="up" data-zi="${i}" ${i?'':'disabled'}>↑</button><button class="zk-b sm" data-zka="down" data-zi="${i}" ${i<zs.length-1?'':'disabled'}>↓</button><button class="zk-b sm" data-zka="dup" data-zi="${i}" title="Копия">⧉</button></div></div></div>
   ${isVid?`<div class="zk-row zk-sm">С <input type="number" step="0.1" min="0" data-zt1="${i}" value="${z.t1==null?'':z.t1}" placeholder="нач."> по <input type="number" step="0.1" min="0" data-zt2="${i}" value="${z.t2==null?'':z.t2}" placeholder="конец"> сек</div>
    <div class="zk-row"><button class="zk-b sm" data-zka="now1" data-zi="${i}">⏱ Начало = сейчас</button><button class="zk-b sm" data-zka="now2" data-zi="${i}">⏱ Конец = сейчас</button></div>`:''}
   <div class="zk-row"><button class="zk-b sm" data-zka="camedit" data-zi="${i}">🔍 Изменить приближением</button><button class="zk-b sm" data-zka="fit" data-zi="${i}">📱 Под экран</button><button class="zk-b sm red" data-zka="del" data-zi="${i}">🗑</button></div></div>`}).join('')}`;
  L.querySelectorAll('.zk-prev').forEach(el=>{const z=zs[+el.dataset.zi];if(z)setPrev(el,z)})}

 // ----- кнопки -----
 function onClick(e){const b=e.target.closest('[data-zka]');const card=e.target.closest('[data-zcard]');
  if(!b){if(card&&!e.target.closest('input')&&!K.cam){K.sel=+card.dataset.zcard;drawOv();renderList()}return}
  e.preventDefault();e.stopPropagation();const a=b.dataset.zka,i=+b.dataset.zi,zs=K.zones;
  if(a==='camnew'){if(K.sel>=0&&zs[K.sel]){const v=visRect(zs[K.sel]);K.cam={i:K.sel,x:v.x,y:v.y,s:v.s}}else K.cam={i:-1,x:0,y:0,s:1};render()}
  else if(a==='camedit'){const v=visRect(zs[i]);K.cam={i,x:v.x,y:v.y,s:v.s};K.sel=i;render();fr.scrollIntoView({block:'center',behavior:'smooth'})}
  else if(a==='zin')K.zoom&&K.zoom(1.25);
  else if(a==='zout')K.zoom&&K.zoom(0.8);
  else if(a==='camsave'||a==='camsavenew'){snap();const nz=camZone();if(K.cam.i>=0&&a==='camsave'){const z=zs[K.cam.i];Object.assign(z,nz);delete z.hx;delete z.hy;K.sel=K.cam.i}else{zs.push(Object.assign(nz,{label:''}));K.sel=zs.length-1}const n=K.sel+1;K.cam.i=-1;render();changed();const l=root.querySelector('.zk-camlab');if(l){l.textContent='✓ Зона '+n+' сохранена';l.style.background='#1E9E58';setTimeout(()=>{if(l.isConnected){l.style.background='';K.zoom&&K.zoom(1)}},1400)}o.onSaved&&o.onSaved()}
  else if(a==='camcancel'){K.cam=null;render()}
  else if(a==='undo'){if(!K.hist.length)return;K.zones=JSON.parse(K.hist.pop());K.sel=-1;render();changed()}
  else if(a==='sel'){K.sel=i;if(!K.cam){drawOv();renderList()}}
  else if(a==='up'||a==='down'){snap();const j=i+(a==='up'?-1:1);[zs[i],zs[j]]=[zs[j],zs[i]];K.sel=j;drawOv();renderList();changed();updUndo()}
  else if(a==='dup'){snap();const z=JSON.parse(JSON.stringify(zs[i]));z.x=r4(Math.min(1-z.w,z.x+.04));z.y=r4(Math.min(1-z.h,z.y+.04));if(z.hx!=null){z.hx=r4(Math.min(.98,z.hx+.04));z.hy=r4(Math.min(.98,z.hy+.04))}zs.splice(i+1,0,z);K.sel=i+1;drawOv();renderList();changed();updUndo()}
  else if(a==='del'){snap();zs.splice(i,1);K.sel=-1;drawOv();renderList();changed();updUndo()}
  else if(a==='fit'){snap();const v=visRect(zs[i]);Object.assign(zs[i],{x:r4(v.x),y:r4(v.y),w:r4(v.w),h:r4(v.h)});K.sel=i;drawOv();renderList();changed();updUndo()}
  else if(a==='plreset'){snap();zs[i].hx=r4(zs[i].x+zs[i].w/2);zs[i].hy=r4(zs[i].y+zs[i].h/2);K.sel=i;drawOv();changed();updUndo()}
  else if(a==='now1'||a==='now2'){if(!vid)return;zs[i][a==='now1'?'t1':'t2']=+vid.currentTime.toFixed(1);renderList();changed()}
  else if(a==='vplay'){if(!vid)return;if(vid.paused){vid.play();b.textContent='⏸'}else{vid.pause();b.textContent='▶'}}}
 function onInput(e){const d=e.target.dataset,zs=K.zones;
  if(d.zlab!==undefined){zs[+d.zlab].label=e.target.value;const n=ov&&ov.querySelector(`.zk-zr[data-z="${d.zlab}"] .n`);if(n)n.textContent=(+d.zlab+1)+(e.target.value?'. '+e.target.value:'');changed()}
  else if(d.zt1!==undefined||d.zt2!==undefined){const i=+(d.zt1??d.zt2);const v=e.target.value;zs[i][d.zt1!==undefined?'t1':'t2']=v===''?null:+v;changed()}}
 const bindRoot=el=>{el.addEventListener('click',onClick);el.addEventListener('input',onInput)};
 bindRoot(root);if(K.listEl)bindRoot(K.listEl);
 render();
 return{get zones(){return JSON.parse(JSON.stringify(K.zones))},
  attachList(el){if(K.listEl===el)return;K.listEl=el;bindRoot(el);renderList()},
  video(){return vid},inCam(){return !!K.cam}};
}
window.ZoneKit={mount,visRect,hintPos};
})();
