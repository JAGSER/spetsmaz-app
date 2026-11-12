/* Шустрые три в ряд v3: уровни, звёзды, лёд, бонусы, комбо особых фишек */
(function(){
'use strict';
const N=7,T=6;
const COL=['#a66bff','#25a9ff','#ff3b6b','#ffa21a','#6fd24f','#6b3a1f'];
const BOT=[1,0,1,1,0,1];
const GOALS=[0,1];
const COMBO=['','','Сочно!','Вкусно!','Шустро!','Бомба!','Невероятно!','Легенда!'];
const src=t=>'game/t'+t+'.png?v=1';
[...Array(T)].forEach((_,t)=>{const i=new Image();i.src=src(t)});
const rnd=n=>Math.floor(Math.random()*n);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ID=1,G=null,B=null,stage=null,ROOT=null,S=0,E={},cv=null,cx=null,P=[],raf=0,hintT=0;

/* ---------- уровни ---------- */
function LV(n){const moves=Math.max(15,24-Math.floor((n-1)/3));const need=Math.min(28,8+Math.round((n-1)*1.4));
 const ice=n<3?0:Math.min(22,4+(n-3)*2),ice2=n<9?0:Math.min(14,(n-8)*2);
 const s2=Math.round(1000+n*170),s3=Math.round(s2*1.45);return{n,moves,need,ice,ice2,s2,s3}}

/* ---------- звук ---------- */
let AC=null,MUTE=false;try{MUTE=localStorage.getItem('m3mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d,{type='sine',v=.25,to=null,at=0,att=.005}={}){const a=ac();if(!a||MUTE)return;const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.05)}
function noise(d,{v=.3,f=1200,q=1,to=null,at=0,type='bandpass'}={}){const a=ac();if(!a||MUTE)return;const t=a.currentTime+at,n=Math.floor(a.sampleRate*d),bf=a.createBuffer(1,n,a.sampleRate),ch=bf.getChannelData(0);for(let i=0;i<n;i++)ch[i]=Math.random()*2-1;const sr=a.createBufferSource();sr.buffer=bf;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+d);fl.Q.value=q;const g=a.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);sr.connect(fl).connect(g).connect(a.destination);sr.start(t);sr.stop(t+d)}
const SND={
 swap(){noise(.16,{v:.18,f:600,to:2400,q:2})},
 bad(){tone(220,.12,{type:'square',v:.08});tone(180,.16,{type:'square',v:.08,at:.11})},
 pop(c){const b=420*Math.pow(1.12,Math.min(c,9));tone(b,.14,{v:.3,to:b*1.8});tone(b*1.5,.1,{type:'triangle',v:.12,at:.03,to:b*2.6});noise(.08,{v:.08,f:4000,q:.7})},
 make(){[523,659,784,1047].forEach((f,k)=>tone(f,.18,{type:'triangle',v:.18,at:k*.06}))},
 beam(){tone(1800,.4,{type:'sawtooth',v:.09,to:120});noise(.35,{v:.15,f:3000,to:300,q:1.5})},
 boom(){tone(120,.5,{v:.5,to:35});noise(.5,{v:.45,f:900,to:80,q:.6,type:'lowpass'})},
 zap(){for(let k=0;k<6;k++)tone(900+Math.random()*900,.07,{type:'square',v:.06,at:k*.05,to:200});tone(200,.6,{type:'sawtooth',v:.1,to:1600})},
 coin(){tone(1318,.09,{type:'square',v:.06});tone(1760,.2,{type:'square',v:.06,at:.08})},
 land(){noise(.05,{v:.06,f:250,q:.8,type:'lowpass'})},
 ice(){noise(.18,{v:.25,f:5200,q:3});tone(2400,.12,{type:'triangle',v:.08,to:900})},
 hammer(){tone(90,.3,{v:.5,to:40});noise(.2,{v:.35,f:600,q:.8,type:'lowpass'})},
 star(k){tone(880*Math.pow(1.26,k),.35,{type:'triangle',v:.2});tone(1760*Math.pow(1.26,k),.25,{v:.08,at:.05})},
 goal(){[784,988,1175,1568].forEach((f,k)=>tone(f,.25,{type:'triangle',v:.16,at:k*.09}))},
 win(){[523,659,784,1047,784,1047,1319].forEach((f,k)=>tone(f,.3,{type:'triangle',v:.18,at:k*.12}));noise(1,{v:.06,f:6000,q:.5,at:.2})},
 lose(){[392,349,311,262].forEach((f,k)=>tone(f,.3,{type:'triangle',v:.15,at:k*.18}))},
 shuffle(){for(let k=0;k<8;k++)noise(.06,{v:.1,f:1500+k*300,q:3,at:k*.05})}};

/* ---------- модель ---------- */
const tile=(t,sp='')=>({id:ID++,t,sp});
function fresh(){for(;;){const c=[];for(let i=0;i<N*N;i++){let t;do{t=rnd(T)}while((i%N>=2&&c[i-1].t===t&&c[i-2].t===t)||(i>=2*N&&c[i-N].t===t&&c[i-2*N].t===t));c.push(tile(t))}if(findMove(c))return c}}
function iceMap(L){const ice=Array(N*N).fill(0);const half=[];for(let r=1;r<N;r++)for(let x=0;x<=3;x++)half.push(r*N+x);
 let n=L.ice;while(n>0&&half.length){const i=half.splice(rnd(half.length),1)[0];const m=Math.floor(i/N)*N+(N-1-i%N);ice[i]=1;n--;if(m!==i&&n>0){ice[m]=1;n--}}
 let k=L.ice2;for(let i=0;i<N*N&&k>0;i++){const j=(i*17+5)%(N*N);if(ice[j]===1){ice[j]=2;k--}}return ice}
function runs(c){const R=[];const same=(a,b)=>a&&b&&a.t>=0&&a.t===b.t;
 for(let r=0;r<N;r++){let k=0;for(let x=1;x<=N;x++){if(x<N&&same(c[r*N+k],c[r*N+x]))continue;if(x-k>=3)R.push({d:'h',i:[...Array(x-k)].map((_,j)=>r*N+k+j)});k=x}}
 for(let x=0;x<N;x++){let k=0;for(let r=1;r<=N;r++){if(r<N&&same(c[k*N+x],c[r*N+x]))continue;if(r-k>=3)R.push({d:'v',i:[...Array(r-k)].map((_,j)=>(k+j)*N+x)});k=r}}
 return R}
function findMove(c){for(let i=0;i<N*N;i++)for(const j of [i%N<N-1?i+1:-1,i+N<N*N?i+N:-1]){if(j<0)continue;if(c[i].sp==='c'||c[j].sp==='c'||(c[i].sp&&c[j].sp))return[i,j];[c[i],c[j]]=[c[j],c[i]];const ok=runs(c).length>0;[c[i],c[j]]=[c[j],c[i]];if(ok)return[i,j]}return null}
function plan(R,pref){const clear=new Set(),make=[],used=new Set(),cnt={};
 R.forEach(r=>r.i.forEach(i=>{clear.add(i);cnt[i]=(cnt[i]||0)+1}));
 const pick=r=>{const p=pref.find(x=>r.i.includes(x));return p!==undefined?p:r.i[r.i.length>>1]};
 R.filter(r=>r.i.length>=5).forEach(r=>{const i=pick(r);if(!used.has(i)){make.push({i,t:-1,sp:'c'});used.add(i)}});
 Object.keys(cnt).filter(i=>cnt[i]>1).map(Number).forEach(i=>{if(!used.has(i)){make.push({i,t:G.c[i].t,sp:'b'});used.add(i)}});
 R.filter(r=>r.i.length===4).forEach(r=>{if(r.i.some(i=>used.has(i)))return;const i=pick(r);make.push({i,t:G.c[i].t,sp:r.d==='h'?'v':'h'});used.add(i)});
 return{clear,make}}
function topType(){const n=Array(T).fill(0);G.c.forEach(o=>{if(o&&o.t>=0)n[o.t]++});return n.indexOf(Math.max(...n))}
function area(i,rad){const r=Math.floor(i/N),x=i%N,a=[];for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){const rr=r+dr,cc=x+dc;if(rr>=0&&rr<N&&cc>=0&&cc<N)a.push(rr*N+cc)}return a}
function expand(clear){const q=[...clear],fx=[];
 while(q.length){const i=q.shift();const o=G.c[i];if(!o||!o.sp||o.fired)continue;o.fired=1;const r=Math.floor(i/N),x=i%N;let add=[];
  if(o.sp==='h'){for(let k=0;k<N;k++)add.push(r*N+k);fx.push({k:'h',i})}
  else if(o.sp==='v'){for(let k=0;k<N;k++)add.push(k*N+x);fx.push({k:'v',i})}
  else if(o.sp==='b'){add=area(i,1);fx.push({k:'b',i})}
  else if(o.sp==='c'){const t=o.target>=0?o.target:topType();G.c.forEach((p,j)=>{if(p&&p.t===t)add.push(j)});fx.push({k:'c',i,list:add.slice()})}
  add.forEach(j=>{if(!clear.has(j)){clear.add(j);q.push(j)}})}
 return fx}
const iceLeft=()=>G.ice.reduce((a,b)=>a+b,0);
const goalsDone=()=>GOALS.every(t=>G.got[t]>=G.L.need)&&iceLeft()===0;
function starsOf(){if(!goalsDone())return 0;return G.score>=G.L.s3?3:G.score>=G.L.s2?2:1}

/* ---------- отрисовка ---------- */
const xy=i=>[(i%N)*S,Math.floor(i/N)*S];
const tr=(x,y)=>`translate3d(${x}px,${y}px,0)`;
function inner(o){if(o.sp==='c')return`<div class="in orb"><i></i><b></b></div>`;return`<div class="in sp-${o.sp||'n'}" style="--c:${COL[o.t]}"><s class="pl"></s><img class="${BOT[o.t]?'bt':'mr'}" src="${src(o.t)}" alt="" draggable="false"></div>`}
function mk(o,i,row){const d=document.createElement('div');d.className='m3t';d.dataset.id=o.id;d.style.width=d.style.height=S+'px';d.innerHTML=inner(o);const[x]=xy(i);const y=(row!==undefined?row:Math.floor(i/N))*S;d.style.transform=tr(x,y);d.firstChild.style.animationDelay=(-Math.random()*3).toFixed(2)+'s';B.appendChild(d);E[o.id]=d;return d}
function refresh(o){const d=E[o.id];if(d){d.innerHTML=inner(o);d.firstChild.animate([{transform:'scale(.3) rotate(-90deg)'},{transform:'scale(1.35)',offset:.6},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.3,1.5,.5,1)'})}}
function move(o,i,ms,ease,delay=0){const d=E[o.id];if(!d)return;const[x,y]=xy(i);d.style.transition=`transform ${ms}ms ${ease||'cubic-bezier(.45,.05,.4,1.32)'} ${delay}ms`;d.style.transform=tr(x,y)}
function rectOf(i){const b=B.getBoundingClientRect();const k=b.width/(S*N);const[x,y]=xy(i);return{x:b.left+(x+S/2)*k,y:b.top+(y+S/2)*k}}
function drawIce(i){const c=B&&B.querySelector(`.m3c[data-i="${i}"]`);if(c)c.className='m3c'+(G.ice[i]===2?' ice2':G.ice[i]===1?' ice':'')}

/* ---------- частицы ---------- */
function fxCanvas(){if(cv&&document.body.contains(cv))return;cv=document.createElement('canvas');cv.className='m3fx';document.body.appendChild(cv);cx=cv.getContext('2d');size()}
function size(){if(!cv)return;const d=Math.min(2,devicePixelRatio||1);cv.width=innerWidth*d;cv.height=innerHeight*d;cx.setTransform(d,0,0,d,0,0)}
function burst(x,y,col,n=16,pow=1){for(let k=0;k<n;k++){const a=Math.random()*6.283,v=(2+Math.random()*5)*pow;P.push({k:Math.random()<.35?'star':'dot',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2.5*pow,g:.22,life:0,max:34+rnd(24),s:3+Math.random()*5*pow,c:Math.random()<.25?'#fff':col,rot:Math.random()*6})}}
function shards(x,y,n=12){for(let k=0;k<n;k++){const a=Math.random()*6.283,v=2+Math.random()*5;P.push({k:'shard',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,g:.3,life:0,max:40+rnd(20),s:5+Math.random()*7,c:Math.random()<.5?'#e8f7ff':'#9fd8ff',rot:Math.random()*6})}}
function ring(x,y,col,max=120){P.push({k:'ring',x,y,r:6,vr:max/22,life:0,max:24,c:col})}
function bolt(x1,y1,x2,y2,col){P.push({k:'bolt',x:x1,y:y1,x2,y2,life:0,max:22,c:col})}
function confetti(n=140){const w=innerWidth;const cs=['#ff4b5c','#ffd23f','#25a9ff','#a66bff','#6fd24f','#ff8ad8'];for(let k=0;k<n;k++)P.push({k:'conf',x:Math.random()*w,y:-20-Math.random()*200,vx:(Math.random()-.5)*3,vy:2+Math.random()*3,g:.05,life:0,max:200+rnd(80),s:6+Math.random()*6,c:cs[rnd(cs.length)],rot:Math.random()*6,vrot:(Math.random()-.5)*.3})}
function star(c,x,y,r,rot){c.beginPath();for(let k=0;k<10;k++){const rr=k%2?r*.45:r,a=rot+k*Math.PI/5;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fill()}
function loop(){raf=requestAnimationFrame(loop);if(!cx)return;cx.clearRect(0,0,innerWidth,innerHeight);
 if(B&&!document.body.contains(B))B=null;
 if(!P.length){if(!B){cancelAnimationFrame(raf);raf=0;cv&&cv.remove();cv=null;cx=null}return}
 cx.globalCompositeOperation='lighter';
 P=P.filter(p=>{p.life++;const t=p.life/p.max;if(t>=1)return false;
  if(p.k==='ring'){p.r+=p.vr;cx.globalAlpha=1-t;cx.strokeStyle=p.c;cx.lineWidth=10*(1-t)+1;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.283);cx.stroke();return true}
  if(p.k==='bolt'){cx.globalAlpha=1-t;cx.strokeStyle=p.c;cx.lineWidth=3;cx.shadowBlur=12;cx.shadowColor=p.c;cx.beginPath();cx.moveTo(p.x,p.y);for(let k=1;k<7;k++){const f=k/7;cx.lineTo(p.x+(p.x2-p.x)*f+(Math.random()-.5)*16,p.y+(p.y2-p.y)*f+(Math.random()-.5)*16)}cx.lineTo(p.x2,p.y2);cx.stroke();cx.shadowBlur=0;return true}
  if(p.k==='conf'||p.k==='shard'){cx.globalCompositeOperation='source-over';p.vy+=p.g;p.x+=p.vx+(p.k==='conf'?Math.sin(p.life/10):0);p.y+=p.vy;p.rot+=p.vrot||.2;cx.globalAlpha=Math.min(1,(1-t)*3);cx.fillStyle=p.c;cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);if(p.k==='conf')cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);else{cx.beginPath();cx.moveTo(0,-p.s);cx.lineTo(p.s*.6,p.s*.5);cx.lineTo(-p.s*.5,p.s*.4);cx.closePath();cx.fill()}cx.restore();cx.globalCompositeOperation='lighter';return p.y<innerHeight+30}
  p.vy+=p.g;p.vx*=.97;p.x+=p.vx;p.y+=p.vy;p.rot+=.15;cx.globalAlpha=1-t;cx.fillStyle=p.c;const s=p.s*(1-t*.6);
  if(p.k==='star')star(cx,p.x,p.y,s,p.rot);else{cx.beginPath();cx.arc(p.x,p.y,s/2,0,6.283);cx.fill()}return true});
 cx.globalAlpha=1;cx.globalCompositeOperation='source-over'}
function startLoop(){fxCanvas();if(!raf)loop()}

/* ---------- эффекты в DOM ---------- */
function shake(p=1){stage&&stage.animate([{transform:'translate(0,0)'},{transform:`translate(${-6*p}px,${3*p}px)`},{transform:`translate(${5*p}px,${-4*p}px)`},{transform:`translate(${-3*p}px,${2*p}px)`},{transform:'translate(0,0)'}],{duration:340,easing:'ease-out'})}
function beam(i,dir,col){const d=document.createElement('div');d.className='m3beam '+dir;const[x,y]=xy(i);if(dir==='h'){d.style.top=(y+S*.2)+'px';d.style.height=(S*.6)+'px'}else{d.style.left=(x+S*.2)+'px';d.style.width=(S*.6)+'px'}d.style.setProperty('--c',col);B.appendChild(d);d.animate([{transform:dir==='h'?'scaleX(0)':'scaleY(0)',opacity:1},{transform:'scale(1)',opacity:1,offset:.35},{transform:dir==='h'?'scaleX(1) scaleY(.1)':'scaleY(1) scaleX(.1)',opacity:0}],{duration:560,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>d.remove();
 for(let j=0;j<N;j++){const p=dir==='h'?rectOf(Math.floor(i/N)*N+j):rectOf(j*N+i%N);burst(p.x,p.y,col,5,.8)}}
function say(text,big){if(!stage||!document.body.contains(stage))return;stage.querySelectorAll('.m3say').forEach(x=>x.remove());const d=document.createElement('div');d.className='m3say'+(big?' big':'');d.textContent=text;stage.appendChild(d);
 d.animate([{transform:'translate(-50%,-50%) scale(.2) rotateX(70deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1.15) rotateX(0)',opacity:1,offset:.12},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.2},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.85},{transform:'translate(-50%,-80%) scale(.9)',opacity:0}],{duration:3200,easing:'ease-out'}).onfinish=()=>d.remove()}
function floatScore(n,pt){const d=document.createElement('div');d.className='m3pts';d.textContent='+'+n;const b=stage.getBoundingClientRect();d.style.left=(pt.x-b.left)+'px';d.style.top=(pt.y-b.top)+'px';stage.appendChild(d);d.animate([{transform:'translate(-50%,-50%) scale(.5)',opacity:0},{transform:'translate(-50%,-80%) scale(1.15)',opacity:1,offset:.15},{transform:'translate(-50%,-90%) scale(1)',opacity:1,offset:.75},{transform:'translate(-50%,-200%) scale(1)',opacity:0}],{duration:2300,easing:'ease-out'}).onfinish=()=>d.remove()}
let flyQ=0;
function flyGoal(i,t){const slot=document.querySelector(`.m3goal[data-t="${t}"] img`);if(!slot)return;const a=rectOf(i),b=slot.getBoundingClientRect();const k=flyQ++;setTimeout(()=>flyQ=Math.max(0,flyQ-1),2600);
 const im=new Image();im.src=src(t);im.className='m3fly';const sz=S;im.style.width=im.style.height=sz+'px';document.body.appendChild(im);
 const bx=b.left+b.width/2,by=b.top+b.height/2;const hx=Math.min(innerWidth-70,Math.max(70,bx+((k%3)-1)*46)),hy=by+b.height/2+70+Math.floor(k/3)%2*18;
 const big=Math.max(2,120/sz);
 im.animate([{transform:`translate(${a.x}px,${a.y}px) translate(-50%,-50%) scale(1)`},
  {transform:`translate(${hx}px,${hy}px) translate(-50%,-50%) scale(${big}) rotate(-4deg)`,offset:.32,easing:'cubic-bezier(.3,1.6,.5,1)'},
  {transform:`translate(${hx}px,${hy}px) translate(-50%,-50%) scale(${big*1.05}) rotate(3deg)`,offset:.74},
  {transform:`translate(${bx}px,${by}px) translate(-50%,-50%) scale(${b.width/sz*1.1})`,opacity:.95}],{duration:2200,delay:Math.min(k,8)*110,fill:'backwards',easing:'ease-in-out'}).onfinish=()=>{im.remove();G&&(G.shown[t]=Math.min(G.L.need,(G.shown[t]||0)+1));hud();SND.coin();burst(bx,by,COL[t],6,.6);slot.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:260})}}

