/* Шустрые три в ряд: match-3 с продуктами Dr.Shuster */
(function(){
'use strict';
const N=7,T=6,MOVES=25,GOALN=12,GOALBONUS=300;
const COL=['#a66bff','#25a9ff','#ff3b6b','#ffa21a','#6fd24f','#6b3a1f'];
const BOT=[1,0,1,1,0,1];
const NM=['Сироп «Альпийская лаванда»','Мармелад «Блю Кюрасао»','Сироп «Клубничный мармелад»','Сироп «Солнечный абрикос»','Мармелад «Мятный»','Сироп «Шоколадный»'];
const GOALS=[0,1];
const COMBO=['','','Сочно!','Вкусно!','Шустро!','Бомба!','Невероятно!','Легенда!'];
const src=t=>'game/t'+t+'.png?v=1';
[...Array(T)].forEach((_,t)=>{const i=new Image();i.src=src(t)});
const rnd=n=>Math.floor(Math.random()*n);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ID=1,G=null,B=null,stage=null,S=0,E={},cv=null,cx=null,P=[],raf=0,hintT=0,idleT=0,tilt={x:0,y:0};

/* ---------- звук ---------- */
let AC=null,MUTE=false;try{MUTE=localStorage.getItem('m3mute')==='1'}catch(e){}
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d,{type='sine',v=.25,to=null,at=0,att=.005}={}){const a=ac();if(!a||MUTE)return;const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+att);g.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.05)}
function noise(d,{v=.3,f=1200,q=1,to=null,at=0,type='bandpass'}={}){const a=ac();if(!a||MUTE)return;const t=a.currentTime+at,n=Math.floor(a.sampleRate*d),bf=a.createBuffer(1,n,a.sampleRate),ch=bf.getChannelData(0);for(let i=0;i<n;i++)ch[i]=Math.random()*2-1;const sr=a.createBufferSource();sr.buffer=bf;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+d);fl.Q.value=q;const g=a.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);sr.connect(fl).connect(g).connect(a.destination);sr.start(t);sr.stop(t+d)}
const SND={
 swap(){noise(.16,{v:.18,f:600,to:2400,q:2})},
 bad(){tone(220,.12,{type:'square',v:.08});tone(180,.16,{type:'square',v:.08,at:.11})},
 pop(c){const b=420*Math.pow(1.12,Math.min(c,9));tone(b,.14,{type:'sine',v:.3,to:b*1.8});tone(b*1.5,.1,{type:'triangle',v:.12,at:.03,to:b*2.6});noise(.08,{v:.08,f:4000,q:.7})},
 make(){[523,659,784,1047].forEach((f,k)=>tone(f,.18,{type:'triangle',v:.18,at:k*.06}))},
 beam(){tone(1800,.4,{type:'sawtooth',v:.09,to:120});noise(.35,{v:.15,f:3000,to:300,q:1.5})},
 boom(){tone(120,.5,{type:'sine',v:.5,to:35});noise(.5,{v:.45,f:900,to:80,q:.6,type:'lowpass'})},
 zap(){for(let k=0;k<6;k++)tone(900+Math.random()*900,.07,{type:'square',v:.06,at:k*.05,to:200});tone(200,.6,{type:'sawtooth',v:.1,to:1600})},
 coin(){tone(1318,.09,{type:'square',v:.07});tone(1760,.22,{type:'square',v:.07,at:.08})},
 land(){noise(.05,{v:.06,f:250,q:.8,type:'lowpass'})},
 goal(){[784,988,1175,1568].forEach((f,k)=>tone(f,.25,{type:'triangle',v:.16,at:k*.09}))},
 win(){[523,659,784,1047,784,1047,1319].forEach((f,k)=>tone(f,.3,{type:'triangle',v:.18,at:k*.12}));noise(1,{v:.06,f:6000,q:.5,at:.2})},
 shuffle(){for(let k=0;k<8;k++)noise(.06,{v:.1,f:1500+k*300,q:3,at:k*.05})}};
