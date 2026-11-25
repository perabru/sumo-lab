import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateFirmware, sanitizeConfig, defaultConfig, boardPins } from '../firmware.js';

test('saved or malformed settings cannot escape board and mode choices', () => {
  const settings = sanitizeConfig({ board: 'x;danger()', mode: 'remote', edgeLevel: 'LOW;danger()', invertLeft: 'false', invertRight: 'true' });
  assert.equal(settings.board, 'uno');
  assert.equal(settings.mode, 'autonomous');
  assert.equal(settings.edgeLevel, 'LOW');
  assert.equal(settings.invertLeft, false);
  assert.equal(settings.invertRight, false);
  assert.deepEqual(sanitizeConfig(null), defaultConfig);
});

test('motor output and movement timers are bounded before code generation', () => {
  const low = sanitizeConfig({ attack: -1, search: -20, escape: -300, distance: 1, startDelay: 0, escapeMs: 0, turnMs: -1 });
  assert.deepEqual([low.attack, low.search, low.escape, low.distance, low.startDelay, low.escapeMs, low.turnMs], [0, 0, 0, 5, 3000, 100, 100]);
  const high = sanitizeConfig({ attack: 256, search: 300, escape: 999, distance: 900, startDelay: 20000, escapeMs: 2000, turnMs: 1001 });
  assert.deepEqual([high.attack, high.search, high.escape, high.distance, high.startDelay, high.escapeMs, high.turnMs], [255, 255, 255, 100, 10000, 1000, 1000]);
  assert.equal(sanitizeConfig({ attack: '64.4' }).attack, 64);
  for (const invalid of ['', null, undefined, NaN, Infinity, '255; injected()']) {
    assert.equal(sanitizeConfig({ attack: invalid }).attack, defaultConfig.attack);
  }
});

test('board pin assignments are unique and match downloadable wiring', () => {
  for (const pins of Object.values(boardPins)) assert.equal(new Set(Object.values(pins)).size, Object.keys(pins).length);
  assert.deepEqual(boardPins.uno, { ena: 5, enb: 6, in1: 10, in2: 11, in3: 9, in4: 8, trig: 2, echo: 3, lineLeft: 12, lineRight: 13 });
  assert.deepEqual(boardPins.esp32, { ena: 25, enb: 26, in1: 18, in2: 19, in3: 21, in4: 22, trig: 23, echo: 34, lineLeft: 32, lineRight: 33 });
});

test('all four downloadable examples stay synchronized with the live generator', async () => {
  for (const board of ['uno', 'esp32']) {
    for (const mode of ['autonomous', 'bench']) {
      const filename = `${mode === 'bench' ? 'teste-bancada' : 'sumo'}-${board}.ino`;
      const contents = await readFile(new URL(`../downloads/${filename}`, import.meta.url), 'utf8');
      assert.equal(contents, generateFirmware({ board, mode }), filename);
    }
  }
});