/* ---------- HUD ---------- */
function hud(){if(!ROOT||!G)return;const w=ROOT.querySelector('.m3');if(!w)return;
 w.querySelector('.m3score b').textContent=G.score;w.querySelector('.m3moves b').textContent=G.moves;w.querySelector('.m3moves').classList.toggle('low',G.moves<=5);
 GOALS.forEach(t=>{const el=w.querySelector(`.m3goal[data-t="${t}"]`);const n=Math.min(G.L.need,G.shown[t]||0);el.querySelector('span').textContent=n>=G.L.need?'✓':`${n}/${G.L.need}`;el.classList.toggle('done',n>=G.L.need)});
 const ig=w.querySelector('.m3goal.ice');if(ig){const n=iceLeft();ig.querySelector('span').textContent=n?n:'✓';ig.classList.toggle('done',!n)}
 const max=G.L.s3*1.1;w.querySelector('.m3bar i').style.width=Math.min(100,G.score/max*100)+'%';
 w.querySelectorAll('.m3bar u').forEach(u=>u.classList.toggle('on',G.score>=+u.dataset.v&&goalsDone()));
 w.querySelectorAll('[data-bst]').forEach(b=>{const k=b.dataset.bst;b.querySelector('small').textContent=G.bst[k];b.disabled=!G.bst[k];b.classList.toggle('on',G.tool===k)})}