let VOICE=null;function voice(){if(VOICE!==null)return VOICE;try{const vs=speechSynthesis.getVoices();VOICE=vs.find(v=>/^ru/i.test(v.lang))||false}catch(e){VOICE=false}return VOICE}
function speak(t){if(MUTE||!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.replace(/[+!]/g,' '));u.lang='ru-RU';const v=voice();if(v)u.voice=v;u.rate=1.08;u.pitch=1.35;u.volume=1;speechSynthesis.speak(u)}catch(e){}}
try{speechSynthesis.onvoiceschanged=()=>{VOICE=null}}catch(e){}

/* ---------- модель ---------- */
const tile=(t,sp='')=>({id:ID++,t,sp});
function fresh(){for(;;){const c=[];for(let i=0;i<N*N;i++){let t;do{t=rnd(T)}while((i%N>=2&&c[i-1].t===t&&c[i-2].t===t)||(i>=2*N&&c[i-N].t===t&&c[i-2*N].t===t));c.push(tile(t))}if(findMove(c))return c}}
function runs(c){const R=[];const same=(a,b)=>a&&b&&a.t>=0&&a.t===b.t;
 for(let r=0;r<N;r++){let k=0;for(let x=1;x<=N;x++){if(x<N&&same(c[r*N+k],c[r*N+x]))continue;if(x-k>=3)R.push({d:'h',i:[...Array(x-k)].map((_,j)=>r*N+k+j)});k=x}}
 for(let x=0;x<N;x++){let k=0;for(let r=1;r<=N;r++){if(r<N&&same(c[k*N+x],c[r*N+x]))continue;if(r-k>=3)R.push({d:'v',i:[...Array(r-k)].map((_,j)=>(k+j)*N+x)});k=r}}
 return R}
function findMove(c){for(let i=0;i<N*N;i++)for(const j of [i%N<N-1?i+1:-1,i+N<N*N?i+N:-1]){if(j<0)continue;if(c[i].sp==='c'||c[j].sp==='c')return[i,j];[c[i],c[j]]=[c[j],c[i]];const ok=runs(c).length>0;[c[i],c[j]]=[c[j],c[i]];if(ok)return[i,j]}return null}
function plan(R,pref){const clear=new Set(),make=[],used=new Set(),cnt={};
 R.forEach(r=>r.i.forEach(i=>{clear.add(i);cnt[i]=(cnt[i]||0)+1}));
 const pick=r=>{const p=pref.find(x=>r.i.includes(x));return p!==undefined?p:r.i[r.i.length>>1]};
 R.filter(r=>r.i.length>=5).forEach(r=>{const i=pick(r);if(!used.has(i)){make.push({i,t:-1,sp:'c'});used.add(i)}});
 Object.keys(cnt).filter(i=>cnt[i]>1).map(Number).forEach(i=>{if(!used.has(i)){make.push({i,t:G.c[i].t,sp:'b'});used.add(i)}});
 R.filter(r=>r.i.length===4).forEach(r=>{if(r.i.some(i=>used.has(i)))return;const i=pick(r);make.push({i,t:G.c[i].t,sp:r.d==='h'?'v':'h'});used.add(i)});
 return{clear,make}}
function topType(){const n=Array(T).fill(0);G.c.forEach(o=>{if(o&&o.t>=0)n[o.t]++});return n.indexOf(Math.max(...n))}
function expand(clear,skip=new Set()){const q=[...clear],fx=[];
 while(q.length){const i=q.shift();const o=G.c[i];if(!o||!o.sp||o.fired||skip.has(i))continue;o.fired=1;const r=Math.floor(i/N),x=i%N,add=[];
  if(o.sp==='h'){for(let k=0;k<N;k++)add.push(r*N+k);fx.push({k:'h',i})}
  else if(o.sp==='v'){for(let k=0;k<N;k++)add.push(k*N+x);fx.push({k:'v',i})}
  else if(o.sp==='b'){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=x+dc;if(rr>=0&&rr<N&&cc>=0&&cc<N)add.push(rr*N+cc)}fx.push({k:'b',i})}
  else if(o.sp==='c'){const t=o.target>=0?o.target:topType();G.c.forEach((p,j)=>{if(p&&p.t===t)add.push(j)});fx.push({k:'c',i,list:add.slice()})}
  add.forEach(j=>{if(!clear.has(j)){clear.add(j);q.push(j)}})}
 return fx}

