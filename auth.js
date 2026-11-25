// Firebase loads asynchronously; public lessons do not depend on its availability.
import { sanitizeConfig } from './firmware.js';
export const firebaseConfig = Object.freeze({
  apiKey: 'AIzaSyBlilwGS8qmTYpNMDaCXOaJbfFZFG3w_i8',
  authDomain: 'controle-de-leito.firebaseapp.com',
  databaseURL: 'https://controle-de-leito.firebaseio.com',
  projectId: 'controle-de-leito',
  storageBucket: 'controle-de-leito.firebasestorage.app',
  messagingSenderId: '534040143959',
  appId: '1:534040143959:web:fa66003cce0e84b4d79b12'
});

// Per-student rules published after owner approval on 2026-11-25.
export const CLOUD_SYNC_ENABLED = true;
const SDK = 'https://www.gstatic.com/firebasejs/13.4.0/';
const listeners = new Set();
let session = null;
let status = { loading: false, error: null };
let initialization;
let unsubscribeFirebase;

function codedError(code, message) {
  return Object.assign(new Error(message), { code });
}

function timed(promise, ms = 15000, code = 'sumo/timeout') {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(codedError(code, 'O servidor não respondeu a tempo.')), ms); })
  ]).finally(() => clearTimeout(timer));
}

function normalizeUser(user) {
  if (!user) return null;
  return Object.freeze({
    uid: user.uid,
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    emailVerified: Boolean(user.emailVerified)
  });
}

function publish(user, nextStatus = { loading: false, error: null }) {
  session = normalizeUser(user);
  status = nextStatus;
  for (const callback of listeners) {
    try { callback(session, { ...status }); } catch (error) { console.error('Falha ao atualizar a área do aluno.', error); }
  }
}

async function initialize() {
  if (initialization) return initialization;
  status = { loading: true, error: null };
  for (const callback of listeners) callback(session, { ...status });
  initialization = timed(Promise.all([
    import(`${SDK}firebase-app.js`),
    import(`${SDK}firebase-auth.js`),
    import(`${SDK}firebase-database.js`)
  ])).then(async ([appSDK, authSDK, databaseSDK]) => {
    const app = appSDK.getApps().find(item => item.name === 'sumo-lab') || appSDK.initializeApp(firebaseConfig, 'sumo-lab');
    const auth = authSDK.getAuth(app);
    auth.languageCode = 'pt-BR';
    // Firebase handles its standard browser persistence. It never stores passwords here.
    if (unsubscribeFirebase) unsubscribeFirebase();
    unsubscribeFirebase = authSDK.onAuthStateChanged(auth,
      user => publish(user),
      error => publish(null, { loading: false, error })
    );
    await timed(auth.authStateReady());
    return { authSDK, databaseSDK, auth, database: databaseSDK.getDatabase(app) };
  }).catch(error => {
    initialization = undefined;
    publish(null, { loading: false, error });
    throw error;
  });
  return initialization;
}

/** Current verified Firebase identity, or null. Check subscribeAuth status while loading. */
export function getSession() { return session; }

/** Callback receives (user|null, {loading, error}); return value unsubscribes. */
export function subscribeAuth(callback) {
  if (typeof callback !== 'function') throw new TypeError('Informe uma função para acompanhar a sessão.');
  listeners.add(callback);
  callback(session, { ...status });
  initialize().catch(() => {}); // errors are delivered through the callback
  return () => listeners.delete(callback);
}

export async function signInGoogle() {
  const { authSDK, auth } = await initialize();
  const provider = new authSDK.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Called by the UI from a click. No access to Gmail or extra OAuth scopes is requested.
  const result = await authSDK.signInWithPopup(auth, provider);
  publish(result.user);
  return session;
}

export async function signInEmail(email, password) {
  const { authSDK, auth } = await initialize();
  const result = await timed(authSDK.signInWithEmailAndPassword(auth, String(email || '').trim(), password), 25000);
  publish(result.user);
  return session;
}

export async function signUpEmail(name, email, password) {
  const displayName = String(name || '').trim().slice(0, 100);
  if (displayName.length < 2) throw codedError('sumo/name-required', 'Digite seu nome completo.');
  if (typeof password !== 'string' || password.length < 8) throw codedError('sumo/weak-password', 'Use uma senha com pelo menos 8 caracteres.');
  const { authSDK, auth } = await initialize();
  const result = await timed(authSDK.createUserWithEmailAndPassword(auth, String(email || '').trim(), password), 25000);
  try {
    await timed(authSDK.updateProfile(result.user, { displayName }), 15000);
  } catch (error) {
    // The account already exists at this point; don't mislead the user into registering again.
    publish(result.user, { loading: false, error: codedError('sumo/profile-pending', 'Conta criada. Não foi possível atualizar o nome; você pode preenchê-lo na área do aluno.') });
    return session;
  }
  publish(result.user);
  return session;
}

export async function resetPassword(email) {
  const { authSDK, auth } = await initialize();
  await timed(authSDK.sendPasswordResetEmail(auth, String(email || '').trim()), 25000);
}

export async function logout() {
  const { authSDK, auth } = await initialize();
  await authSDK.signOut(auth);
  publish(null);
}

function numberWithin(value, low, high, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(low, Math.min(high, Math.round(number))) : fallback;
}