/* ---------- ход ---------- */
function clearHint(){clearTimeout(hintT);B&&B.querySelectorAll('.m3hn').forEach(e=>e.classList.remove('m3hn'))}
function armHint(){clearHint();hintT=setTimeout(()=>{if(!G||G.busy||!B)return;const m=findMove(G.c);if(m){const[a,b]=m;const dx=(b%N)-(a%N),dy=Math.floor(b/N)-Math.floor(a/N);[[a,1],[b,-1]].forEach(([i,k])=>{const d=E[G.c[i].id];if(!d)return;d.style.setProperty('--hx',(dx*k*14)+'%');d.style.setProperty('--hy',(dy*k*14)+'%');d.classList.add('m3hn')})}},6000)}
async function swap(a,b){if(!G||G.busy||G.moves<=0||G.over)return;G.busy=true;clearHint();const A=G.c[a],Bt=G.c[b];
 SND.swap();[G.c[a],G.c[b]]=[Bt,A];move(A,b,170,'ease-in-out');move(Bt,a,170,'ease-in-out');await sleep(180);
 const L=s=>s==='h'||s==='v';
 if(A.sp==='c'||Bt.sp==='c'){G.moves--;hud();const bomb=A.sp==='c'?A:Bt,other=bomb===A?Bt:A,bi=bomb===A?b:a,oi=bomb===A?a:b;
  if(other.sp==='c'){const all=new Set(G.c.map((_,i)=>i));G.c[bi].fired=G.c[oi].fired=1;say('Мега-бомба!',true);shake(2.4);await step(all,[],[{k:'c',i:bi,list:[...all]}],3)}
  else if(other.sp){bomb.fired=1;const t=other.t;const tg=[];G.c.forEach((o,i)=>{if(o&&o.t===t&&i!==oi&&!o.sp)tg.push(i)});say(other.sp==='b'?'Ливень бомб!':'Радужные лучи!',true);const p=rectOf(bi);
   for(const i of tg){const o=G.c[i];o.sp=other.sp==='b'?'b':(rnd(2)?'h':'v');refresh(o);const q=rectOf(i);bolt(p.x,p.y,q.x,q.y,'#c9b8ff');SND.make();await sleep(70)}
   await sleep(350);const cl=new Set([bi,oi,...tg]);await step(cl,[],[{k:'c',i:bi,list:tg}],2)}
  else{bomb.target=other.t;await step(new Set([bi]),[],null,1)}
  await cascade(2);return finish()}
 if(A.sp&&Bt.sp){G.moves--;hud();A.fired=Bt.fired=1;const r=Math.floor(b/N),x=b%N;const cl=new Set([a,b]);const fx=[];
  if(L(A.sp)&&L(Bt.sp)){for(let k=0;k<N;k++){cl.add(r*N+k);cl.add(k*N+x)}fx.push({k:'h',i:b},{k:'v',i:b});say('Крест!',true)}
  else if(A.sp==='b'&&Bt.sp==='b'){area(b,2).forEach(i=>cl.add(i));fx.push({k:'B',i:b});say('Мега-взрыв!',true)}
  else{for(let d=-1;d<=1;d++){const rr=r+d,cc=x+d;if(rr>=0&&rr<N){for(let k=0;k<N;k++)cl.add(rr*N+k);fx.push({k:'h',i:rr*N+x})}if(cc>=0&&cc<N){for(let k=0;k<N;k++)cl.add(k*N+cc);fx.push({k:'v',i:r*N+cc})}}say('Тройные лучи!',true)}
  await step(cl,[],fx,2);await cascade(2);return finish()}
 const R=runs(G.c);if(!R.length){[G.c[a],G.c[b]]=[A,Bt];SND.bad();move(A,a,200,'cubic-bezier(.3,1.6,.5,1)');move(Bt,b,200,'cubic-bezier(.3,1.6,.5,1)');const d=E[A.id];d&&d.firstChild.animate([{transform:'rotate(0)'},{transform:'rotate(-12deg)'},{transform:'rotate(10deg)'},{transform:'rotate(0)'}],{duration:300});await sleep(210);G.busy=false;armHint();return}
 G.moves--;hud();await cascade(1,[b,a]);finish()}