/* ---------- отрисовка ---------- */
const xy=i=>[(i%N)*S,Math.floor(i/N)*S];
const tr=(x,y)=>`translate3d(${x}px,${y}px,0)`;
function inner(o){if(o.sp==='c')return`<div class="in orb"><i></i><b></b></div>`;return`<div class="in sp-${o.sp||'n'}" style="--c:${COL[o.t]}"><s class="pl"></s><img class="${BOT[o.t]?'bt':'mr'}" src="${src(o.t)}" alt="" draggable="false"></div>`}
function mk(o,i,row){const d=document.createElement('div');d.className='m3t';d.dataset.id=o.id;d.style.width=d.style.height=S+'px';d.innerHTML=inner(o);const[x]=xy(i);const y=(row!==undefined?row:Math.floor(i/N))*S;d.style.transform=tr(x,y);d.firstChild.style.animationDelay=(-Math.random()*3).toFixed(2)+'s';B.appendChild(d);E[o.id]=d;return d}
function move(o,i,ms,ease,delay=0){const d=E[o.id];if(!d)return;const[x,y]=xy(i);d.style.transition=`transform ${ms}ms ${ease||'cubic-bezier(.45,.05,.4,1.32)'} ${delay}ms`;d.style.transform=tr(x,y)}
function rectOf(i){const b=B.getBoundingClientRect();const k=b.width/(S*N);const[x,y]=xy(i);return{x:b.left+(x+S/2)*k,y:b.top+(y+S/2)*k}}

/* ---------- частицы ---------- */
function fxCanvas(){if(cv&&document.body.contains(cv))return;cv=document.createElement('canvas');cv.className='m3fx';document.body.appendChild(cv);cx=cv.getContext('2d');size()}
function size(){if(!cv)return;const d=Math.min(2,devicePixelRatio||1);cv.width=innerWidth*d;cv.height=innerHeight*d;cx.setTransform(d,0,0,d,0,0)}
function burst(x,y,col,n=16,pow=1){for(let k=0;k<n;k++){const a=Math.random()*6.283,v=(2+Math.random()*5)*pow;P.push({k:Math.random()<.35?'star':'dot',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2.5*pow,g:.22,life:0,max:34+rnd(24),s:3+Math.random()*5*pow,c:Math.random()<.25?'#fff':col,rot:Math.random()*6})}}
function ring(x,y,col,max=120){P.push({k:'ring',x,y,r:6,vr:max/22,life:0,max:24,c:col})}
function bolt(x1,y1,x2,y2,col){P.push({k:'bolt',x:x1,y:y1,x2,y2,life:0,max:22,c:col,seed:Math.random()})}
function confetti(n=140){const w=innerWidth;const cs=['#ff4b5c','#ffd23f','#25a9ff','#a66bff','#6fd24f','#ff8ad8'];for(let k=0;k<n;k++)P.push({k:'conf',x:Math.random()*w,y:-20-Math.random()*200,vx:(Math.random()-.5)*3,vy:2+Math.random()*3,g:.05,life:0,max:180+rnd(80),s:6+Math.random()*6,c:cs[rnd(cs.length)],rot:Math.random()*6,vrot:(Math.random()-.5)*.3})}
function star(c,x,y,r,rot){c.beginPath();for(let k=0;k<10;k++){const rr=k%2?r*.45:r,a=rot+k*Math.PI/5;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fill()}
function loop(){raf=requestAnimationFrame(loop);if(!cx)return;cx.clearRect(0,0,innerWidth,innerHeight);
 if(B&&!document.body.contains(B)){B=null}
 if(!P.length){if(!B){cancelAnimationFrame(raf);raf=0;cv&&cv.remove();cv=null;cx=null}return}
 cx.globalCompositeOperation='lighter';
 P=P.filter(p=>{p.life++;const t=p.life/p.max;if(t>=1)return false;
  if(p.k==='ring'){p.r+=p.vr;cx.globalAlpha=1-t;cx.strokeStyle=p.c;cx.lineWidth=10*(1-t)+1;cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.283);cx.stroke();return true}
  if(p.k==='bolt'){cx.globalAlpha=1-t;cx.strokeStyle=p.c;cx.lineWidth=3;cx.shadowBlur=12;cx.shadowColor=p.c;cx.beginPath();cx.moveTo(p.x,p.y);const n=7;for(let k=1;k<n;k++){const f=k/n;cx.lineTo(p.x+(p.x2-p.x)*f+(Math.random()-.5)*16,p.y+(p.y2-p.y)*f+(Math.random()-.5)*16)}cx.lineTo(p.x2,p.y2);cx.stroke();cx.shadowBlur=0;return true}
  if(p.k==='conf'){cx.globalCompositeOperation='source-over';p.vy+=p.g;p.x+=p.vx+Math.sin(p.life/10);p.y+=p.vy;p.rot+=p.vrot;cx.globalAlpha=Math.min(1,(1-t)*3);cx.fillStyle=p.c;cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cx.restore();cx.globalCompositeOperation='lighter';return p.y<innerHeight+30}
  p.vy+=p.g;p.vx*=.97;p.x+=p.vx;p.y+=p.vy;p.rot+=.15;cx.globalAlpha=1-t;cx.fillStyle=p.c;const s=p.s*(1-t*.6);
  if(p.k==='star')star(cx,p.x,p.y,s,p.rot);else{cx.beginPath();cx.arc(p.x,p.y,s/2,0,6.283);cx.fill()}return true});
 cx.globalAlpha=1;cx.globalCompositeOperation='source-over'}