/** Whitelists the small student document. No passwords, tokens or arbitrary paths. */
export function sanitizeStudentData(data = {}) {
  if (!data || typeof data !== 'object') data = {};
  const profile = data.profile || {};
  const progress = data.progress || {};
  const completed = {};
  const entries = Array.isArray(progress.completed)
    ? progress.completed.map(id => [String(id), true]) : Object.entries(progress.completed || {});
  for (const [key, value] of entries.slice(0, 40)) {
    if (/^[a-zA-Z0-9_-]{1,64}$/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key) && value === true) completed[key] = true;
  }
  return {
    schemaVersion: 1,
    profile: {
      name: String(profile.name || session?.displayName || '').trim().slice(0, 100),
      robotName: String(profile.robotName || '').trim().slice(0, 60)
    },
    progress: {
      completed,
      quizScore: numberWithin(progress.quizScore, 0, 100, 0),
      assemblyChecked: progress.assemblyChecked === true
    },
    config: sanitizeConfig(data.config)
  };
}

function ensureIdentity(auth, expectedUid) {
  if (!expectedUid || !auth.currentUser) throw codedError('sumo/sign-in-required', 'Entre na sua conta para sincronizar.');
  if (auth.currentUser.uid !== expectedUid || session?.uid !== expectedUid) {
    throw codedError('sumo/session-changed', 'A conta mudou durante a operação. Confira os dados e tente novamente.');
  }
}

async function authenticatedContext(expectedUid) {
  const context = await initialize();
  ensureIdentity(context.auth, expectedUid);
  const user = context.auth.currentUser;
  return { ...context, user };
}

export async function saveStudentData(data) {
  if (!CLOUD_SYNC_ENABLED) throw codedError('sumo/cloud-pending', 'Configurações salvas neste dispositivo. A sincronização aguarda a proteção do banco pelo responsável.');
  // Bind both content and identity before the first await: a tab/account switch must
  // never upload the previous student's document into a different student's UID.
  const expectedUid = session?.uid;
  const snapshot = sanitizeStudentData(data);
  const { databaseSDK, database, user, auth } = await authenticatedContext(expectedUid);
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw codedError('sumo/offline', 'Sem internet. Sua configuração ainda não foi sincronizada.');
  const payload = { ...snapshot, updatedAt: databaseSDK.serverTimestamp() };
  const target = databaseSDK.ref(database, `sumoLab/users/${user.uid}`);
  // Resolves only after a server acknowledgement. Timeout is explicitly an uncertain result.
  await timed(databaseSDK.set(target, payload), 18000, 'sumo/save-unconfirmed');
  ensureIdentity(auth, expectedUid);
  return { ...payload, updatedAt: Date.now() };
}

export async function loadStudentData() {
  if (!CLOUD_SYNC_ENABLED) throw codedError('sumo/cloud-pending', 'Configurações salvas neste dispositivo. A sincronização aguarda a proteção do banco pelo responsável.');
  const expectedUid = session?.uid;
  const { databaseSDK, database, user, auth } = await authenticatedContext(expectedUid);
  const snapshot = await timed(databaseSDK.get(databaseSDK.ref(database, `sumoLab/users/${user.uid}`)), 15000);
  ensureIdentity(auth, expectedUid);
  return snapshot.exists() ? sanitizeStudentData(snapshot.val()) : null;
}

export function authErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase();
  const messages = {
    'auth/invalid-email': 'Confira o endereço de e-mail.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já tem uma conta. Entre ou redefina a senha.',
    'auth/weak-password': 'Use uma senha mais forte, com pelo menos 8 caracteres.',
    'auth/password-does-not-meet-requirements': 'A senha não atende aos requisitos definidos pelo administrador.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/user-disabled': 'Esta conta está desativada. Procure o responsável pelo curso.',
    'auth/popup-closed-by-user': 'A janela de login foi fechada. Tente novamente quando quiser.',
    'auth/popup-blocked': 'Permita a janela de login neste navegador e toque novamente em Entrar com Google.',
    'auth/cancelled-popup-request': 'Há outra janela de login aberta. Conclua o acesso nela.',
    'auth/unauthorized-domain': 'O domínio deste site precisa ser autorizado no Firebase Authentication.',
    'auth/operation-not-allowed': 'Este método de login ainda precisa ser habilitado no Firebase.',
    'auth/configuration-not-found': 'O Firebase Authentication ainda precisa ser configurado neste projeto.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'A configuração do Firebase precisa ser conferida pelo administrador.',
    'auth/invalid-api-key': 'A chave do Firebase precisa ser conferida pelo administrador.',
    'auth/network-request-failed': 'Não foi possível acessar o Firebase. Confira sua conexão e tente novamente.',
    'auth/account-exists-with-different-credential': 'Este e-mail já usa outro método de entrada. Entre pelo método utilizado no cadastro.',
    'permission_denied': 'O banco não autorizou a operação. As regras do Sumô Lab precisam ser configuradas pelo administrador.',
    'database/permission-denied': 'O banco não autorizou a operação. Confira as regras do Sumô Lab no Firebase.',
    'sumo/save-unconfirmed': 'Não foi possível confirmar o salvamento. A operação pode sincronizar quando a conexão voltar; tente novamente com a versão mais recente.',
    'sumo/cloud-pending': 'Configurações salvas neste dispositivo. A sincronização aguarda a proteção do banco pelo responsável.',
    'sumo/timeout': 'O servidor demorou a responder. Confira a conexão e tente novamente.',
    'sumo/offline': 'Sem internet. Sua configuração ainda não foi sincronizada.',
    'sumo/sign-in-required': 'Entre na sua conta para sincronizar.',
    'sumo/session-changed': 'A conta mudou durante a operação. Confira os dados e tente novamente.',
    'sumo/name-required': 'Digite seu nome completo.',
    'sumo/weak-password': 'Use uma senha com pelo menos 8 caracteres.',
    'sumo/profile-pending': 'Conta criada. Preencha seu nome na área do aluno.'
  };
  if (messages[code]) return messages[code];
  if (String(error?.message || '').toLowerCase().includes('permission_denied')) return messages.permission_denied;
  return 'Não foi possível concluir agora. Verifique sua conexão e tente novamente.';
}