async function cascade(combo,pref=[]){let R=runs(G.c);while(R.length){const{clear,make}=plan(R,pref);await step(clear,make,null,combo);combo++;pref=[];R=runs(G.c)}
 if(!findMove(G.c)){say('Перемешиваем!');await shuffle()}}
async function step(clear,make,fx0,combo){const keep=new Set(make.map(m=>m.i));const fx=(fx0||[]).concat(expand(clear));
 let pts=0,sx=0,sy=0,n=0,iceHit=0;
 fx.forEach(f=>{const p=rectOf(f.i);if(f.k==='h'||f.k==='v'){beam(f.i,f.k,'#fff8d6');SND.beam();pts+=60}
  else if(f.k==='b'){ring(p.x,p.y,'#ffd23f',S*2.2);ring(p.x,p.y,'#ff7b3a',S*1.4);burst(p.x,p.y,'#ffb02e',30,1.4);shake(1.4);SND.boom();pts+=90}
  else if(f.k==='B'){ring(p.x,p.y,'#ffd23f',S*4);ring(p.x,p.y,'#ff5a1f',S*3);ring(p.x,p.y,'#fff',S*2);burst(p.x,p.y,'#ffb02e',60,2);shake(2.6);SND.boom();setTimeout(()=>SND.boom(),120);pts+=250}
  else if(f.k==='c'){(f.list||[]).forEach(j=>{const q=rectOf(j);bolt(p.x,p.y,q.x,q.y,'#b7a4ff')});ring(p.x,p.y,'#c9b8ff',S*3);shake(1.8);SND.zap();pts+=150}});
 if(fx.length>1&&!fx0)say(fx.length>2?'Взрыв вкуса!':'Комбо!',true);
 clear.forEach(i=>{if(G.ice[i]>0){G.ice[i]--;iceHit++;const p=rectOf(i);shards(p.x,p.y,G.ice[i]?6:12);drawIce(i);const c=B.querySelector(`.m3c[data-i="${i}"]`);c&&c.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:300});pts+=20}
  const o=G.c[i];if(!o)return;const p=rectOf(i);sx+=p.x;sy+=p.y;n++;pts+=10*combo;
  if(o.t>=0&&GOALS.includes(o.t)&&G.got[o.t]<G.L.need){G.got[o.t]++;flyGoal(i,o.t)}
  const d=E[o.id];burst(p.x,p.y,o.t>=0?COL[o.t]:'#c9b8ff',keep.has(i)?6:14,1);
  if(d){d.style.zIndex=5;d.firstChild.animate([{transform:'scale(1) rotate(0)',filter:'brightness(1)'},{transform:'scale(1.35) rotate(8deg)',filter:'brightness(1.9)',offset:.35},{transform:'scale(0) rotate(-35deg)',filter:'brightness(3)',opacity:0}],{duration:300,easing:'ease-in',fill:'forwards'});setTimeout(()=>d.remove(),310);delete E[o.id]}
  G.c[i]=null});
 if(iceHit)SND.ice();
 G.score+=pts;if(n)SND.pop(combo);if(n){floatScore(pts,{x:sx/n,y:sy/n});const w=COMBO[Math.min(combo,COMBO.length-1)];if(w&&!fx.length&&!G.fin)say(w,combo>=4)}
 await sleep(fx.length?340:260);
 if(make.length)SND.make();make.forEach(m=>{const o=tile(m.t,m.sp);G.c[m.i]=o;const d=mk(o,m.i);const p=rectOf(m.i);ring(p.x,p.y,'#fff',S*.9);burst(p.x,p.y,'#fff',10,.7);d.firstChild.animate([{transform:'scale(0) rotate(-180deg)'},{transform:'scale(1.4) rotate(15deg)',offset:.6},{transform:'scale(1)'}],{duration:450,easing:'cubic-bezier(.3,1.5,.5,1)'})});
 if(!G.goalSaid&&goalsDone()){G.goalSaid=1;setTimeout(()=>{SND.goal();say('Цели собраны!',true);confetti(80)},400)}
 hud();await fall()}