function startLoop(){fxCanvas();if(!raf)loop()}

/* ---------- эффекты в DOM ---------- */
function shake(p=1){stage&&stage.animate([{transform:'translate(0,0)'},{transform:`translate(${-6*p}px,${3*p}px)`},{transform:`translate(${5*p}px,${-4*p}px)`},{transform:`translate(${-3*p}px,${2*p}px)`},{transform:'translate(0,0)'}],{duration:320,easing:'ease-out'})}
function beam(i,dir,col){const d=document.createElement('div');d.className='m3beam '+dir;const[x,y]=xy(i);if(dir==='h'){d.style.top=(y+S*.2)+'px';d.style.height=(S*.6)+'px'}else{d.style.left=(x+S*.2)+'px';d.style.width=(S*.6)+'px'}d.style.setProperty('--c',col);B.appendChild(d);d.animate([{transform:dir==='h'?'scaleX(0)':'scaleY(0)',opacity:1},{transform:'scale(1)',opacity:1,offset:.35},{transform:dir==='h'?'scaleX(1) scaleY(.1)':'scaleY(1) scaleX(.1)',opacity:0}],{duration:520,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>d.remove();
 const b=B.getBoundingClientRect(),k=b.width/(S*N);for(let j=0;j<N;j++){const p=dir==='h'?rectOf(Math.floor(i/N)*N+j):rectOf(j*N+i%N);burst(p.x,p.y,col,5,.8)}}
function say(text,big){speak(text);stage.querySelectorAll('.m3say').forEach(x=>x.remove());const d=document.createElement('div');d.className='m3say'+(big?' big':'');d.textContent=text;stage.appendChild(d);d.animate([{transform:'translate(-50%,-50%) scale(.2) rotateX(70deg)',opacity:0},{transform:'translate(-50%,-50%) scale(1.18) rotateX(0)',opacity:1,offset:.25},{transform:'translate(-50%,-50%) scale(1)',opacity:1,offset:.8},{transform:'translate(-50%,-90%) scale(.9)',opacity:0}],{duration:2400,easing:'cubic-bezier(.2,.9,.3,1.2)'}).onfinish=()=>d.remove()}
function floatScore(n,pt){const d=document.createElement('div');d.className='m3pts';d.textContent='+'+n;const b=stage.getBoundingClientRect();d.style.left=(pt.x-b.left)+'px';d.style.top=(pt.y-b.top)+'px';stage.appendChild(d);d.animate([{transform:'translate(-50%,-50%) scale(.5)',opacity:0},{transform:'translate(-50%,-80%) scale(1.15)',opacity:1,offset:.25},{transform:'translate(-50%,-80%) scale(1.05)',opacity:1,offset:.7},{transform:'translate(-50%,-200%) scale(1)',opacity:0}],{duration:1700,easing:'ease-out'}).onfinish=()=>d.remove()}
function flyGoal(i,t){const slot=document.querySelector(`.m3goal[data-t="${t}"] img`);if(!slot)return;const a=rectOf(i),b=slot.getBoundingClientRect();const im=new Image();im.src=src(t);im.className='m3fly';const sz=Math.max(S*1.6,90);im.style.width=im.style.height=sz+'px';document.body.appendChild(im);const bx=b.left+b.width/2,by=b.top+b.height/2;const mx=(a.x+bx)/2+(Math.random()-.5)*60,my=Math.min(a.y,by)-40;
 im.animate([{transform:`translate(${a.x}px,${a.y}px) translate(-50%,-50%) scale(.6) rotate(0)`},{transform:`translate(${a.x}px,${a.y-30}px) translate(-50%,-50%) scale(1.35) rotate(4deg)`,offset:.18},{transform:`translate(${mx}px,${my}px) translate(-50%,-50%) scale(1.5) rotate(-6deg)`,offset:.45},{transform:`translate(${bx}px,${by}px) translate(-50%,-50%) scale(.4) rotate(0)`,opacity:.9}],{duration:1150+rnd(250),easing:'cubic-bezier(.3,.1,.3,1)'}).onfinish=()=>{im.remove();G.shown[t]=Math.min(GOALN,(G.shown[t]||0)+1);hud();SND.coin();burst(bx,by,COL[t],6,.6);slot.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:260})}}

