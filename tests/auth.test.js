import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeStudentData, authErrorMessage, getSession } from '../auth.js';
import { defaultConfig } from '../firmware.js';

test('student document preserves bench mode and the firmware configuration', () => {
  const config = { ...defaultConfig, mode: 'bench', board: 'esp32', invertLeft: true };
  const saved = sanitizeStudentData({ config });
  assert.deepEqual(saved.config, config);
  assert.deepEqual(sanitizeStudentData({ config: saved.config }).config, config);
});

test('malformed or missing documents use the same defaults as the code generator', () => {
  for (const value of [null, undefined, '', 42, {}]) {
    assert.deepEqual(sanitizeStudentData(value).config, defaultConfig);
  }
  assert.deepEqual(sanitizeStudentData({ config: { attack: null, distance: '' } }).config, defaultConfig);
});

test('user-controlled fields cannot add database paths or identity fields', () => {
  const malicious = JSON.parse('{"profile":{"name":"  Ana  ","robotName":"R","uid":"other"},"progress":{"completed":{"projeto":true,"../outro":true,"a/b":true,"__proto__":true,"constructor":true,"unread":false}},"admin":true,"uid":"someone-else","password":"secret","config":{"apiKey":"secret"}}');
  const saved = sanitizeStudentData(malicious);
  assert.deepEqual(saved.profile, { name: 'Ana', robotName: 'R' });
  assert.deepEqual(saved.progress.completed, { projeto: true });
  assert.equal(saved.admin, undefined);
  assert.equal(saved.uid, undefined);
  assert.equal(saved.password, undefined);
  assert.equal(saved.config.apiKey, undefined);
  assert.equal(Object.getPrototypeOf(saved.progress.completed), Object.prototype);
});

test('completed lesson arrays are converted to a bounded boolean map', () => {
  const saved = sanitizeStudentData({ progress: { completed: ['projeto', 'mecanica', 'bad/path'] } });
  assert.deepEqual(saved.progress.completed, { projeto: true, mecanica: true });
  const many = sanitizeStudentData({ progress: { completed: Array.from({ length: 80 }, (_, i) => `lesson${i}`) } });
  assert.equal(Object.keys(many.progress.completed).length, 40);
});

test('remote document sanitization constrains motor settings and completion data', () => {
  const saved = sanitizeStudentData({
    profile: { name: 'a'.repeat(200), robotName: 'b'.repeat(100) },
    progress: { quizScore: 999, assemblyChecked: 'true' },
    config: { attack: 999, search: -20, distance: 0, startDelay: 0, invertLeft: 'true', mode: 'unknown' }
  });
  assert.equal(saved.profile.name.length, 100);
  assert.equal(saved.profile.robotName.length, 60);
  assert.equal(saved.progress.quizScore, 100);
  assert.equal(saved.progress.assemblyChecked, false);
  assert.equal(saved.config.attack, 255);
  assert.equal(saved.config.search, 0);
  assert.equal(saved.config.distance, 5);
  assert.equal(saved.config.startDelay, 3000);
  assert.equal(saved.config.invertLeft, false);
  assert.equal(saved.config.mode, 'autonomous');
});

test('sanitization returns a snapshot independent from later form mutations', () => {
  const input = { profile: { name: 'Ana' }, progress: { completed: { projeto: true } }, config: { attack: 110 } };
  const saved = sanitizeStudentData(input);
  input.profile.name = 'Outra pessoa';
  input.progress.completed.projeto = false;
  input.config.attack = 255;
  assert.equal(saved.profile.name, 'Ana');
  assert.equal(saved.progress.completed.projeto, true);
  assert.equal(saved.config.attack, 110);
});

test('failed or uncertain requests never produce success messages', () => {
  assert.equal(getSession(), null);
  assert.match(authErrorMessage({ code: 'PERMISSION_DENIED' }), /não autorizou/);
  assert.match(authErrorMessage({ code: 'sumo/save-unconfirmed' }), /Não foi possível confirmar/);
  assert.match(authErrorMessage({ code: 'sumo/session-changed' }), /conta mudou/);
  assert.match(authErrorMessage({ code: 'auth/unauthorized-domain' }), /autorizado/);
});

test('database fragment retains UID checks and admits both generated firmware modes', () => {
  const fragment = JSON.parse(readFileSync(new URL('../firebase.rules.fragment.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(fragment), ['sumoLab']);
  const user = fragment.sumoLab.users.$uid;
  assert.match(user['.read'], /auth !== null && auth.uid === \$uid/);
  assert.match(user['.write'], /auth !== null && auth.uid === \$uid/);
  assert.equal(user.$other['.validate'], false);
  assert.match(user.config.mode['.validate'], /autonomous.*bench/);
  assert.match(user.config['.validate'], /'mode'/);
});