async function fall(){let mx=0;
 for(let x=0;x<N;x++){let w=N-1;for(let r=N-1;r>=0;r--){const o=G.c[r*N+x];if(o){if(w!==r){G.c[w*N+x]=o;G.c[r*N+x]=null;const ms=170+70*(w-r);move(o,w*N+x,ms,null,x*18);mx=Math.max(mx,ms+x*18)}w--}}
  const miss=w+1;for(let r=w;r>=0;r--){const o=tile(rnd(T));G.c[r*N+x]=o;const d=mk(o,r*N+x,r-miss-.3);d.offsetWidth;const ms=200+70*(miss+.3);move(o,r*N+x,ms,null,x*18+(w-r)*25);mx=Math.max(mx,ms+x*18+(w-r)*25)}}
 setTimeout(()=>SND.land(),Math.max(0,mx-120));await sleep(mx+40);
 Object.values(E).forEach(d=>d.style.transition='')}
async function shuffle(){SND.shuffle();do{const ts=G.c.map(o=>o);for(let i=ts.length-1;i>0;i--){const j=rnd(i+1);[ts[i],ts[j]]=[ts[j],ts[i]]}G.c=ts}while(runs(G.c).length||!findMove(G.c));
 G.c.forEach((o,i)=>move(o,i,520,'cubic-bezier(.5,-0.4,.3,1.4)',rnd(120)));await sleep(700);Object.values(E).forEach(d=>d.style.transition='')}
