// Общий модуль страниц тем и статей: Диск, запросы к Claude через «Помощника», синхронизация тем
(function(){
const API='https://cloud-api.yandex.net/v1/disk';
const DISK_KEY='https://yadi.sk/d/iDTvVSSsPP7QtA';
const DISK_PATH='disk:/Клиенты/Спецмазь/Реклама 2026/Посты';
const enc=encodeURIComponent;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const token=()=>LS.get('sm_token','')||'';

// ---------- Диск ----------
async function readPublic(name){
 const r=await fetch(`${API}/public/resources?public_key=${enc(DISK_KEY)}&path=${enc('/'+name)}`);
 if(r.status===404)return null;if(!r.ok)throw new Error('disk '+r.status);
 const j=await r.json();if(!j.file)return null;
 const f=await fetch(j.file+(j.file.includes('?')?'&':'?')+'nc='+Date.now());if(!f.ok)throw new Error('disk file '+f.status);return f.json()}
// чтение как у основного приложения: через публичную ссылку папки (надёжно со страницы сайта);
// ссылка на скачивание с ключом остаётся запасным путём
async function readAuth(name){
 try{return await readPublic(name)}catch(e){console.log('readPublic',name,e)}
 const t=token();if(!t)return readPublic(name);
 const r=await fetch(`${API}/resources/download?path=${enc(DISK_PATH+'/'+name)}`,{headers:{Authorization:'OAuth '+t}});
 if(r.status===404)return null;if(r.status===401){LS.set('sm_token','');return readPublic(name)}if(!r.ok)throw new Error('disk '+r.status);
 const {href}=await r.json();const f=await fetch(href);if(!f.ok)throw new Error('disk file '+f.status);return f.json()}
async function write(name,obj){
 const t=token();if(!t)throw {code:'notoken'};
 const u=await fetch(`${API}/resources/upload?path=${enc(DISK_PATH+'/'+name)}&overwrite=true`,{headers:{Authorization:'OAuth '+t}});
 if(u.status===401){LS.set('sm_token','');throw {code:'notoken'}}if(!u.ok)throw {code:'up'+u.status};
 const {href}=await u.json();const r=await fetch(href,{method:'PUT',body:new Blob([JSON.stringify(obj)],{type:'application/json'})});
 if(r.status>=300)throw {code:'put'+r.status}}
async function checkToken(v){const r=await fetch(API+'/',{headers:{Authorization:'OAuth '+v}});if(r.ok){LS.set('sm_token',v);return true}return false}

// ---------- Claude через сервер «Помощника» (ключ только там) ----------
let HF=null,HREADY=null,HID=0;const HW={};
function helper(){if(HREADY)return HREADY;HREADY=new Promise(res=>{HF=document.createElement('iframe');HF.style.display='none';HF.src='https://pomoshnik.ai/topics-helper.html';
 addEventListener('message',e=>{if(e.origin!=='https://pomoshnik.ai')return;const d=e.data||{};if(d.type==='topics-ready')res();if(d.type==='topics-res'&&HW[d.id]){HW[d.id](d);delete HW[d.id]}});
 document.body.appendChild(HF)});return HREADY}
async function ask1(prompt,system){await helper();const id=++HID;return new Promise((res,rej)=>{const t=setTimeout(()=>{delete HW[id];rej(new Error('нет ответа'))},600000);
 HW[id]=d=>{clearTimeout(t);res(d)};HF.contentWindow.postMessage({type:'topics',id,prompt,system},'https://pomoshnik.ai')})}
async function ask(prompt,system,onWait){
 for(let a=1;a<=40;a++){
  let d;try{d=await ask1(prompt,system)}catch(e){d={error:e.message,status:529}}
  if(d.text)return d.text;
  if(d.status&&![429,500,502,503,529].includes(d.status)&&d.error!=='busy')throw new Error(d.error||'ошибка');
  if(onWait)onWait('API занят, жду… попытка '+a);await new Promise(r=>setTimeout(r,15000));
 }
 throw new Error('API долго занят, попробуйте позже')}

// ---------- Темы: общая база на Диске (_topics.json), чтобы список был одинаковым на всех устройствах ----------
let topicsRemote=null,topicsPushT=null;
async function loadTopicsRemote(){try{topicsRemote=(await readPublic('_topics.json'))||{}}catch(e){topicsRemote=topicsRemote||{}}return topicsRemote}
// data: {v,s,updatedAt}; вернёт более свежую версию (локальную или с Диска)
async function syncTopics(store,local){
 const R=await loadTopicsRemote();const r=R[store];
 if(r&&r.data&&r.data.v===(local&&local.v)&&(r.data.updatedAt||0)>((local&&local.updatedAt)||0)){LS.set(store,r.data);return r.data}
 return local}
function pushTopics(store,data,onState){clearTimeout(topicsPushT);if(!token()){onState&&onState('local');return}
 topicsPushT=setTimeout(async()=>{try{const R=(await readAuth('_topics.json'))||{};const r=R[store];
  if(!(r&&r.data&&(r.data.updatedAt||0)>(data.updatedAt||0)))R[store]={data};
  await write('_topics.json',R);onState&&onState('ok')}catch(e){console.log('pushTopics',e);onState&&onState(e&&e.code==='notoken'?'local':'err',(e&&(e.message||e.code))||String(e))}},1500)}

// ---------- окно подключения Диска ----------
function connectBox(onOk){
 const w=document.createElement('div');w.className='kit-modal';
 w.innerHTML=`<div class="kit-box"><h3>Подключите Диск</h3><p>Чтобы статьи и темы сохранялись в общую базу и отправлялись на сайт, нужен ключ Диска. Откройте «Полигон Диска», нажмите «Получить OAuth-токен», скопируйте и вставьте сюда. Это нужно один раз на этом устройстве.</p>
 <a class="kit-btn ghost" href="https://yandex.ru/dev/disk/poligon/" target="_blank" rel="noopener">Открыть Полигон Диска</a>
 <div class="kit-row"><input placeholder="Вставьте токен"><button class="kit-btn">ОК</button></div><button class="kit-x">Закрыть</button></div>`;
 document.body.appendChild(w);
 w.querySelector('.kit-x').onclick=()=>w.remove();
 w.querySelector('.kit-row .kit-btn').onclick=async()=>{const v=w.querySelector('input').value.trim();if(!v)return;
  if(await checkToken(v)){w.remove();onOk&&onOk()}else alert('Токен не подошёл')}}
const css=document.createElement('style');css.textContent=`.kit-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:50;padding:14px}
.kit-box{background:#fff;color:#1d1b1a;border-radius:20px;padding:18px;max-width:460px;width:100%;font-size:17px;line-height:1.45}
.kit-box h3{margin:0 0 8px;font-size:21px}.kit-row{display:flex;gap:8px;margin-top:10px}.kit-row input{flex:1;font:inherit;padding:9px 12px;border:1px solid #ddd;border-radius:11px;min-width:0}
.kit-btn{display:inline-block;background:var(--acc,#1E9E58);color:#fff;font-weight:800;padding:9px 14px;border-radius:12px;border:0;font:inherit;font-weight:800;cursor:pointer;text-decoration:none}
.kit-btn.ghost{background:var(--soft,#eee);color:var(--acc2,#157A43)}.kit-x{margin-top:12px;background:none;border:0;color:#8a8580;font:inherit;cursor:pointer}`;
document.head.appendChild(css);

window.Kit={API,DISK_KEY,DISK_PATH,LS,token,readPublic,readAuth,write,checkToken,ask,syncTopics,pushTopics,connectBox};
})();