/* ---------- HUD ---------- */
function cps(){return(typeof Store!=='undefined'&&Store.config.coupons)||[]}
function hud(){if(!stage)return;const w=stage.closest('.m3');if(!w)return;
 w.querySelector('.m3score b').textContent=G.score;w.querySelector('.m3moves b').textContent=G.moves;w.querySelector('.m3moves').classList.toggle('low',G.moves<=5);
 GOALS.forEach((t,k)=>{const el=w.querySelector(`.m3goal[data-t="${t}"]`);const n=Math.min(GOALN,G.shown[t]||0);el.querySelector('span').textContent=n>=GOALN?'✓':`${n}/${GOALN}`;el.classList.toggle('done',n>=GOALN)});
 const c=cps(),max=c.length?c[c.length-1].min*1.08:1000;w.querySelector('.m3bar i').style.width=Math.min(100,G.score/max*100)+'%';
 w.querySelectorAll('.m3bar u').forEach((u,k)=>u.classList.toggle('on',G.score>=c[k].min));
 const nx=c.find(x=>G.score<x.min);w.querySelector('.m3next').textContent=nx?`До купона Ozon −${nx.percent}%: ${nx.min-G.score} очков`:'Максимальный купон Ozon ваш! 🎉'}

/* ---------- ход ---------- */
function clearHint(){clearTimeout(hintT);B&&B.querySelectorAll('.m3hn').forEach(e=>e.classList.remove('m3hn'))}
function armHint(){clearHint();hintT=setTimeout(()=>{if(!G||G.busy||!B)return;const m=findMove(G.c);if(m){const[a,b]=m;const dx=(b%N)-(a%N),dy=Math.floor(b/N)-Math.floor(a/N);[[a,1],[b,-1]].forEach(([i,k])=>{const d=E[G.c[i].id];if(!d)return;d.style.setProperty('--hx',(dx*k*14)+'%');d.style.setProperty('--hy',(dy*k*14)+'%');d.classList.add('m3hn')})}},6000)}
async function swap(a,b){if(!G||G.busy||G.moves<=0)return;G.busy=true;clearHint();const A=G.c[a],Bt=G.c[b];
 SND.swap();[G.c[a],G.c[b]]=[Bt,A];move(A,b,170,'ease-in-out');move(Bt,a,170,'ease-in-out');await sleep(180);
 if(A.sp==='c'||Bt.sp==='c'){G.moves--;hud();const bomb=A.sp==='c'?A:Bt,other=bomb===A?Bt:A,bi=bomb===A?b:a,oi=bomb===A?a:b;
  if(other.sp==='c'){const all=new Set(G.c.map((_,i)=>i));G.c[bi].fired=G.c[oi].fired=1;say('Мега-бомба!',true);shake(2);await step(all,[],[{k:'c',i:bi,list:[...all]}],3)}
  else{bomb.target=other.t;const cl=new Set([bi]);await step(cl,[],null,1,new Set())}
  await cascade(1);return finish()}
 const R=runs(G.c);if(!R.length){[G.c[a],G.c[b]]=[A,Bt];move(A,a,200,'cubic-bezier(.3,1.6,.5,1)');move(Bt,b,200,'cubic-bezier(.3,1.6,.5,1)');SND.bad();const d=E[A.id];d&&d.firstChild.animate([{transform:'rotate(0)'},{transform:'rotate(-12deg)'},{transform:'rotate(10deg)'},{transform:'rotate(0)'}],{duration:300});await sleep(210);G.busy=false;armHint();return}
 G.moves--;hud();await cascade(1,[b,a]);finish()}