async function finale(){G.fin=1;await sleep(600);say('Шустрый финал!',true);SND.goal();await sleep(1100);
 let k=Math.min(G.moves,10);const extra=G.moves-k;
 while(k-->0){G.moves--;const cand=G.c.map((o,i)=>o&&!o.sp?i:-1).filter(i=>i>=0);if(!cand.length)break;const i=cand[rnd(cand.length)];const o=G.c[i];o.sp=rnd(2)?'h':'v';refresh(o);const p=rectOf(i);ring(p.x,p.y,'#fff',S);burst(p.x,p.y,'#ffd23f',12,.9);tone(600+k*90,.15,{type:'triangle',v:.15});G.score+=80;hud();await sleep(170)}
 if(extra>0){G.score+=extra*80;G.moves=0;hud()}
 for(let guard=0;guard<12;guard++){const sp=G.c.map((o,i)=>o&&o.sp&&o.sp!=='c'?i:-1).filter(i=>i>=0);if(!sp.length)break;await step(new Set(sp.slice(0,4)),[],null,2);let R=runs(G.c);while(R.length){const{clear,make}=plan(R,[]);await step(clear,make,null,2);R=runs(G.c)}}
 hud()}
async function finish(){hud();if(goalsDone()&&!G.over){G.over=1;G.busy=true;await finale();return end(true)}
 if(G.moves<=0&&!G.over){G.over=1;G.busy=true;await sleep(700);return end(false)}
 G.busy=false;armHint()}
