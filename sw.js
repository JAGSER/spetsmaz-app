// Без офлайн-кэша: только установка на экран и уведомления
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>self.clients.claim());
self.addEventListener('fetch',()=>{});
self.addEventListener('push',e=>{let d={};try{d=e.data.json()}catch(_){d={title:'Новый пост',body:e.data?e.data.text():''}}e.waitUntil(self.registration.showNotification(d.title||'Спецмазь',{body:d.body||'',icon:'icon2-192.png',data:d.url||'./'}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow(e.notification.data||'./'))});