async function cascade(combo,pref=[]){let R=runs(G.c);while(R.length){const{clear,make}=plan(R,pref);await step(clear,make,null,combo);combo++;pref=[];R=runs(G.c)}
 if(!findMove(G.c)){say('Перемешиваем!');await shuffle()}}
async function step(clear,make,fx0,combo,skip){const keep=new Set(make.map(m=>m.i));const fx=(fx0||[]).concat(expand(clear,skip));
 let pts=0,sx=0,sy=0,n=0;
 fx.forEach(f=>{const p=rectOf(f.i);if(f.k==='h'||f.k==='v'){beam(f.i,f.k,'#fff8d6');SND.beam();pts+=60}else if(f.k==='b'){ring(p.x,p.y,'#ffd23f',S*2.2);ring(p.x,p.y,'#ff7b3a',S*1.4);burst(p.x,p.y,'#ffb02e',30,1.4);shake(1.4);SND.boom();pts+=90}else if(f.k==='c'){(f.list||[]).forEach(j=>{const q=rectOf(j);bolt(p.x,p.y,q.x,q.y,'#b7a4ff')});ring(p.x,p.y,'#c9b8ff',S*3);shake(1.8);SND.zap();pts+=150}});
 if(fx.length>1)say(fx.length>2?'Взрыв вкуса!':'Комбо!',true);
 clear.forEach(i=>{const o=G.c[i];if(!o)return;const p=rectOf(i);sx+=p.x;sy+=p.y;n++;pts+=10*combo;
  if(o.t>=0&&GOALS.includes(o.t)&&G.got[o.t]<GOALN){G.got[o.t]++;flyGoal(i,o.t)}
  const d=E[o.id];burst(p.x,p.y,o.t>=0?COL[o.t]:'#c9b8ff',keep.has(i)?6:14,1);
  if(d){d.style.zIndex=5;d.firstChild.animate([{transform:'scale(1) rotate(0)',filter:'brightness(1)'},{transform:'scale(1.35) rotate(8deg)',filter:'brightness(1.9)',offset:.35},{transform:'scale(0) rotate(-35deg)',filter:'brightness(3)',opacity:0}],{duration:300,easing:'ease-in',fill:'forwards'});setTimeout(()=>d.remove(),310);delete E[o.id]}
  G.c[i]=null});
 G.score+=pts;if(n)SND.pop(combo);if(n){floatScore(pts,{x:sx/n,y:sy/n});const w=COMBO[Math.min(combo,COMBO.length-1)];if(w&&!fx.length)say(w,combo>=4)}
 await sleep(fx.length?330:260);
 if(make.length)SND.make();make.forEach(m=>{const o=tile(m.t,m.sp);G.c[m.i]=o;const d=mk(o,m.i);const p=rectOf(m.i);ring(p.x,p.y,'#fff',S*.9);burst(p.x,p.y,'#fff',10,.7);d.firstChild.animate([{transform:'scale(0) rotate(-180deg)'},{transform:'scale(1.4) rotate(15deg)',offset:.6},{transform:'scale(1)'}],{duration:450,easing:'cubic-bezier(.3,1.5,.5,1)'})});
 GOALS.forEach(t=>{if(!G.bonus&&GOALS.every(x=>G.got[x]>=GOALN)){G.bonus=true;G.score+=GOALBONUS;setTimeout(()=>{SND.goal();say(`Цели собраны! Плюс ${GOALBONUS}`,true);confetti(90)},500)}});
 hud();await fall()}