async function end(won){const st=won?starsOf():0;if(won){SND.win();confetti(160)}else{SND.lose();say('Ходы закончились',true)}
 await sleep(won?1500:1800);if(document.fullscreenElement)try{await document.exitFullscreen()}catch(e){}
 const g=G;G=null;if(typeof window.m3End==='function')window.m3End({level:g.L.n,won,stars:st,score:g.score,got:g.got,need:g.L.need,ice:g.ice.reduce((a,b)=>a+b,0)})}

/* ---------- бонусы ---------- */
async function useHammer(i){G.busy=true;G.tool=null;G.bst.h--;hud();clearHint();const p=rectOf(i);const h=document.createElement('div');h.className='m3ham';h.textContent='🔨';h.style.left=p.x+'px';h.style.top=p.y+'px';document.body.appendChild(h);
 await h.animate([{transform:'translate(-20%,-110%) rotate(60deg) scale(1.6)',opacity:0},{transform:'translate(-20%,-110%) rotate(60deg) scale(1.6)',opacity:1,offset:.3},{transform:'translate(-50%,-80%) rotate(-30deg) scale(1.6)',opacity:1}],{duration:420,easing:'cubic-bezier(.6,0,.9,.5)'}).finished;
 SND.hammer();shake(1.6);ring(p.x,p.y,'#fff',S*1.6);h.animate([{opacity:1},{opacity:0}],{duration:300}).onfinish=()=>h.remove();
 await step(new Set([i]),[],null,1);await cascade(1);finish()}
async function useShuffle(){G.busy=true;G.bst.s--;hud();clearHint();say('Перемешиваем!');await shuffle();await cascade(1);finish()}

/* ---------- монтаж ---------- */
function html(){const L=G.L,max=L.s3*1.1;
 return`<div class="m3${G.fs?' fs':''}">
  <div class="m3row1"><span class="m3lv">Уровень ${L.n}</span><div class="m3score"><span>Очки</span><b>0</b></div><div class="m3tools"><button data-m3="snd" aria-label="Звук">${MUTE?'🔇':'🔊'}</button><button data-m3="fs" aria-label="Во весь экран">${G.fs?'🗗':'⛶'}</button></div></div>
  <div class="m3top">
   <div class="m3goal" data-t="0"><img src="${src(0)}" alt=""><span></span></div>
   <div class="m3moves"><b></b><small>ходов</small></div>
   <div class="m3goal" data-t="1"><img src="${src(1)}" alt=""><span></span></div>
   ${L.ice?`<div class="m3goal ice"><i class="m3icei"></i><span></span></div>`:''}</div>
  <div class="m3bar"><i></i><u data-v="${L.s2}" style="left:${L.s2/max*100}%"><em>★★</em></u><u data-v="${L.s3}" style="left:${L.s3/max*100}%"><em>★★★</em></u></div>
  <div class="m3stage"><div class="m3board"></div></div>
  <div class="m3bst"><button data-bst="h"><span>🔨</span>Молоток<small></small></button><button data-bst="s"><span>🌀</span>Перемешать<small></small></button></div></div>`}
function fit(){const st=ROOT.querySelector('.m3stage');const nav=document.querySelector('nav');const navH=G.fs?0:(nav?nav.getBoundingClientRect().height:0);
 const top=st.getBoundingClientRect().top;const bst=ROOT.querySelector('.m3bst').getBoundingClientRect().height+22;
 const avail=innerHeight-navH-top-bst-14;const w=Math.max(220,Math.min(ROOT.querySelector('.m3').clientWidth,avail+30,560));st.style.width=w+'px'}
