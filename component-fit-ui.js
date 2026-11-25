import { componentPresets, checkFit, defaultPlacement } from './fit-checker.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let instanceNumber = 0;
const STYLE = `
.fitlab{--fit-purple:#6e39d4;--fit-blue:#00bad5;--fit-line:#e6e1ee;color:#302b41;font-family:inherit;font-size:15px;line-height:1.5;font-weight:400;margin-top:24px}
.fitlab *{box-sizing:border-box}.fitlab h3{font-size:22px;margin:0 0 5px}.fitlab h4{font-size:16px;margin:0 0 10px}.fitlab p{margin:0 0 12px}.fitlab small{font-size:13px;line-height:1.45;color:#655e74;display:block}
.fitlab .fit-intro{max-width:850px;color:#655e74}.fitlab .fit-layout{display:grid;grid-template-columns:minmax(280px,1.12fr) minmax(260px,1fr);gap:22px;margin-top:18px}
.fitlab .fit-surface,.fitlab .fit-controls{border:1px solid var(--fit-line);border-radius:16px;background:#fff;padding:18px;min-width:0}
.fitlab .fit-plan{display:block;width:100%;height:360px;max-height:70vh;background:#fcfbff;border:1px solid var(--fit-line);border-radius:12px;touch-action:none;outline-offset:3px}
.fitlab .fit-plan:focus-visible{outline:3px solid var(--fit-blue)}.fitlab .fit-plan [data-part]{cursor:grab}.fitlab .fit-plan.dragging [data-part]{cursor:grabbing}
.fitlab .fit-legend{display:flex;gap:14px;flex-wrap:wrap;margin:10px 0;font-size:13px}.fitlab .fit-legend span:before{content:'';display:inline-block;width:10px;height:10px;border-radius:3px;background:#a189d7;margin-right:6px}.fitlab .fit-legend span:last-child:before{background:#69d4df;border:1px dashed #058799}
.fitlab .fit-options{display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;margin:8px 0 18px}.fitlab .fit-choice{display:flex;align-items:center;gap:8px;line-height:1.35;cursor:pointer;min-height:30px}.fitlab input[type=checkbox],.fitlab input[type=radio]{accent-color:var(--fit-purple);width:17px;height:17px;margin:0;flex-shrink:0}
.fitlab .fit-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fitlab .fit-fields .fit-wide{grid-column:1/-1}.fitlab label.fit-field{display:flex;flex-direction:column;gap:5px;font-size:14px;font-weight:600}.fitlab input[type=number],.fitlab select{width:100%;min-height:42px;padding:8px 10px;border:1px solid #d8d0e4;border-radius:9px;background:#fff;font:inherit;color:inherit}.fitlab input:focus-visible,.fitlab select:focus-visible{outline:3px solid #c6f2f8;outline-offset:1px;border-color:#00a9bf}.fitlab select{appearance:auto}
.fitlab .fit-disclosure{border-top:1px solid var(--fit-line);padding:15px 0 0;margin-top:18px}.fitlab .fit-disclosure>summary{cursor:pointer;font-size:15px;font-weight:650;color:#57368b;list-style-position:inside}.fitlab .fit-disclosure[open]>summary{margin-bottom:15px}.fitlab .fit-disclosure>summary:focus-visible{outline:3px solid var(--fit-blue);outline-offset:4px}.fitlab .fit-short-help{margin-top:8px;font-size:13px;color:#655e74}.fitlab .fit-separator{border:0;border-top:1px solid var(--fit-line);margin:18px 0}.fitlab .fit-actions{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0 10px}.fitlab button{border:1px solid #d8d0e4;border-radius:9px;background:#fff;color:#47365e;padding:10px 13px;font-family:inherit;font-size:14px;line-height:1.2;font-weight:600;cursor:pointer}.fitlab button:hover{border-color:var(--fit-purple);background:#f8f4ff}.fitlab button.fit-primary{background:var(--fit-purple);color:#fff;border-color:var(--fit-purple)}.fitlab button:disabled{opacity:.5;cursor:default}.fitlab button:focus-visible{outline:3px solid var(--fit-blue);outline-offset:3px}
.fitlab .fit-result{border-left:4px solid #d29b1f;padding:14px 15px;background:#fff9e9;border-radius:0 10px 10px 0;margin-top:16px}.fitlab .fit-result.is-fit{background:#effaf6;border-color:#29886a}.fitlab .fit-result.is-empty{background:#f4f1fb;border-color:#9878cb}.fitlab .fit-result strong{display:block;font-size:16px}.fitlab .fit-result ul{margin:8px 0 0;padding-left:20px;font-size:14px}.fitlab .fit-result .fit-caveat{margin-top:8px;font-size:13px}.fitlab .fit-manual{border:1px solid #e8d8aa;background:#fffbef;border-radius:12px;padding:14px;margin-bottom:16px}.fitlab .fit-editor[hidden]{display:none}.fitlab .fit-empty-edit{font-size:14px;color:#655e74;margin:6px 0}.fitlab .fit-announcement{margin:8px 0;font-size:14px;color:#655e74;min-height:20px}
@media(max-width:760px){.fitlab .fit-layout{grid-template-columns:1fr}.fitlab .fit-plan{height:320px}.fitlab .fit-surface,.fitlab .fit-controls{padding:14px}.fitlab .fit-options{gap:10px}.fitlab .fit-actions button{flex:1 1 130px}}
`;