async function fall(){let mx=0;
 for(let x=0;x<N;x++){let w=N-1;for(let r=N-1;r>=0;r--){const o=G.c[r*N+x];if(o){if(w!==r){G.c[w*N+x]=o;G.c[r*N+x]=null;const ms=170+70*(w-r);move(o,w*N+x,ms,null,x*18);mx=Math.max(mx,ms+x*18)}w--}}
  const miss=w+1;for(let r=w;r>=0;r--){const o=tile(rnd(T));G.c[r*N+x]=o;const d=mk(o,r*N+x,r-miss-.3);d.offsetWidth;const ms=200+70*(miss+.3);move(o,r*N+x,ms,null,x*18+(w-r)*25);mx=Math.max(mx,ms+x*18+(w-r)*25)}}
 setTimeout(()=>SND.land(),Math.max(0,mx-120));await sleep(mx+40);
 Object.values(E).forEach(d=>d.style.transition='')}
async function shuffle(){SND.shuffle();do{const ts=G.c.map(o=>o);for(let i=ts.length-1;i>0;i--){const j=rnd(i+1);[ts[i],ts[j]]=[ts[j],ts[i]]}G.c=ts}while(runs(G.c).length||!findMove(G.c));
 G.c.forEach((o,i)=>move(o,i,520,'cubic-bezier(.5,-0.4,.3,1.4)',rnd(120)));await sleep(700)}
async function finish(){G.busy=false;hud();if(G.moves<=0){G.busy=true;await sleep(500);say('Финал!',true);SND.win();confetti(160);await sleep(2200);if(document.fullscreenElement)try{await document.exitFullscreen()}catch(e){}const g=G;G=null;if(typeof App!=='undefined')App.game=g;typeof endGame==='function'&&endGame();return}armHint()}

/* ---------- монтаж ---------- */
function html(){const c=cps(),max=c.length?c[c.length-1].min*1.08:1000;
 return`<div class="m3${G.fs?' fs':''}"><div class="m3tools"><button data-m3="snd" aria-label="Звук">${MUTE?'🔇':'🔊'}</button><button data-m3="fs" aria-label="Во весь экран">${G.fs?'🗗':'⛶'}</button></div><div class="m3top">
  <div class="m3goal" data-t="0"><img src="${src(0)}" alt=""><span></span></div>
  <div class="m3moves"><b></b><small>ходов</small></div>
  <div class="m3goal" data-t="1"><img src="${src(1)}" alt=""><span></span></div></div>
  <div class="m3score"><span>Очки</span><b>0</b></div>
  <div class="m3bar"><i></i>${c.map(x=>`<u style="left:${x.min/max*100}%"><em>−${x.percent}%</em></u>`).join('')}</div>
  <div class="m3next muted"></div>
  <div class="m3stage"><div class="m3board"></div></div>
  <p class="muted m3tip">Меняйте соседние продукты местами. 4 в ряд дают полосатый, уголок даёт взрывной, 5 в ряд дают радужную бомбу.</p></div>`}
let ROOT=null;
function mount(root,g){ROOT=root;G=g;G.busy=false;G.sel=-1;G.shown=G.shown||{0:G.got[0],1:G.got[1]};root.innerHTML=html();stage=root.querySelector('.m3stage');B=root.querySelector('.m3board');E={};
 S=B.clientWidth/N;let cells='';for(let i=0;i<N*N;i++)cells+=`<div class="m3c" style="left:${(i%N)*S}px;top:${Math.floor(i/N)*S}px;width:${S}px;height:${S}px"><i></i></div>`;B.insertAdjacentHTML('beforeend',cells);
 G.c.forEach((o,i)=>{const d=mk(o,i,Math.floor(i/N)-N-1);d.offsetWidth;move(o,i,500+Math.floor(i/N)*40,null,(i%N)*35+(N-Math.floor(i/N))*20)});
 hud();startLoop();bind();setTimeout(()=>{Object.values(E).forEach(d=>d.style.transition='');G&&!G.busy&&armHint()},1200);
 if(!G.started){G.started=1;ac();setTimeout(()=>{SND.make();say('Поехали!',true)},500)}}
