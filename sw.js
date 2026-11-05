/* Apenas shell estático e público; nunca guardar respostas de API ou dados do usuário. */
const CACHE='pcsp-financeiro-static-v3-1';
const SHELL=['./','./index.html','./style.css','./v3.css','./app.js','./cloud.js','./v3.js','./v3-advanced.js','./amortization.js','./firebase-config.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pcsp-financeiro-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 const pathname=new URL(event.request.url).pathname;
 const isAppFile=SHELL.some(path=>pathname.endsWith(path.replace('./','/'))) || pathname.endsWith('/planejador-financeiro-pcesp/');
 if(!isAppFile)return;
 event.respondWith(fetch(event.request).then(response=>{
   if(response.ok&&response.type==='basic'){
    const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
   }
   return response;
  }).catch(()=>caches.match(event.request)));
});