function mount(root,g){ROOT=root;G=g;G.busy=false;G.sel=-1;G.tool=null;G.shown=G.shown||{0:G.got[0],1:G.got[1]};root.innerHTML=html();stage=root.querySelector('.m3stage');B=root.querySelector('.m3board');E={};
 scrollTo(0,0);fit();S=B.clientWidth/N;let cells='';for(let i=0;i<N*N;i++)cells+=`<div class="m3c${G.ice[i]===2?' ice2':G.ice[i]===1?' ice':''}" data-i="${i}" style="left:${(i%N)*S}px;top:${Math.floor(i/N)*S}px;width:${S}px;height:${S}px"><i></i></div>`;B.insertAdjacentHTML('beforeend',cells);
 G.c.forEach((o,i)=>{const d=mk(o,i,Math.floor(i/N)-N-1);d.offsetWidth;move(o,i,500+Math.floor(i/N)*40,null,(i%N)*35+(N-Math.floor(i/N))*20)});
 hud();startLoop();bind();setTimeout(()=>{Object.values(E).forEach(d=>d.style.transition='');G&&!G.busy&&armHint()},1200);
 if(!G.started){G.started=1;ac();setTimeout(()=>{SND.make();say(L_intro(),true)},500)}}
function L_intro(){return G.L.ice?'Растопи лёд!':'Поехали!'}
function toggleFs(){if(!G||G.busy)return;G.fs=!G.fs;const el=document.documentElement;
 if(G.fs){try{const p=(el.requestFullscreen||el.webkitRequestFullscreen).call(el);p&&p.catch&&p.catch(()=>{})}catch(e){}}else if(document.fullscreenElement){try{document.exitFullscreen()}catch(e){}}
 setTimeout(()=>ROOT&&document.body.contains(ROOT)&&mount(ROOT,G),G.fs?300:200)}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&G&&G.fs&&!G.busy){G.fs=false;ROOT&&document.body.contains(ROOT)&&mount(ROOT,G)}});
let rzT=0;addEventListener('resize',()=>{size();clearTimeout(rzT);rzT=setTimeout(()=>{if(G&&!G.busy&&ROOT&&document.body.contains(ROOT))mount(ROOT,G)},350)});
function bind(){let si=-1,sx=0,sy=0,done=false;
 ROOT.querySelector('.m3tools').addEventListener('click',e=>{const b=e.target.closest('[data-m3]');if(!b)return;ac();if(b.dataset.m3==='snd'){MUTE=!MUTE;try{localStorage.setItem('m3mute',MUTE?'1':'0')}catch(_){}b.textContent=MUTE?'🔇':'🔊';if(!MUTE)SND.coin()}else toggleFs()});
 ROOT.querySelector('.m3bst').addEventListener('click',e=>{const b=e.target.closest('[data-bst]');if(!b||!G||G.busy||G.over)return;ac();const k=b.dataset.bst;if(!G.bst[k])return;
  if(k==='s'){useShuffle();return}G.tool=G.tool==='h'?null:'h';hud();if(G.tool)say('Выберите продукт')});
 const idx=e=>{const t=e.target.closest('.m3t');if(!t)return-1;return G?G.c.findIndex(x=>x&&x.id===+t.dataset.id):-1};
 B.addEventListener('pointerdown',e=>{ac();if(!G||G.busy||G.over)return;si=idx(e);sx=e.clientX;sy=e.clientY;done=false;
  if(G.tool==='h'&&si>=0){const i=si;si=-1;done=true;useHammer(i);return}
  if(si>=0){const d=E[G.c[si].id];d&&d.classList.add('lift')}});
 B.addEventListener('pointermove',e=>{if(si<0||done||!G||G.busy)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)<S*.3)return;done=true;const r=Math.floor(si/N),c=si%N;let j=-1;
  if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&c<N-1)j=si+1;if(dx<0&&c>0)j=si-1}else{if(dy>0&&r<N-1)j=si+N;if(dy<0&&r>0)j=si-N}
  B.querySelectorAll('.lift,.sel').forEach(x=>x.classList.remove('lift','sel'));const a=si;si=-1;G.sel=-1;if(j>=0)swap(a,j)});
 B.addEventListener('pointerup',()=>{B&&B.querySelectorAll('.lift').forEach(x=>x.classList.remove('lift'));if(si<0||done||!G||G.busy){si=-1;return}const a=si;si=-1;
  if(G.sel>=0&&G.sel!==a){const s=G.sel;G.sel=-1;B.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));const ra=Math.floor(s/N),rb=Math.floor(a/N);if((Math.abs(s-a)===1&&ra===rb)||Math.abs(s-a)===N){swap(s,a);return}}
  B.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));G.sel=a;const d=E[G.c[a].id];d&&d.classList.add('sel')});
 B.addEventListener('pointercancel',()=>{si=-1});
 stage.addEventListener('pointermove',e=>{const b=stage.getBoundingClientRect();const x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;B.style.transform=`rotateX(${10-y*6}deg) rotateY(${x*6}deg)`});
 stage.addEventListener('pointerleave',()=>{B.style.transform=''})}

window.M3={LV,src,T,
 newGame:(n,bonusMoves=0)=>{const L=LV(n);return{L,c:fresh(),ice:iceMap(L),score:0,moves:L.moves+bonusMoves,got:{0:0,1:0},bst:{h:1,s:1}}},
 mount,confetti:n=>{startLoop();confetti(n)},star:k=>SND.star(k)};
})();
