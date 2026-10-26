(() => {
'use strict';
const $ = id => document.getElementById(id);
const APP = window.FIN_APP;
let sdk, auth, db, user = null;
let busy = false, ready = false, loading = false, queued = false;
let timer = null, editVersion = 0, knownRevision = null;

function status(message, kind = '') {
  $('cloudStatus').textContent = message;
  $('cloudStatus').className = 'small ' + kind;
  $('cloudBadge').textContent = !user ? 'Modo local' : ready ? 'Sincronização ativa' : 'Conta conectada';
  $('cloudBadge').className = 'pill ' + (ready ? 'positive' : '');
}
function buttons() {
  $('cloudLogin').disabled = !auth || !!user || busy;
  $('cloudLogout').disabled = !user || busy;
  $('cloudPull').disabled = !user || busy;
  $('cloudPush').disabled = !user || busy;
}
function explain(err) {
  const code = String(err?.code || '');
  if (code.includes('permission-denied')) return 'acesso negado: publique firestore.rules no Firebase Console e confira a conta Google';
  if (code.includes('unauthorized-domain')) return 'autorize josuecarpino.github.io em Authentication > Settings > Authorized domains';
  if (code.includes('operation-not-allowed')) return 'ative o provedor Google em Authentication > Sign-in method';
  if (code.includes('popup-blocked')) return 'permita pop-ups de login no navegador';
  if (code.includes('invalid-api-key')) return 'verifique a configuração Web do Firebase';
  if (code.includes('failed-precondition') || code.includes('not-found')) return 'verifique se o banco Firestore (default) foi criado';
  if (code.includes('unavailable') || code.includes('network-request-failed')) return 'servidor indisponível ou sem conexão; dados locais preservados';
  if (code.includes('resource-exhausted')) return 'cota do serviço atingida';
  return String(err?.message || err).slice(0, 180);
}
function documentRef() { return sdk.doc(db, 'users', user.uid, 'finance', 'plan'); }
function revision(snap) {
  if (!snap.exists()) return null;
  const t = snap.data()?.updatedAt;
  return t && typeof t.seconds === 'number' ? t.seconds + ':' + (t.nanoseconds || 0) : 'sem-revisao';
}
function queueSave() {
  if (!user || !ready || loading) return;
  if (busy) { queued = true; return; }
  clearTimeout(timer);
  timer = setTimeout(() => save(false), 1200);
  status('Alterações salvas no dispositivo. Envio à nuvem pendente...');
}

async function save(manual) {
  if (!user || !sdk) return;
  if (!manual && !ready) return;
  if (busy) { if (!manual) queued = true; return; }
  clearTimeout(timer);
  const uid = user.uid;
  const savedVersion = editVersion;
  const snapshot = APP.validate(APP.get());
  busy = true; buttons();
  status(manual ? 'Conferindo e enviando dados...' : 'Sincronizando alterações...');
  try {
    const ref = documentRef();
    // Leitura do servidor: não confiar no cache ao decidir sobrescrever dados de outro dispositivo.
    const previous = await sdk.getDocFromServer(ref);
    if (!user || user.uid !== uid) return;
    const currentRevision = revision(previous);
    const changedElsewhere = currentRevision !== knownRevision;
    if (!manual && changedElsewhere) {
      ready = false;
      status('Conflito: o plano mudou na nuvem. Faça Backup JSON, depois escolha Carregar da nuvem ou Enviar à nuvem para decidir qual manter.', 'negative');
      return;
    }
    if (manual && previous.exists() && changedElsewhere &&
      !confirm('Há um plano salvo na nuvem. Enviar o plano deste dispositivo irá SUBSTITUIR a versão remota. Deseja continuar?')) {
      status('Envio cancelado. Os dados locais foram preservados.');
      return;
    }
    await sdk.setDoc(ref, { schemaVersion: 2, payload: snapshot, updatedAt: sdk.serverTimestamp() });
    // Confirmar timestamp real, usado para detectar alterações externas na próxima sincronização.
    const confirmed = await sdk.getDocFromServer(ref);
    if (!confirmed.exists()) throw Error('A gravação não pôde ser confirmada no servidor.');
    if (!user || user.uid !== uid) return;
    knownRevision = revision(confirmed);
    ready = true;
    status('Salvo na nuvem e confirmado. Suas próximas alterações serão sincronizadas automaticamente.', 'positive');
    if (editVersion !== savedVersion) queued = true;
  } catch (err) {
    ready = false;
    status('Não foi possível confirmar o salvamento na nuvem: ' + explain(err) + '. Os dados locais permanecem no navegador.', 'negative');
  } finally {
    busy = false; buttons();
    if (queued && ready && user?.uid === uid) {
      queued = false;
      clearTimeout(timer);
      timer = setTimeout(() => save(false), 500);
    } else queued = false;
  }
}
async function load() {
  if (!user || !sdk || busy) return;
  clearTimeout(timer);
  busy = true; buttons();
  status('Consultando a cópia remota...');
  try {
    const snap = await sdk.getDocFromServer(documentRef());
    if (!snap.exists()) {
      status('Ainda não há plano salvo nesta conta. Use Enviar à nuvem para criar sua primeira cópia.');
      return;
    }
    const remote = APP.validate(snap.data().payload);
    if (!confirm('Carregar o plano da nuvem irá SUBSTITUIR o plano deste dispositivo. Faça Backup JSON antes de continuar. Confirmar?')) {
      status('Importação da nuvem cancelada; os dados locais estão intactos.');
      return;
    }
    loading = true;
    ready = false;
    APP.replace(remote);
    editVersion = 0; queued = false;
    knownRevision = revision(snap);
    ready = true;
    status('Plano recuperado da nuvem. Alterações futuras serão sincronizadas automaticamente.', 'positive');
  } catch (err) {
    status('Falha ao carregar a nuvem: ' + explain(err) + '. Os dados locais foram preservados.', 'negative');
  } finally {
    loading = false; busy = false; buttons();
  }
}
document.addEventListener('fin-changed', () => {
  if (loading) return;
  editVersion++;
  queueSave();
});
$('cloudLogin').addEventListener('click', async () => {
  if (!auth) return;
  try { await sdk.signInWithPopup(auth, new sdk.GoogleAuthProvider()); }
  catch (err) { status('Não foi possível entrar: ' + explain(err), 'negative'); }
});
$('cloudLogout').addEventListener('click', async () => {
  if (!auth || busy) return;
  clearTimeout(timer);
  try { await sdk.signOut(auth); }
  catch (err) { status('Não foi possível sair: ' + explain(err), 'negative'); }
});
$('cloudPull').addEventListener('click', load);
$('cloudPush').addEventListener('click', () => save(true));

async function init() {
  const config = window.FIN_FIREBASE_CONFIG;
  if (!config?.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    status('Modo local: configuração Firebase ainda não preenchida.'); buttons(); return;
  }
  try {
    const version = '12.7.0';
    const [appSDK, authSDK, fireSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/' + version + '/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/' + version + '/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/' + version + '/firebase-firestore.js')
    ]);
    sdk = { ...authSDK, ...fireSDK };
    const app = appSDK.getApps().length ? appSDK.getApp() : appSDK.initializeApp(config);
    auth = authSDK.getAuth(app);
    db = fireSDK.getFirestore(app);
    authSDK.onAuthStateChanged(auth, value => {
      const previousUid = user?.uid;
      if (previousUid && previousUid === value?.uid) return;
      user = value;
      ready = false; knownRevision = null; queued = false; editVersion = 0;
      clearTimeout(timer);
      buttons();
      status(value
        ? 'Google conectado. Clique Carregar da nuvem ou Enviar à nuvem para iniciar a sincronização.'
        : 'Não conectado. Dados continuam salvos somente neste dispositivo.');
    });
    buttons();
  } catch (err) {
    status('Firebase não inicializou: ' + explain(err) + '. O modo local continua disponível.', 'negative');
    buttons();
  }
}
init();
})();