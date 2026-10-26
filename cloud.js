(() => {
'use strict';
const $=id=>document.getElementById(id), APP=window.FIN_APP;
let sdk=null,auth=null,db=null,user=null,busy=false,ready=false,timer=null;
function status(msg,type=''){const el=$('cloudStatus');el.textContent=msg;el.className='small '+type;$('cloudBadge').textContent=user?'Conta Google conectada':'Modo local';$('cloudBadge').className='pill '+(user?'positive':'');}
function buttons(){$('cloudLogin').disabled=!auth||!!user||busy;$('cloudLogout').disabled=!user||busy;$('cloudPull').disabled=!user||busy;$('cloudPush').disabled=!user||busy;}
function description(e){const code=String(e?.code||'');if(code.includes('permission-denied'))return 'acesso negado pelas regras do Firestore; publique as regras atualizadas';if(code.includes('unauthorized-domain'))return 'adicione josuecarpino.github.io aos domínios autorizados do Firebase Authentication';return String(e?.message||e).slice(0,160);}
function docref(){return sdk.doc(db,'users',user.uid,'finance','plan');}
async function send(auto=false){
 if(!user||busy||!sdk)return;
 busy=true;buttons();if(!auto)status('Verificando e salvando plano na nuvem...');
 try{
  const remote=await sdk.getDoc(docref());
  if(!auto&&remote.exists()&&!confirm('Existe um plano na nuvem. Substituir a versão remota pela versão deste dispositivo?')){status('Envio cancelado. Seus dados locais continuam preservados.');return;}
  await sdk.setDoc(docref(),{schemaVersion:2,payload:APP.get(),updatedAt:sdk.serverTimestamp()});
  ready=true;status('Plano sincronizado na nuvem. Alterações neste dispositivo serão enviadas automaticamente.','positive');
 }catch(e){ready=false;status('Erro ao salvar na nuvem: '+description(e)+'. O backup local continua disponível.','negative');}
 finally{busy=false;buttons();}
}
async function receive(){
 if(!user||busy||!sdk)return;
 busy=true;buttons();status('Consultando a nuvem...');
 try{
  const snap=await sdk.getDoc(docref());
  if(!snap.exists()){status('Ainda não existe plano salvo nesta conta. Clique em Enviar à nuvem para criar.');return;}
  const validated=APP.validate(snap.data().payload);
  if(!confirm('Carregar este plano da nuvem e substituir as premissas e lançamentos locais? Faça backup JSON primeiro se desejar preservar sua versão atual.')){status('Carregamento cancelado.');return;}
  APP.replace(validated);ready=true;status('Plano restaurado da nuvem. Sincronização automática de novas alterações ativa.','positive');
 }catch(e){status('Erro ao carregar: '+description(e),'negative');}
 finally{busy=false;buttons();}
}
function changed(){
 if(!user||!ready)return;
 clearTimeout(timer);
 timer=setTimeout(()=>{if(!busy)send(true);},1100);
 status('Alterações locais salvas. Sincronização automática pendente...');
}
$('cloudLogin').addEventListener('click',async()=>{if(!auth)return;try{await sdk.signInWithPopup(auth,new sdk.GoogleAuthProvider());}catch(e){status('Não foi possível entrar: '+description(e),'negative');}});
$('cloudLogout').addEventListener('click',async()=>{if(!auth)return;clearTimeout(timer);ready=false;try{await sdk.signOut(auth);}catch(e){status('Erro ao sair: '+description(e),'negative');}});
$('cloudPull').addEventListener('click',receive);$('cloudPush').addEventListener('click',()=>send(false));
document.addEventListener('fin-changed',changed);
async function init(){
 const c=window.FIN_FIREBASE_CONFIG;
 if(!c||!c.apiKey||!c.authDomain||!c.projectId||!c.appId){status('Modo local ativo. Configure firebase-config.js na raiz do projeto para salvar online.');buttons();return;}
 try{
  const v='12.7.0';
  const [appModule,authModule,dbModule]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/'+v+'/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/'+v+'/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/'+v+'/firebase-firestore.js')]);
  sdk={...authModule,...dbModule};
  const app=appModule.getApps().length?appModule.getApp():appModule.initializeApp(c);
  auth=authModule.getAuth(app);db=dbModule.getFirestore(app);
  authModule.onAuthStateChanged(auth,u=>{
   user=u;ready=false;clearTimeout(timer);buttons();
   status(u?'Login concluído. Escolha Carregar da nuvem ou Enviar à nuvem para iniciar a sincronização.':'Não conectado. O aplicativo continua salvando neste dispositivo.',u?'positive':'');
  });
  buttons();
 }catch(e){status('Firebase indisponível: '+description(e)+'. Modo local continua funcionando.','negative');buttons();}
}
init();
})();