function toggleFs(){if(!G||G.busy)return;G.fs=!G.fs;const el=document.documentElement;
 if(G.fs){try{(el.requestFullscreen||el.webkitRequestFullscreen).call(el).catch?.(()=>{})}catch(e){}}else if(document.fullscreenElement){try{document.exitFullscreen()}catch(e){}}
 setTimeout(()=>ROOT&&document.body.contains(ROOT)&&mount(ROOT,G),G.fs?250:150)}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&G&&G.fs&&!G.busy){G.fs=false;ROOT&&document.body.contains(ROOT)&&mount(ROOT,G)}});
let rzT=0;addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{if(G&&G.fs&&!G.busy&&ROOT&&document.body.contains(ROOT))mount(ROOT,G)},300)});
function bind(){let si=-1,sx=0,sy=0,done=false;
 const tools=ROOT.querySelector('.m3tools');tools.addEventListener('click',e=>{const b=e.target.closest('[data-m3]');if(!b)return;ac();if(b.dataset.m3==='snd'){MUTE=!MUTE;try{localStorage.setItem('m3mute',MUTE?'1':'0')}catch(_){}b.textContent=MUTE?'🔇':'🔊';if(MUTE)try{speechSynthesis.cancel()}catch(_){}else SND.coin()}else toggleFs()});
 const idx=e=>{const t=e.target.closest('.m3t');if(!t)return-1;const o=G&&G.c.findIndex(x=>x&&x.id===+t.dataset.id);return o};
 B.addEventListener('pointerdown',e=>{ac();if(!G||G.busy)return;si=idx(e);sx=e.clientX;sy=e.clientY;done=false;if(si>=0){const d=E[G.c[si].id];d&&d.classList.add('lift')}});
 B.addEventListener('pointermove',e=>{if(si<0||done||!G||G.busy)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)<S*.3)return;done=true;const r=Math.floor(si/N),c=si%N;let j=-1;
  if(Math.abs(dx)>Math.abs(dy)){if(dx>0&&c<N-1)j=si+1;if(dx<0&&c>0)j=si-1}else{if(dy>0&&r<N-1)j=si+N;if(dy<0&&r>0)j=si-N}
  B.querySelectorAll('.lift,.sel').forEach(x=>x.classList.remove('lift','sel'));const a=si;si=-1;G.sel=-1;if(j>=0)swap(a,j)});
 const up=e=>{B&&B.querySelectorAll('.lift').forEach(x=>x.classList.remove('lift'));if(si<0||done||!G||G.busy){si=-1;return}const a=si;si=-1;
  if(G.sel>=0&&G.sel!==a){const s=G.sel;G.sel=-1;B.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));const ra=Math.floor(s/N),rb=Math.floor(a/N);if((Math.abs(s-a)===1&&ra===rb)||Math.abs(s-a)===N){swap(s,a);return}}
  B.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));G.sel=a;const d=E[G.c[a].id];d&&d.classList.add('sel')};
 B.addEventListener('pointerup',up);B.addEventListener('pointercancel',()=>{si=-1});
 stage.addEventListener('pointermove',e=>{const b=stage.getBoundingClientRect();const x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;B.style.transform=`rotateX(${12-y*8}deg) rotateY(${x*8}deg)`});
 stage.addEventListener('pointerleave',()=>{B.style.transform=''})}
addEventListener('resize',()=>{size()});

window.M3={newGame:()=>({c:fresh(),score:0,moves:MOVES,got:{0:0,1:0},bonus:false}),mount,src,NM,GOALN,GOALBONUS,T,confetti:n=>{startLoop();confetti(n)}};
})();
