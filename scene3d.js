/**
 * On-demand WebGL chassis preview. All distances are millimetres, Z is up and
 * the front is -Y. Parts are illustrative, bounded by the editable envelopes;
 * this renderer does not certify mounting, clearances or mechanical strength.
 */
import * as THREE from './vendor/three/three.module.js';

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const valid = value => Number.isFinite(Number(value));

export function mountChassisScene(canvas, { onError } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    onError?.(error);
    return null;
  }

  let destroyed = false, failed = false, frame = 0;
  const abort = new AbortController();
  const eventOptions = { signal: abort.signal };
  const originalTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  if (!canvas.hasAttribute('aria-label')) canvas.setAttribute('aria-label', 'Chassi 3D. Arraste para girar; use dois dedos ou a roda para ampliar. Setas giram; mais e menos ampliam; Home restaura.');

  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f8f7fc');
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 10000);
  camera.up.set(0, 0, 1);
  const assembly = new THREE.Group();
  const chassisGroup = new THREE.Group(), partsGroup = new THREE.Group(), dimensionsGroup = new THREE.Group();
  assembly.add(chassisGroup, partsGroup, dimensionsGroup);
  scene.add(assembly);

  const materials = new Set();
  const material = (color, roughness = 0.55, metalness = 0.1, other = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...other });
    materials.add(value);
    return value;
  };
  const lineMaterial = (color, opacity = 1) => {
    const value = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    materials.add(value);
    return value;
  };
  const palette = {
    chassis: material('#7042cf', 0.4, 0.13, { flatShading: true, side: THREE.DoubleSide }),
    black: material('#191e2b', 0.65, 0.18),
    chip: material('#27303d', 0.55, 0.2),
    silver: material('#bbc6d2', 0.23, 0.8),
    gold: material('#bd9249', 0.28, 0.7),
    white: material('#eef4f7', 0.45, 0.15),
    green: material('#128d62', 0.6, 0.05),
    bluePCB: material('#1186a2', 0.63, 0.07),
    darkPCB: material('#304c57', 0.66, 0.06),
    redPCB: material('#ae2743', 0.65, 0.04),
    yellow: material('#edb72f', 0.48, 0.02),
    cyan: material('#53d5e9', 0.3, 0.25),
    copper: material('#83b9b0', 0.45, 0.35),
    edge: lineMaterial('#3bc8e8', 0.3),
    envelope: lineMaterial('#8066bd', 0.28),
    bad: lineMaterial('#f04464', 0.95),
    dimension: lineMaterial('#78708e', 0.65),
  };

  const sky = new THREE.HemisphereLight('#f1f6ff', '#82759c', 2.2);
  sky.position.set(0, 0, 1);
  scene.add(sky);
  const key = new THREE.DirectionalLight('#fff7ec', 4.4);
  key.position.set(120, -180, 260);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.4;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#88e4ff', 1.5);
  fill.position.set(-150, -70, 90);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#dfcaff', 2);
  rim.position.set(60, 150, 140);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material('#f8f7fc', 0.95, 0));
  floor.receiveShadow = true;
  scene.add(floor);
  let grid = null;
  let model = { width: 100, length: 100, baseThickness: 3 };
  let components = [], fitResult = null;
  let options = { showParts: true, exploded: false, dimensions: false };
  let yaw = -Math.PI / 3, elevation = Math.PI / 3.7, zoom = 1;
  let aspect = 1, halfSpan = 100, radius = 300;
  const target = new THREE.Vector3(0, 0, 5);
  const sceneBounds = new THREE.Box3();

  function clearGroup(group) {
    const geometries = new Set();
    group.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
    for (const geometry of geometries) geometry.dispose();
    group.clear();
  }

  function box(group, dimensions, position, surface) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), surface);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  // Unit cylinder, longitudinal axis X. Y/Z radii can differ after scaling.
  function cylinderX(group, length, radiusY, radiusZ, position, surface, segments = 24) {
    const geometry = new THREE.CylinderGeometry(1, 1, 1, segments);
    geometry.rotateZ(Math.PI / 2);
    geometry.scale(length, radiusY, radiusZ);
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  function screw(group, x, y, z, scale = 1) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.023 * scale, 0.023 * scale, 0.02, 12), palette.silver);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    box(group, [0.025 * scale, 0.006 * scale, 0.003], [x, y, z + 0.011], palette.black);
  }

  function pinHeader(group, x, y, length, count, alongX = true) {
    box(group, alongX ? [length, 0.095, 0.3] : [0.095, length, 0.3], [x, y, 0.28], palette.black);
    for (let i = 0; i < count; i++) {
      const offset = length * ((i + 0.5) / count - 0.5);
      box(group, [0.019, 0.019, 0.015], [x + (alongX ? offset : 0), y + (alongX ? 0 : offset), 0.438], palette.gold);
    }
  }

  function pcbDetails(group, color) {
    box(group, [0.98, 0.98, 0.07], [0, 0, 0.065], color);
    for (const x of [-0.42, 0.42]) for (const y of [-0.4, 0.4]) screw(group, x, y, 0.108);
    // Silkscreen and copper-like tracks are decorative schematic detail only.
    for (let i = 0; i < 4; i++) {
      box(group, [0.12, 0.008, 0.003], [0.25, -0.12 + i * 0.055, 0.104], palette.white);
      box(group, [0.006, 0.23, 0.004], [-0.1 + i * 0.035, 0.12, 0.105], palette.copper);
    }
  }

  function usb(group, x, y, width = 0.18, length = 0.28, height = 0.48) {
    box(group, [width, length, height], [x, y, 0.1 + height / 2], palette.silver);
    box(group, [0.004, length * 0.74, height * 0.58], [x - width / 2 - 0.001, y, 0.1 + height / 2], palette.black);
    box(group, [0.006, length * 0.48, height * 0.11], [x - width / 2 - 0.004, y, 0.1 + height / 2], palette.white);
  }

  function electronics(group, type) {
    if (type === 'uno') {
      pcbDetails(group, palette.bluePCB);
      pinHeader(group, 0.06, -0.39, 0.69, 14);
      pinHeader(group, 0.08, 0.39, 0.65, 12);
      box(group, [0.41, 0.19, 0.12], [0.11, 0.08, 0.18], palette.chip);
      for (let i = 0; i < 12; i++) {
        const x = -0.075 + i * 0.033;
        box(group, [0.013, 0.045, 0.018], [x, -0.035, 0.125], palette.silver);
        box(group, [0.013, 0.045, 0.018], [x, 0.195, 0.125], palette.silver);
      }
      box(group, [0.16, 0.18, 0.11], [-0.23, -0.09, 0.17], palette.chip);
      usb(group, -0.39, -0.12, 0.18, 0.25, 0.58);
      box(group, [0.19, 0.21, 0.57], [-0.38, 0.26, 0.385], palette.black);
      cylinderX(group, 0.006, 0.063, 0.12, [-0.478, 0.26, 0.39], palette.silver, 16);
      cylinderX(group, 0.008, 0.043, 0.08, [-0.483, 0.26, 0.39], palette.black, 16);
      box(group, [0.07, 0.08, 0.045], [-0.04, -0.22, 0.134], palette.silver);
      box(group, [0.025, 0.025, 0.018], [0.32, -0.16, 0.12], palette.cyan);
    } else if (type === 'esp32') {
      pcbDetails(group, palette.darkPCB);
      pinHeader(group, 0, -0.4, 0.86, 15);
      pinHeader(group, 0, 0.4, 0.86, 15);
      box(group, [0.48, 0.59, 0.16], [0.1, 0, 0.18], palette.silver);
      box(group, [0.2, 0.59, 0.05], [0.35, 0, 0.125], palette.black);
      for (let i = 0; i < 5; i++) box(group, [0.018, 0.43, 0.004], [0.275 + i * 0.032, 0, 0.153], palette.gold);
      usb(group, -0.4, 0, 0.15, 0.31, 0.25);
      for (const y of [-0.22, 0.22]) box(group, [0.09, 0.1, 0.12], [-0.29, y, 0.17], palette.black);
    } else {
      pcbDetails(group, palette.redPCB);
      box(group, [0.68, 0.61, 0.12], [0.02, 0.12, 0.22], palette.black);
      for (let i = 0; i < 8; i++) box(group, [0.037, 0.58, 0.7], [-0.285 + i * 0.087, 0.12, 0.625], palette.black);
      for (const [x, y, width, length] of [[-0.3, -0.35, 0.29, 0.2], [0.1, -0.35, 0.38, 0.2], [0.38, 0.04, 0.2, 0.32]]) {
        box(group, [width, length, 0.26], [x, y, 0.23], palette.green);
        const alongX = width > length;
        for (const offset of [-0.07, 0.07]) screw(group, x + (alongX ? offset : 0), y + (alongX ? 0 : offset), 0.371, 0.9);
      }
      pinHeader(group, -0.38, 0.15, 0.38, 6, false);
    }
  }

  function battery(group) {
    for (const y of [-0.24, 0.24]) {
      cylinderX(group, 0.94, 0.225, 0.44, [0, y, 0.48], palette.black, 32);
      cylinderX(group, 0.012, 0.19, 0.38, [-0.475, y, 0.48], palette.silver, 24);
      cylinderX(group, 0.012, 0.18, 0.36, [0.475, y, 0.48], palette.silver, 24);
      cylinderX(group, 0.015, 0.06, 0.12, [0.486, y, 0.48], palette.gold, 16);
    }
    box(group, [0.24, 0.82, 0.025], [0, 0, 0.923], palette.chassis);
    box(group, [0.12, 0.32, 0.003], [0, 0, 0.938], palette.white);
  }

  function motorPart(group, tt) {
    if (tt) {
      cylinderX(group, 0.4, 0.32, 0.34, [-0.29, 0, 0.45], palette.silver, 24);
      box(group, [0.54, 0.92, 0.88], [0.2, 0, 0.47], palette.yellow);
      box(group, [0.42, 0.7, 0.04], [0.2, 0, 0.93], palette.yellow);
      for (const x of [0.02, 0.37]) screw(group, x, 0.28, 0.96, 1.3);
      cylinderX(group, 0.06, 0.14, 0.16, [-0.46, 0, 0.45], palette.black, 16);
    } else {
      cylinderX(group, 0.54, 0.44, 0.44, [-0.2, 0, 0.5], palette.silver, 24);
      box(group, [0.3, 0.88, 0.88], [0.23, 0, 0.5], palette.gold);
      box(group, [0.018, 0.92, 0.92], [0.38, 0, 0.5], palette.gold);
      cylinderX(group, 0.1, 0.1, 0.1, [0.44, 0, 0.5], palette.silver, 16);
      box(group, [0.045, 0.35, 0.5], [-0.48, 0, 0.5], palette.black);
      for (const z of [0.2, 0.8]) box(group, [0.012, 0.075, 0.16], [-0.49, 0, z], palette.gold);
    }
  }

  function rebuildParts() {
    clearGroup(partsGroup);
    const status = new Map((fitResult?.items || []).map(item => [String(item.id), item]));
    for (const part of components.slice(0, 100)) {
      if (part.enabled === false || !['width', 'length', 'height'].every(key => valid(part[key]) && Number(part[key]) > 0)) continue;
      if (!valid(part.x ?? 0) || !valid(part.y ?? 0) || !valid(part.rotation ?? 0)) continue;
      const group = new THREE.Group();
      const type = String(part.presetId || part.id || '').replace(/-\d+$/, '');
      if (['uno', 'esp32', 'l298n'].includes(type)) electronics(group, type);
      else if (type === 'battery2s') battery(group);
      else if (/^n20/.test(type) || /^tt(?:-|$)/.test(type)) motorPart(group, /^tt(?:-|$)/.test(type));
      else box(group, [0.98, 0.98, 0.98], [0, 0, 0.5], palette.silver);
      const envelopeGeometry = new THREE.BoxGeometry(1, 1, 1);
      const geometry = new THREE.EdgesGeometry(envelopeGeometry);
      envelopeGeometry.dispose();
      geometry.translate(0, 0, 0.5);
      const outline = new THREE.LineSegments(geometry, status.get(String(part.id))?.fits === false ? palette.bad : palette.envelope);
      outline.renderOrder = 2;
      group.add(outline);
      const bottom = part.layer === 'bottom';
      group.scale.set(Number(part.width), Number(part.length), Number(part.height));
      group.rotation.z = Number(part.rotation || 0) * Math.PI / 180;
      group.position.set(Number(part.x || 0), Number(part.y || 0), bottom
        ? -2 - Number(part.height) - (options.exploded ? 25 : 0)
        : Number(model.baseThickness || 3) + 2 + (options.exploded ? 30 : 0));
      group.userData.componentId = part.id;
      group.name = String(part.name || part.id || 'Componente');
      partsGroup.add(group);
    }
    partsGroup.visible = Boolean(options.showParts);
  }

  function rebuildDimensions() {
    clearGroup(dimensionsGroup);
    dimensionsGroup.visible = Boolean(options.dimensions);
    const width = Number(model.width), length = Number(model.length);
    if (!(width > 0 && length > 0)) return;
    const x = width / 2, y = length / 2, offset = Math.max(width, length) * 0.12;
    const segments = [
      [-x, -y - offset, 0.2], [x, -y - offset, 0.2],
      [-x, -y - offset - 3, 0.2], [-x, -y + 2, 0.2],
      [x, -y - offset - 3, 0.2], [x, -y + 2, 0.2],
      [x + offset, -y, 0.2], [x + offset, y, 0.2],
      [x - 2, -y, 0.2], [x + offset + 3, -y, 0.2],
      [x - 2, y, 0.2], [x + offset + 3, y, 0.2],
    ];
    dimensionsGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segments.map(p => new THREE.Vector3(...p))), palette.dimension));
  }

  function reframe() {
    assembly.updateMatrixWorld(true);
    sceneBounds.makeEmpty();
    sceneBounds.expandByObject(chassisGroup);
    if (partsGroup.visible) sceneBounds.expandByObject(partsGroup);
    if (sceneBounds.isEmpty()) sceneBounds.set(new THREE.Vector3(-50, -50, 0), new THREE.Vector3(50, 50, 15));
    const size = sceneBounds.getSize(new THREE.Vector3());
    sceneBounds.getCenter(target);
    const fitRadius = Math.max(25, size.length() / 2);
    halfSpan = fitRadius * 1.18;
    radius = Math.max(300, fitRadius * 4);
    const floorZ = Math.min(-3, sceneBounds.min.z - 4);
    const gridSize = Math.max(300, Math.ceil(Math.max(size.x, size.y) * 2.5 / 20) * 20);
    floor.position.set(target.x, target.y, floorZ);
    floor.scale.set(gridSize * 2, gridSize * 2, 1);
    if (grid) { grid.geometry.dispose(); for (const m of Array.isArray(grid.material) ? grid.material : [grid.material]) m.dispose(); scene.remove(grid); }
    grid = new THREE.GridHelper(gridSize, Math.min(100, Math.round(gridSize / 10)), '#d7d0e6', '#e7e2ef');
    grid.rotation.x = Math.PI / 2;
    grid.position.set(target.x, target.y, floorZ + 0.025);
    grid.material.transparent = true;
    grid.material.opacity = 0.65;
    scene.add(grid);
    key.position.set(target.x + fitRadius, target.y - fitRadius * 1.6, target.z + fitRadius * 2.5);
    key.target.position.copy(target);
    const bounds = fitRadius * 1.5;
    Object.assign(key.shadow.camera, { left: -bounds, right: bounds, top: bounds, bottom: -bounds, near: 0.1, far: radius * 3 });
    key.shadow.camera.updateProjectionMatrix();
    schedule();
  }

  function updateCamera() {
    const vertical = halfSpan / Math.min(1, aspect);
    camera.left = -vertical * aspect;
    camera.right = vertical * aspect;
    camera.top = vertical;
    camera.bottom = -vertical;
    camera.zoom = zoom;
    camera.far = Math.max(10000, radius * 10);
    camera.position.set(
      target.x + radius * Math.cos(elevation) * Math.cos(yaw),
      target.y + radius * Math.cos(elevation) * Math.sin(yaw),
      target.z + radius * Math.sin(elevation)
    );
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }

  function draw() {
    frame = 0;
    if (destroyed || failed) return;
    try { updateCamera(); renderer.render(scene, camera); }
    catch (error) { failed = true; onError?.(error); }
  }
  function schedule() { if (!destroyed && !failed && !frame) frame = requestAnimationFrame(draw); }
  function resize() {
    if (destroyed) return;
    const width = Math.max(1, canvas.clientWidth || canvas.parentElement?.clientWidth || 600);
    const height = Math.max(1, canvas.clientHeight || canvas.parentElement?.clientHeight || 400);
    aspect = width / height;
    renderer.setSize(width, height, false);
    schedule();
  }

  function zoomBy(factor) {
    if (destroyed || !valid(factor) || Number(factor) <= 0) return;
    zoom = clamp(zoom * Number(factor), 0.25, 6);
    schedule();
  }
  function reset() { yaw = -Math.PI / 3; elevation = Math.PI / 3.7; zoom = 1; reframe(); }
  function setView(view) {
    if (view === 'top') { yaw = -Math.PI / 2; elevation = Math.PI / 2 - 0.0001; }
    else if (view === 'front') { yaw = -Math.PI / 2; elevation = 0.025; }
    else if (view === 'side') { yaw = 0; elevation = 0.025; }
    else { yaw = -Math.PI / 3; elevation = Math.PI / 3.7; }
    schedule();
  }

  const pointers = new Map();
  let pinchDistance = 0;
  const distanceOfPointers = () => { const p = [...pointers.values()]; return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0; };
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { canvas.setPointerCapture(event.pointerId); } catch { /* detached canvas */ }
    pinchDistance = distanceOfPointers();
    canvas.focus({ preventScroll: true });
  }, eventOptions);
  canvas.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) {
      const distance = distanceOfPointers();
      if (pinchDistance > 0 && distance > 0) zoomBy(distance / pinchDistance);
      pinchDistance = distance;
    } else {
      yaw -= (event.clientX - previous.x) * 0.009;
      elevation = clamp(elevation + (event.clientY - previous.y) * 0.007, -0.3, Math.PI / 2 - 0.0001);
      schedule();
    }
  }, eventOptions);
  const pointerEnd = event => { pointers.delete(event.pointerId); pinchDistance = distanceOfPointers(); };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, pointerEnd, eventOptions);
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoomBy(Math.exp(clamp(-event.deltaY * 0.0015, -0.4, 0.4))); }, { ...eventOptions, passive: false });
  canvas.addEventListener('keydown', event => {
    let handled = true;
    if (event.key === 'ArrowLeft') yaw -= 0.12;
    else if (event.key === 'ArrowRight') yaw += 0.12;
    else if (event.key === 'ArrowUp') elevation = Math.min(Math.PI / 2 - 0.0001, elevation + 0.1);
    else if (event.key === 'ArrowDown') elevation = Math.max(-0.3, elevation - 0.1);
    else if (event.key === '+' || event.key === '=') zoomBy(1.15);
    else if (event.key === '-') zoomBy(1 / 1.15);
    else if (event.key === 'Home') reset();
    else handled = false;
    if (handled) { event.preventDefault(); schedule(); }
  }, eventOptions);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); failed = true; onError?.(new Error('O contexto WebGL foi interrompido. Reabra a visualização.')); }, eventOptions);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  if (!observer) globalThis.addEventListener('resize', resize, eventOptions);
  resize();
  reframe();

  return {
    setChassis(mesh, nextModel = {}) {
      if (destroyed) return;
      const triangles = mesh?.triangles;
      if (!Array.isArray(triangles) || !triangles.length) throw new TypeError('A malha precisa conter triângulos.');
      const positions = new Float32Array(triangles.length * 9);
      let index = 0;
      for (const triangle of triangles) for (const point of triangle) for (const coordinate of point) {
        if (!Number.isFinite(coordinate)) throw new TypeError('A malha contém coordenadas inválidas.');
        positions[index++] = coordinate;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      clearGroup(chassisGroup);
      model = { ...nextModel, width: nextModel.width || mesh.dimensions?.[0] || 100, length: nextModel.length || mesh.dimensions?.[1] || 100, baseThickness: nextModel.baseThickness ?? 3 };
      const object = new THREE.Mesh(geometry, palette.chassis);
      object.castShadow = true;
      object.receiveShadow = true;
      chassisGroup.add(object);
      if (triangles.length <= 40000) chassisGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 30), palette.edge));
      rebuildParts();
      rebuildDimensions();
      reframe();
    },
    setComponents(nextComponents, result) {
      if (destroyed) return;
      components = Array.isArray(nextComponents) ? nextComponents.map(part => ({ ...part })) : [];
      fitResult = result;
      rebuildParts();
      reframe();
    },
    setOptions(next = {}) {
      if (destroyed) return;
      options = { ...options, ...next };
      rebuildParts();
      rebuildDimensions();
      reframe();
    },
    setView, zoomBy, reset,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abort.abort();
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      pointers.clear();
      clearGroup(assembly);
      floor.geometry.dispose();
      if (grid) {
        grid.geometry.dispose();
        for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) material.dispose();
      }
      for (const material of materials) material.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
      canvas.style.touchAction = originalTouchAction;
    },
  };
}