function installStyle() {
  if (document.getElementById('fitlab-styles')) return;
  const style = document.createElement('style');
  style.id = 'fitlab-styles';
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function svgElement(name, attrs = {}, text) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

function positive(value, fallback, max = 1000) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(0.5, Math.round(n * 10) / 10)) : fallback;
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function presetArray() { return Array.isArray(componentPresets) ? componentPresets : Object.values(componentPresets); }
function polygonPoints(model) {
  const shape = model.usablePolygon;
  if (Array.isArray(shape) && shape.length >= 3) {
    const points = shape.map(p => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [Number(p.x), Number(p.y)]);
    if (points.every(p => p.every(Number.isFinite))) return points;
  }
  const w = positive(model.width, 120), l = positive(model.length, 100);
  return [[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2]];
}

/** Interactive footprint editor. All dimensions are estimates until measured by the builder. */
export function mountFitChecker(container, { model: initialModel, onChange = () => {} } = {}) {
  if (!(container instanceof Element)) throw new TypeError('O verificador precisa de um elemento de destino.');
  installStyle();
  const namespace = `fitlab-${++instanceNumber}`;
  const abort = new AbortController();
  const listen = (element, type, listener, options = {}) => element.addEventListener(type, listener, { ...options, signal: abort.signal });
  let model = clone(initialModel || { id: 'manual', name: 'Área informada', width: 120, length: 100, manual: true });
  let parts = [], activeId = '', result = null, dragging = null, destroyed = false, manualConfirmed = !model.manual || model.manualConfirmed === true, viewBounds = null, manualError = '', invalidMeasurements = false;
  let limits = { top: 40, bottom: 40 };
  const presets = presetArray();
  const known = new Map(presets.map(p => [p.id, p]));
  const selected = new Set(['uno', 'l298n', 'battery2s', 'n20-left', 'n20-right'].filter(id => known.has(id)));
  const memories = new Map();
  const root = document.createElement('section');
  root.className = 'fitlab';
  root.setAttribute('aria-label', 'Verificação das peças no chassi');
  root.innerHTML = `
    <h3>Teste o encaixe</h3>
    <p class="fit-intro">Escolha as peças, organize e confira o resultado.</p>
    <details class="fit-manual fit-disclosure" hidden>
      <summary>Confirmar a área útil do STL</summary>
      <p>Informe a área plana que você mediu, livre de paredes e obstáculos.</p>
      <div class="fit-fields"><label class="fit-field">Largura útil (mm)<input type="number" data-manual="width" min="1" max="1000" step="0.5"></label><label class="fit-field">Comprimento útil (mm)<input type="number" data-manual="length" min="1" max="1000" step="0.5"></label></div>
      <label class="fit-choice" style="margin-top:12px"><input type="checkbox" data-manual-confirm>Conferi essa área no modelo ou na peça impressa.</label>
    </details>
    <div class="fit-layout">
      <div class="fit-surface">
        <h4>Vista de cima · <span data-model-name></span></h4>
        <svg class="fit-plan" tabindex="0" role="application" aria-label="Área de montagem. Arraste uma peça ou use as setas do teclado para movê-la."></svg>
        <div class="fit-legend"><span>Acima da base</span><span>Abaixo da base</span></div>
        <small>Arraste as peças para mover. Use as setas do teclado para ajustar; Shift + seta move 5 mm.</small>
        <div class="fit-actions"><button type="button" data-organize>Organizar peças</button><button type="button" data-reset>Recomeçar</button><button type="button" data-check class="fit-primary">Conferir encaixe</button></div>
        <div class="fit-announcement" role="status" aria-live="polite"></div>
        <div class="fit-result" role="status" aria-live="polite"></div>
      </div>
      <div class="fit-controls">
        <h4>Peças do seu robô</h4>
        <div class="fit-options" data-boards></div>
        <div class="fit-options" data-accessories></div>
        <small>As medidas iniciais são estimativas. Confira suas peças antes de imprimir.</small>
        <details class="fit-disclosure" data-edit-details><summary>Ajustar medidas e posição</summary>
        <label class="fit-field">Peça selecionada<select data-active-part></select></label>
        <p class="fit-empty-edit" hidden>Selecione uma peça acima para ajustar suas dimensões.</p>
        <div class="fit-editor">
          <div class="fit-fields" style="margin-top:12px">
            <label class="fit-field">Largura (mm)<input type="number" data-property="width" min="0.5" max="1000" step="0.5"></label>
            <label class="fit-field">Comprimento (mm)<input type="number" data-property="length" min="0.5" max="1000" step="0.5"></label>
            <label class="fit-field">Altura (mm)<input type="number" data-property="height" min="0.5" max="1000" step="0.5"></label>
            <label class="fit-field">Posição na base<select data-property="layer"><option value="top">Acima da base</option><option value="bottom">Abaixo da base</option></select></label>
            <label class="fit-field">Centro X (mm)<input type="number" data-property="x" min="-2000" max="2000" step="1"></label>
            <label class="fit-field">Centro Y (mm)<input type="number" data-property="y" min="-2000" max="2000" step="1"></label>
          </div>
          <div class="fit-actions"><button type="button" data-rotate>Girar 90°</button><span data-rotation style="align-self:center;font-size:14px"></span></div>
          <small data-part-note></small>
        </div>
        </details>
        <details class="fit-disclosure" data-limit-details><summary>Ajustar folgas e alturas</summary>
        <p class="fit-short-help">Referência inicial: 2 mm de folga e 40 mm de altura disponível por lado. Ajuste ao seu robô.</p>
        <div class="fit-fields">
          <label class="fit-field">Acima da base (mm)<input type="number" data-limit="top" value="40" min="0.5" max="1000" step="0.5"></label>
          <label class="fit-field">Abaixo da base (mm)<input type="number" data-limit="bottom" value="40" min="0.5" max="1000" step="0.5"></label>
          <label class="fit-field fit-wide">Distância mínima entre peças e bordas (mm)<input type="number" data-clearance value="2" min="0" max="30" step="0.5"></label>
        </div>
        <small style="margin-top:10px">Meça a altura livre acima e abaixo da base. O programa não reconhece tampas nem a distância até o chão.</small>
        </details>
      </div>
    </div>`;
  container.appendChild(root);
  const $ = selector => root.querySelector(selector);
  const svg = $('.fit-plan');
  let clearance = 2;
  // The official Uno footprint and default placements use tenths of a mm.
  for (const input of root.querySelectorAll('input[type="number"]')) input.step = '0.1';

  function numericFieldValid(input) {
    return input.value.trim() !== '' && Number.isFinite(Number(input.value)) && input.validity.valid;
  }

  function hasInvalidMeasurements() {
    const invalid = [...root.querySelectorAll('input[type="number"]')].filter(input =>
      !input.disabled && !input.closest('.fit-editor[hidden], .fit-manual[hidden]') && !numericFieldValid(input)
    );
    for (const input of invalid) { const detail = input.closest('details'); if (detail) detail.open = true; }
    return invalid.length > 0;
  }

  function setAnnouncement(message) { $('.fit-announcement').textContent = message; }
  function remember() { for (const part of parts) memories.set(part.presetId || part.id, clone(part)); }
  function enabledParts() { return parts.filter(part => part.enabled !== false); }
  function activePart() { return parts.find(part => part.id === activeId); }
  // A fallback rectangle is useful for drawing only. Never pass mesh bounds to
  // the verifier as a known usable surface when no polygon was supplied.
  function effectiveModel() { return { ...model, maxComponentHeight: { ...limits }, maxTopHeight: limits.top, maxBottomHeight: limits.bottom }; }

  function placement(resetDimensions = false) {
    remember();
    const overrides = {};
    if (!resetDimensions) for (const id of selected) {
      const saved = memories.get(id);
      if (saved) overrides[id] = Object.fromEntries(['width', 'length', 'height', 'rotation', 'layer'].map(key => [key, saved[key]]));
    }
    const placed = defaultPlacement(effectiveModel(), [...selected], { overrides, clearance });
    parts = placed.map((part, i) => {
      const presetId = part.presetId || part.id;
      return { ...part, id: part.id || `${presetId}-${i}`, presetId, enabled: true };
    });
    if (!parts.some(part => part.id === activeId)) activeId = parts[0]?.id || '';
  }

  function addChoice(target, inputType, presetIds, labelText, isChecked, group = 'board') {
    const label = document.createElement('label');
    label.className = 'fit-choice';
    const input = document.createElement('input');
    input.type = inputType;
    input.name = `${namespace}-${group}`;
    input.checked = isChecked;
    const text = document.createElement('span');
    text.textContent = labelText;
    label.append(input, text);
    target.appendChild(label);
    listen(input, 'change', () => {
      remember();
      if (inputType === 'radio') {
        const mutuallyExclusive = group === 'motor' ? ['n20-left', 'n20-right', 'tt-left', 'tt-right'] : ['uno', 'esp32'];
        mutuallyExclusive.forEach(id => selected.delete(id));
      }
      for (const id of presetIds) input.checked ? selected.add(id) : selected.delete(id);
      const current = new Map(parts.map(part => [part.presetId || part.id, part]));
      const defaults = defaultPlacement(effectiveModel(), [...selected]);
      parts = defaults.map(part => clone(current.get(part.presetId || part.id) || memories.get(part.presetId || part.id) || part));
      if (!parts.some(part => part.id === activeId)) activeId = parts[0]?.id || '';
      renderEditor();
      update();
      setAnnouncement('Seleção atualizada. Confira a posição das peças.');
    });
  }

  function renderChoices() {
    $('[data-boards]').replaceChildren();
    $('[data-accessories]').replaceChildren();
    for (const id of ['uno', 'esp32']) if (known.has(id)) addChoice($('[data-boards]'), 'radio', [id], known.get(id).name, selected.has(id));
    addChoice($('[data-boards]'), 'radio', [], 'Sem placa', !selected.has('uno') && !selected.has('esp32'));
    for (const id of ['l298n', 'battery2s']) if (known.has(id)) addChoice($('[data-accessories]'), 'checkbox', [id], known.get(id).name, selected.has(id));
    const motorIds = ['n20-left', 'n20-right'].filter(id => known.has(id));
    if (motorIds.length) addChoice($('[data-accessories]'), 'radio', motorIds, '2 motores N20', motorIds.every(id => selected.has(id)), 'motor');
    const ttIds = ['tt-left', 'tt-right'].filter(id => known.has(id));
    if (ttIds.length) addChoice($('[data-accessories]'), 'radio', ttIds, '2 motores TT', ttIds.every(id => selected.has(id)), 'motor');
    addChoice($('[data-accessories]'), 'radio', [], 'Sem motores', ![...motorIds, ...ttIds].some(id => selected.has(id)), 'motor');
  }

  function renderEditor() {
    const select = $('[data-active-part]');
    select.replaceChildren();
    for (const part of enabledParts()) {
      const option = document.createElement('option');
      option.value = part.id;
      option.textContent = part.name || part.id;
      select.appendChild(option);
    }
    const part = activePart();
    select.value = activeId;
    select.disabled = !part;
    $('.fit-editor').hidden = !part;
    $('.fit-empty-edit').hidden = Boolean(part);
    if (!part) return;
    for (const input of root.querySelectorAll('[data-property]')) {
      const property = input.dataset.property;
      const value = part[property] ?? (property === 'layer' ? 'top' : 0);
      input.value = property === 'x' || property === 'y' ? Number(Number(value).toFixed(1)) : value;
    }
    $('[data-rotation]').textContent = `${Math.round(part.rotation || 0)}°`;
    $('[data-part-note]').textContent = known.get(part.presetId)?.note || 'Meça o conjunto completo, incluindo conectores, suportes e partes salientes.';
  }

  function draw() {
    const points = polygonPoints(model);
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const surfaceExtent = Math.max(maxX - minX, maxY - minY, 40);
    if (!dragging || !viewBounds) {
      const allX = [...xs], allY = [...ys];
      for (const part of enabledParts()) {
        const radians = Number(part.rotation || 0) * Math.PI / 180;
        const hw = positive(part.width, 20) / 2, hl = positive(part.length, 20) / 2;
        for (const [dx, dy] of [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]]) {
          allX.push(Number(part.x || 0) + dx * Math.cos(radians) - dy * Math.sin(radians));
          allY.push(Number(part.y || 0) + dx * Math.sin(radians) + dy * Math.cos(radians));
        }
      }
      viewBounds = { minX: Math.min(...allX), maxX: Math.max(...allX), minY: Math.min(...allY), maxY: Math.max(...allY) };
    }
    const extent = Math.max(viewBounds.maxX - viewBounds.minX, viewBounds.maxY - viewBounds.minY, 40), margin = extent * .15;
    const size = extent + margin * 2;
    const centerX = (viewBounds.minX + viewBounds.maxX) / 2, centerY = (viewBounds.minY + viewBounds.maxY) / 2;
    svg.setAttribute('viewBox', `${centerX - size / 2} ${centerY - size / 2} ${size} ${size}`);
    svg.replaceChildren();
    const gridStep = extent > 250 ? 20 : 10;
    const defs = svgElement('defs');
    const pattern = svgElement('pattern', { id: `${namespace}-grid`, width: gridStep, height: gridStep, patternUnits: 'userSpaceOnUse' });
    pattern.append(svgElement('path', { d: `M ${gridStep} 0 L 0 0 0 ${gridStep}`, fill: 'none', stroke: '#e9e5f1', 'stroke-width': .35 }));
    defs.append(pattern); svg.append(defs);
    svg.append(svgElement('rect', { x: centerX - size / 2, y: centerY - size / 2, width: size, height: size, fill: `url(#${namespace}-grid)` }));
    svg.append(svgElement('polygon', { points: points.map(p => p.join(',')).join(' '), fill: '#eeebf6', stroke: '#857494', 'stroke-width': extent / 150, 'stroke-linejoin': 'round' }));
    const bad = new Set((result?.items || []).filter(item => item.fits === false || item.issues?.length).map(item => item.id));
    const order = [...enabledParts()].sort((a, b) => Number(a.id === activeId) - Number(b.id === activeId));
    const textSize = size / 24;
    for (const part of order) {
      const layerBottom = part.layer === 'bottom';
      const group = svgElement('g', { transform: `translate(${part.x || 0} ${part.y || 0}) rotate(${part.rotation || 0})`, 'data-part': part.id });
      const width = positive(part.width, 20), length = positive(part.length, 20);
      const rect = svgElement('rect', { x: -width / 2, y: -length / 2, width, height: length, rx: 1.5, fill: layerBottom ? '#8ee5ec' : '#c1a9ef', 'fill-opacity': .86, stroke: bad.has(part.id) ? '#c44652' : part.id === activeId ? '#492281' : layerBottom ? '#00899a' : '#8560bb', 'stroke-width': part.id === activeId ? extent / 100 : extent / 180, 'stroke-dasharray': layerBottom ? `${extent / 60} ${extent / 90}` : 'none' });
      group.append(rect);
      const fullName = part.name || part.presetId || part.id;
      group.append(svgElement('title', {}, `${fullName}: ${width} × ${length} × ${part.height} mm. ${layerBottom ? 'Abaixo' : 'Acima'} da base.`));
      const shortName = ({ uno: 'UNO', esp32: 'ESP32', l298n: 'L298N', battery2s: '2S', 'n20-left': 'N20', 'n20-right': 'N20', 'tt-left': 'TT', 'tt-right': 'TT' })[part.presetId] || fullName.slice(0, 7);
      const label = svgElement('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'sans-serif', 'font-size': textSize, fill: '#272135', 'pointer-events': 'none' }, shortName);
      group.append(label); svg.append(group);
    }
    svg.append(svgElement('text', { x: (minX + maxX) / 2, y: maxY + surfaceExtent * .1, 'text-anchor': 'middle', 'font-family': 'sans-serif', 'font-size': textSize * .9, fill: '#655e74' }, `${Math.round((maxX - minX) * 10) / 10} × ${Math.round((maxY - minY) * 10) / 10} mm · grade ${gridStep} mm`));
  }

  function showResult() {
    const area = $('.fit-result');
    area.replaceChildren();
    const title = document.createElement('strong');
    const none = !enabledParts().length;
    const pending = Boolean(model.manual && !manualConfirmed);
    title.textContent = none ? 'Selecione as peças para verificar.' : invalidMeasurements ? 'Confira as medidas informadas.' : manualError ? 'A área útil ultrapassa o chassi.' : pending ? 'Confirme a área útil medida.' : result.fits ? 'Cabe nas medidas informadas.' : 'Não cabe nesta posição.';
    area.className = `fit-result${none || pending ? ' is-empty' : result.fits ? ' is-fit' : ''}`;
    area.appendChild(title);
    const messages = [];
    if (manualError) messages.push(manualError);
    if (!none && !pending && !invalidMeasurements) {
      for (const issue of result.issues || []) {
        if (typeof issue === 'string') { messages.push(issue); continue; }
        const names = (issue.componentIds || []).map(id => parts.find(part => part.id === id)?.name || id).join(' e ');
        const concise = { boundary: 'fora da área útil ou da folga.', collision: 'peças sobrepostas.', clearance: 'folga insuficiente.', height: 'altura acima do limite informado.' }[issue.type];
        messages.push(concise ? `${names}: ${concise}` : issue.message);
      }
      if (!messages.length && !result.fits) for (const item of result.items || []) for (const issue of item.issues || []) messages.push(`${parts.find(part => part.id === item.id)?.name || item.id}: ${issue}`);
    }
    if (messages.length) {
      const ul = document.createElement('ul');
      for (const message of [...new Set(messages)].filter(Boolean).slice(0, 8)) { const li = document.createElement('li'); li.textContent = message; ul.appendChild(li); }
      area.appendChild(ul);
    }
    const caveat = document.createElement('p'); caveat.className = 'fit-caveat';
    caveat.textContent = 'Confira furos, fixações, cabos e rodas na peça real. A análise usa as medidas informadas e avalia cada face separadamente.';
    area.appendChild(caveat);
  }

  function update() {
    if (destroyed) return;
    invalidMeasurements = hasInvalidMeasurements();
    result = checkFit(effectiveModel(), enabledParts(), { clearance });
    if (!enabledParts().length) result = { ...result, fits: false, status: 'empty' };
    if (model.manual && !manualConfirmed) result = { ...result, fits: false, status: 'manual-unconfirmed' };
    if (manualError) result = { ...result, fits: false, status: 'manual-outside-bounds' };
    if (invalidMeasurements) {
      // Keep the last finite component geometry, but do not show a successful
      // check in either the 2D or 3D view while a visible measurement is invalid.
      const message = 'Confira as medidas informadas.';
      result = { ...result, fits: false, status: 'invalid-measurements', items: result.items.map(item => item.enabled === false ? item : { ...item, fits: false, issues: [...item.issues, message] }) };
    }
    showResult(); draw();
    onChange({ components: clone(enabledParts()), result: clone(result) });
  }

  function renderModelFields() {
    $('[data-model-name]').textContent = model.name || 'Chassi';
    $('.fit-manual').hidden = !model.manual;
    $('.fit-manual').open = Boolean(model.manual && !manualConfirmed);
    const points = polygonPoints(model), xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    $('[data-manual="width"]').value = Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10;
    $('[data-manual="length"]').value = Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10;
    const bounds = manualBounds();
    $('[data-manual="width"]').max = bounds.width;
    $('[data-manual="length"]').max = bounds.length;
    for (const input of root.querySelectorAll('[data-manual]')) input.setCustomValidity('');
    $('[data-manual-confirm]').checked = manualConfirmed;
  }

  function manualBounds() {
    const previous = polygonPoints(model), xs = previous.map(p => p[0]), ys = previous.map(p => p[1]);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    // Imported meshes are centered by the viewer. The usable rectangle may be
    // offset, so a centered full-size bounding box is not a valid width limit.
    const rawWidth = Number(model.width), rawLength = Number(model.length);
    const meshWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 120;
    const meshLength = Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 100;
    const width = Math.max(0, Math.min(1000, meshWidth - 2 * Math.abs(cx)));
    const length = Math.max(0, Math.min(1000, meshLength - 2 * Math.abs(cy)));
    return { width: Math.floor(width * 10 + 1e-7) / 10, length: Math.floor(length * 10 + 1e-7) / 10, cx, cy };
  }

  function pointerPoint(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  listen(svg, 'pointerdown', event => {
    const target = event.target.closest('[data-part]');
    if (!target || (event.pointerType === 'mouse' && event.button !== 0)) return;
    activeId = target.getAttribute('data-part');
    const part = activePart(), point = pointerPoint(event);
    if (!part || !point) return;
    dragging = { pointerId: event.pointerId, offsetX: point.x - part.x, offsetY: point.y - part.y };
    svg.setPointerCapture(event.pointerId); svg.classList.add('dragging'); svg.focus({ preventScroll: true });
    event.preventDefault(); renderEditor(); draw();
  });
  listen(svg, 'pointermove', event => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const point = pointerPoint(event), part = activePart();
    if (!point || !part) return;
    part.x = Math.round((point.x - dragging.offsetX) * 10) / 10;
    part.y = Math.round((point.y - dragging.offsetY) * 10) / 10;
    $('[data-property="x"]').value = part.x; $('[data-property="y"]').value = part.y;
    update();
  });
  const endDrag = event => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    dragging = null; svg.classList.remove('dragging'); remember(); update();
  };
  listen(svg, 'pointerup', endDrag); listen(svg, 'pointercancel', endDrag);
  listen(svg, 'keydown', event => {
    const part = activePart();
    if (!part || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); const delta = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowLeft') part.x -= delta;
    if (event.key === 'ArrowRight') part.x += delta;
    if (event.key === 'ArrowUp') part.y -= delta;
    if (event.key === 'ArrowDown') part.y += delta;
    renderEditor(); update(); remember();
  });
  listen($('[data-active-part]'), 'change', event => { activeId = event.target.value; renderEditor(); draw(); });
  for (const input of root.querySelectorAll('[data-property]')) {
    const applyValue = (finalize) => {
      const part = activePart(); if (!part) return;
      const property = input.dataset.property, numeric = Number(input.value);
      if (property === 'layer') part.layer = input.value === 'bottom' ? 'bottom' : 'top';
      else if (!numericFieldValid(input)) { update(); return; }
      else if (property === 'x' || property === 'y') part[property] = Number.isFinite(numeric) ? Math.max(-2000, Math.min(2000, numeric)) : 0;
      else if (numeric > 0) part[property] = positive(input.value, part[property]);
      else { update(); return; }
      // Keep the active input untouched while typing; replacing its value or the
      // editor on each keystroke can turn "200" into "2" or discard decimals.
      if (finalize) renderEditor();
      update(); remember();
    };
    listen(input, 'input', () => applyValue(false));
    listen(input, 'change', () => applyValue(true));
  }
  listen($('[data-rotate]'), 'click', () => { const part = activePart(); if (!part) return; part.rotation = ((part.rotation || 0) + 90) % 360; renderEditor(); update(); remember(); });
  for (const input of root.querySelectorAll('[data-limit]')) {
    const applyValue = finalize => { if (!numericFieldValid(input)) { update(); return; } limits[input.dataset.limit] = positive(input.value, limits[input.dataset.limit]); if (finalize) input.value = limits[input.dataset.limit]; update(); };
    listen(input, 'input', () => applyValue(false)); listen(input, 'change', () => applyValue(true));
  }
  const clearanceInput = $('[data-clearance]');
  const applyClearance = finalize => { const n = Number(clearanceInput.value); if (!numericFieldValid(clearanceInput)) { update(); return; } clearance = Math.max(0, Math.min(30, n)); if (finalize) clearanceInput.value = clearance; update(); };
  listen(clearanceInput, 'input', () => applyClearance(false)); listen(clearanceInput, 'change', () => applyClearance(true));
  for (const input of root.querySelectorAll('[data-manual]')) {
    const applyArea = finalize => {
      const bounds = manualBounds(), widthInput = $('[data-manual="width"]'), lengthInput = $('[data-manual="length"]');
      const rawWidth = Number(widthInput.value), rawLength = Number(lengthInput.value);
      manualConfirmed = false; $('[data-manual-confirm]').checked = false;
      const invalid = widthInput.value.trim() === '' || lengthInput.value.trim() === '' || !Number.isFinite(rawWidth) || !Number.isFinite(rawLength) || rawWidth <= 0 || rawLength <= 0;
      const tooLarge = rawWidth > bounds.width || rawLength > bounds.length || bounds.width < .5 || bounds.length < .5;
      manualError = invalid ? 'Informe largura e comprimento válidos.' : tooLarge ? `Neste centro, use no máximo ${bounds.width} × ${bounds.length} mm para permanecer dentro do STL.` : '';
      widthInput.setCustomValidity(manualError); lengthInput.setCustomValidity(manualError);
      if (invalid || (tooLarge && !finalize) || bounds.width < .5 || bounds.length < .5) { update(); return; }
      const w = Math.min(bounds.width, positive(rawWidth, bounds.width)), l = Math.min(bounds.length, positive(rawLength, bounds.length));
      model.usablePolygon = [[bounds.cx - w / 2, bounds.cy - l / 2], [bounds.cx + w / 2, bounds.cy - l / 2], [bounds.cx + w / 2, bounds.cy + l / 2], [bounds.cx - w / 2, bounds.cy + l / 2]];
      if (finalize) { widthInput.value = w; lengthInput.value = l; if (tooLarge) setAnnouncement('Área útil limitada às dimensões do STL. Confira a medida e confirme novamente.'); }
      manualError = ''; widthInput.setCustomValidity(''); lengthInput.setCustomValidity(''); update();
    };
    listen(input, 'input', () => applyArea(false)); listen(input, 'change', () => applyArea(true));
  }
  listen($('[data-manual-confirm]'), 'change', event => { manualConfirmed = event.target.checked && !manualError && !hasInvalidMeasurements(); event.target.checked = manualConfirmed; if (!manualConfirmed) setAnnouncement('Confira as medidas informadas.'); update(); });
  listen($('[data-organize]'), 'click', () => { if (hasInvalidMeasurements()) { update(); setAnnouncement('Confira as medidas informadas.'); return; } placement(); renderEditor(); update(); setAnnouncement('Arranjo inicial reorganizado. As dimensões que você informou foram mantidas; revise o resultado.'); });
  listen($('[data-reset]'), 'click', () => { placement(true); renderEditor(); update(); setAnnouncement('Posições e dimensões voltaram às referências iniciais. A seleção das peças foi mantida.'); });
  listen($('[data-check]'), 'click', () => { update(); setAnnouncement('Verificação atualizada com as medidas e folgas informadas.'); });
  placement(); renderChoices(); renderModelFields(); renderEditor(); update();

  return {
    setModel(nextModel) {
      if (destroyed) return;
      remember(); model = clone(nextModel || model); manualConfirmed = !model.manual || model.manualConfirmed === true; manualError = '';
      placement(); renderModelFields(); renderEditor(); update();
      setAnnouncement('Chassi alterado. As peças foram reposicionadas; seleção e medidas foram mantidas.');
    },
    getComponents() { return clone(enabledParts()); },
    destroy() { if (destroyed) return; destroyed = true; abort.abort(); dragging = null; root.remove(); }
  };
}
