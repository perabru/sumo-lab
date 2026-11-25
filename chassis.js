/** Original educational viewer. No runtime libraries or remote model requests. */
export const chassisModels = [
  { id: '29827', name: 'SketchUp Mini Sumo Robot', creator: 'bwevans', verified: true, url: 'https://www.thingiverse.com/thing:29827' },
  { id: '248423', name: 'Arduino robot chassis', creator: 'outcastrc', verified: true, url: 'https://www.thingiverse.com/thing:248423' },
  { id: '2982229', name: 'Modelo Thingiverse #2982229', creator: null, verified: false, url: 'https://www.thingiverse.com/thing:2982229' },
  { id: '2123791', name: 'Modelo Thingiverse #2123791', creator: null, verified: false, url: 'https://www.thingiverse.com/thing:2123791' },
  { id: '3911221', name: 'Modelo Thingiverse #3911221', creator: null, verified: false, url: 'https://www.thingiverse.com/thing:3911221' },
  { id: '6719505', name: 'Ikedo Mini Sumo Robot V2', creator: 'Joecarnine', verified: true, url: 'https://www.thingiverse.com/thing:6719505' },
  { id: '1297434', name: 'Modelo Thingiverse #1297434', creator: null, verified: false, url: 'https://www.thingiverse.com/thing:1297434' },
];

const MAX_TRIANGLES = 80000;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const sub = (a, b) => a.map((n, i) => n-b[i]);

/** A closed, six-sided tray: 100 x 100 x 12 mm; floor and walls 3 mm. */
function educationalMesh() {
  const outer = [[-50,-35],[-35,-50],[35,-50],[50,-35],[50,50],[-50,50]];
  const inner = [[-47,-33.76],[-33.76,-47],[33.76,-47],[47,-33.76],[47,47],[-47,47]];
  const triangles = [];
  const point = (p, z) => [p[0], p[1], z];
  const quad = (a,b,c,d) => triangles.push([a,b,c], [a,c,d]);
  for (let i=0; i<outer.length; i++) {
    const j=(i+1)%outer.length;
    quad(point(outer[i],0),point(outer[j],0),point(outer[j],12),point(outer[i],12));
    quad(point(inner[j],3),point(inner[i],3),point(inner[i],12),point(inner[j],12));
    quad(point(outer[i],12),point(outer[j],12),point(inner[j],12),point(inner[i],12));
  }
  for (let i=1; i<outer.length-1; i++) {
    triangles.push([point(outer[0],0),point(outer[i+1],0),point(outer[i],0)]);
    triangles.push([point(inner[0],3),point(inner[i],3),point(inner[i+1],3)]);
  }
  return triangles;
}

function inspectMesh(triangles) {
  if (!triangles.length || triangles.length > MAX_TRIANGLES) throw new Error('Use um STL com 1 a 80.000 triângulos.');
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for (const triangle of triangles) for (const point of triangle) for (let axis=0;axis<3;axis++) {
    const value=point[axis];
    if (!Number.isFinite(value) || Math.abs(value)>1e7) throw new Error('O STL contém coordenadas inválidas.');
    min[axis]=Math.min(min[axis],value); max[axis]=Math.max(max[axis],value);
  }
  const dimensions=max.map((v,i)=>v-min[i]);
  if (Math.max(...dimensions)<1e-6) throw new Error('O STL não contém geometria visível.');
  return { triangles, min, max, dimensions, center:max.map((v,i)=>(v+min[i])/2) };
}

/** Both the binary and the ASCII STL formats; coordinates are displayed as mm. */
export function parseSTL(buffer) {
  if (!(buffer instanceof ArrayBuffer)) throw new Error('Arquivo STL inválido.');
  if (buffer.byteLength>MAX_FILE_BYTES) throw new Error('O limite do visualizador é de 16 MB.');
  const triangles=[];
  if (buffer.byteLength>=84) {
    const view=new DataView(buffer);
    const count=view.getUint32(80,true);
    const required=84+count*50;
    // Binary files may start with "solid". Length is the reliable discriminator.
    if (count>0 && required<=buffer.byteLength && buffer.byteLength-required<256) {
      if (count>MAX_TRIANGLES) throw new Error('Use um STL com até 80.000 triângulos.');
      for (let i=0;i<count;i++) {
        const offset=84+i*50+12;
        triangles.push([0,1,2].map(j=>[0,1,2].map(k=>view.getFloat32(offset+j*12+k*4,true))));
      }
      return inspectMesh(triangles);
    }
  }
  const source=new TextDecoder('utf-8',{fatal:false}).decode(buffer);
  const regex=/\bvertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  let match, triangle=[];
  while ((match=regex.exec(source))) {
    triangle.push(match.slice(1).map(Number));
    if (triangle.length===3) { triangles.push(triangle); triangle=[]; }
    if (triangles.length>MAX_TRIANGLES) throw new Error('Use um STL com até 80.000 triângulos.');
  }
  if (triangle.length || !/^\s*solid\b/i.test(source)) throw new Error('Este arquivo não é um STL ASCII ou binário válido.');
  return inspectMesh(triangles);
}

export function mountViewer(container) {
  if (!(container instanceof Element)) throw new Error('Informe o contêiner do visualizador.');
  const root=document.createElement('section');
  root.className='sumo3d';
  root.innerHTML=`
    <style>
      .sumo3d{font-family:inherit;color:#241342;border:1px solid #e5dff0;border-radius:20px;overflow:hidden;background:#fff;max-width:100%;min-width:0}
      .sumo3d *{box-sizing:border-box}.sumo3d .s3d-stage{position:relative;background:#faf9fe;height:370px;min-height:260px;overflow:hidden}
      .sumo3d canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab;outline-offset:-4px}.sumo3d canvas:active{cursor:grabbing}.sumo3d canvas:focus-visible{outline:3px solid #00b7e5}
      .sumo3d .s3d-label{position:absolute;left:20px;top:16px;font-size:13px;letter-spacing:.06em;font-weight:750;text-transform:uppercase;color:#6b567f;pointer-events:none}
      .sumo3d .s3d-scale{position:absolute;right:18px;bottom:16px;color:#6b567f;font-size:12px;pointer-events:none}
      .sumo3d .s3d-controls{display:flex;gap:8px;flex-wrap:wrap;padding:16px 18px;border-top:1px solid #ebe7f3;align-items:center}
      .sumo3d button,.sumo3d .s3d-upload,.sumo3d .s3d-download{font:inherit;font-size:14px;font-weight:650;line-height:1.2;display:inline-flex;justify-content:center;align-items:center;min-height:42px;padding:10px 14px;border-radius:10px;border:1px solid #dcd3ed;background:#fff;color:#57328f;text-decoration:none;cursor:pointer}
      .sumo3d button:hover,.sumo3d .s3d-upload:hover,.sumo3d .s3d-download:hover{background:#f1ebfc;border-color:#9c7dce}.sumo3d button:focus-visible,.sumo3d .s3d-upload:focus-within,.sumo3d a:focus-visible{outline:3px solid #00b7e5;outline-offset:2px}
      .sumo3d .s3d-upload{background:#682fc0;color:white;border-color:#682fc0;position:relative}.sumo3d .s3d-upload:hover{color:#57328f}.sumo3d .s3d-upload input[type=file]{position:absolute;width:1px;height:1px;padding:0;margin:0;border:0;opacity:0;overflow:hidden;clip-path:inset(50%);pointer-events:none}
      .sumo3d .s3d-meta{display:flex;gap:16px;flex-wrap:wrap;padding:0 18px 10px;font-size:14px;color:#58466c}.sumo3d .s3d-note{margin:0;padding:0 18px 16px;font-size:13px;line-height:1.5;color:#6b5c7b}.sumo3d .s3d-status{font-size:14px;margin:0;padding:0 18px 12px;color:#57328f;overflow-wrap:anywhere}.sumo3d .s3d-status:empty{display:none}
      .sumo3d .s3d-name{font-weight:750;max-width:100%;overflow-wrap:anywhere}.sumo3d .s3d-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      @media(max-width:600px){.sumo3d .s3d-stage{height:300px}.sumo3d .s3d-controls{padding:12px;gap:6px}.sumo3d button,.sumo3d .s3d-upload,.sumo3d .s3d-download{font-size:13px;padding:10px 12px}.sumo3d .s3d-meta{gap:7px;flex-direction:column}.sumo3d .s3d-label{left:14px;font-size:12px}}
    </style>
    <div class="s3d-stage">
      <div class="s3d-label">Estudo de chassi · 3D</div>
      <canvas tabindex="0" role="img" aria-label="Modelo tridimensional de chassi. Arraste para girar, use as setas do teclado ou os botões de zoom."></canvas>
      <span class="s3d-scale">Arraste para girar · role para aproximar</span>
    </div>
    <div class="s3d-controls">
      <button type="button" data-action="zoom-in" aria-label="Aproximar modelo">+</button>
      <button type="button" data-action="zoom-out" aria-label="Afastar modelo">−</button>
      <button type="button" data-action="reset">Restaurar vista</button>
      <button type="button" data-action="original">Chassi didático</button>
      <label class="s3d-upload">Abrir STL<input type="file" accept=".stl,model/stl,application/sla" aria-label="Abrir arquivo STL local"></label>
      <a class="s3d-download" href="./assets/chassi-didatico.stl" download="chassi-didatico.stl">Baixar STL didático</a>
    </div>
    <div class="s3d-meta"><span class="s3d-name"></span><span class="s3d-dimensions"></span><span class="s3d-count"></span></div>
    <p class="s3d-status" role="status" aria-live="polite"></p>
    <p class="s3d-note">Modelo didático original, sem furos de fixação. Adapte às peças, folgas e regras da sua categoria antes de imprimir. Arquivos STL não informam unidade; as medidas abaixo são interpretadas em milímetros. O arquivo aberto permanece neste dispositivo.</p>`;
  container.appendChild(root);
  const canvas=root.querySelector('canvas'), stage=root.querySelector('.s3d-stage'), context=canvas.getContext('2d');
  const status=root.querySelector('.s3d-status'), input=root.querySelector('input');
  const abort=new AbortController(), options={signal:abort.signal};
  let destroyed=false, frame=0, mesh=inspectMesh(educationalMesh()), yaw=-0.48, pitch=1.05, zoom=1;
  let width=1,height=1,points=new Map(),previousPinch=null;
  const initialView=()=>{yaw=-0.48;pitch=1.05;zoom=1;requestDraw();};
  const format=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
  function updateInfo(name) {
    root.querySelector('.s3d-name').textContent=name;
    root.querySelector('.s3d-dimensions').textContent=mesh.dimensions.map(format).join(' × ')+' mm (X × Y × Z)';
    root.querySelector('.s3d-count').textContent=mesh.triangles.length.toLocaleString('pt-BR')+' triângulos';
  }
  function requestDraw() { if (!destroyed&&!frame) frame=requestAnimationFrame(draw); }
  function draw() {
    frame=0;
    if (!context||destroyed) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    context.setTransform(dpr,0,0,dpr,0,0);
    context.clearRect(0,0,width,height);
    const extent=Math.max(...mesh.dimensions), scale=Math.min(width*.62,height*.67)/extent*zoom;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const project=p=>{
      const [x,y,z]=p.map((v,i)=>v-mesh.center[i]);
      const xx=x*cy-y*sy, yy=x*sy+y*cy;
      return [width/2+xx*scale,height*.54+(yy*cp-z*sp)*scale,yy*sp+z*cp];
    };
    const line=(a,b,color,lineWidth=1)=>{const p=project(a),q=project(b);context.beginPath();context.moveTo(p[0],p[1]);context.lineTo(q[0],q[1]);context.strokeStyle=color;context.lineWidth=lineWidth;context.stroke();};
    const gridSize=extent*1.25, floor=mesh.min[2]-extent*.04, center=mesh.center;
    for(let i=-5;i<=5;i++){
      const n=i*gridSize/10;
      line([center[0]+n,center[1]-gridSize/2,floor],[center[0]+n,center[1]+gridSize/2,floor],'#e8e0f3');
      line([center[0]-gridSize/2,center[1]+n,floor],[center[0]+gridSize/2,center[1]+n,floor],'#e8e0f3');
    }
    const projected=mesh.triangles.map(t=>{
      const p=t.map(project), normal=cross(sub(t[1],t[0]),sub(t[2],t[0]));
      const length=Math.hypot(...normal)||1;
      const brightness=Math.max(0,normal[0]/length*-.25+normal[1]/length*-.35+normal[2]/length*.85);
      return {p,depth:(p[0][2]+p[1][2]+p[2][2])/3,brightness};
    }).sort((a,b)=>a.depth-b.depth);
    for(const face of projected){
      const p=face.p;
      if(p.every(v=>v[0]<0)||p.every(v=>v[0]>width)||p.every(v=>v[1]<0)||p.every(v=>v[1]>height))continue;
      context.beginPath();context.moveTo(p[0][0],p[0][1]);context.lineTo(p[1][0],p[1][1]);context.lineTo(p[2][0],p[2][1]);context.closePath();
      context.fillStyle=`hsl(267 61% ${39+face.brightness*29}%)`;context.fill();
      if(mesh.triangles.length<3000){context.strokeStyle='rgba(39,13,77,.22)';context.lineWidth=.6;context.stroke();}
    }
    // Dimension line belongs to the original geometry, never to an unrelated STL.
    const a=[mesh.min[0],mesh.max[1]+extent*.13,mesh.min[2]],b=[mesh.max[0],mesh.max[1]+extent*.13,mesh.min[2]];
    line(a,b,'#009fc4',1.5);
    for(const p of [a,b])line([p[0],p[1],p[2]-extent*.025],[p[0],p[1],p[2]+extent*.025],'#009fc4',1.5);
    const label=project([(a[0]+b[0])/2,a[1]+extent*.055,a[2]]);
    context.font='600 12px system-ui,sans-serif';context.textAlign='center';context.fillStyle='#007f9e';context.fillText(format(mesh.dimensions[0])+' mm',label[0],label[1]+14);
  }
  function resize(){
    const rect=stage.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
    width=Math.max(rect.width,1);height=Math.max(rect.height,1);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);requestDraw();
  }
  const observer=new ResizeObserver(resize);observer.observe(stage);
  function adjustZoom(factor){zoom=Math.min(4,Math.max(.3,zoom*factor));requestDraw();}
  root.addEventListener('click',event=>{
    const action=event.target.closest('button[data-action]')?.dataset.action;
    if(action==='zoom-in')adjustZoom(1.2);
    if(action==='zoom-out')adjustZoom(1/1.2);
    if(action==='reset')initialView();
    if(action==='original'){mesh=inspectMesh(educationalMesh());updateInfo('Chassi didático');status.textContent='';input.value='';initialView();}
  },options);
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;
    if(file.size>MAX_FILE_BYTES){status.textContent='Use um STL de até 16 MB.';input.value='';return;}
    status.textContent='Abrindo modelo…';
    try {const buffer=await file.arrayBuffer();if(destroyed)return;const parsed=parseSTL(buffer);mesh=parsed;updateInfo(file.name);status.textContent='STL aberto. Confirme a unidade e a escala no seu fatiador.';initialView();}
    catch(error){status.textContent=error.message||'Não foi possível abrir este STL.';}
    input.value='';
  },options);
  canvas.addEventListener('wheel',event=>{event.preventDefault();adjustZoom(Math.exp(-event.deltaY*.001));},{...options,passive:false});
  canvas.addEventListener('pointerdown',event=>{points.set(event.pointerId,[event.clientX,event.clientY]);canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});previousPinch=null;},options);
  canvas.addEventListener('pointermove',event=>{
    const old=points.get(event.pointerId);if(!old)return;
    points.set(event.pointerId,[event.clientX,event.clientY]);
    if(points.size>=2){const p=[...points.values()],distance=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(previousPinch&&distance)adjustZoom(distance/previousPinch);previousPinch=distance;}
    else{yaw+=(event.clientX-old[0])*.009;pitch=Math.min(2.7,Math.max(.15,pitch+(event.clientY-old[1])*.007));requestDraw();}
  },options);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{points.delete(e.pointerId);previousPinch=null;},options);
  canvas.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(event.key))event.preventDefault();
    if(event.key==='ArrowLeft')yaw-=.12;if(event.key==='ArrowRight')yaw+=.12;
    if(event.key==='ArrowUp')pitch=Math.min(2.7,pitch+.1);if(event.key==='ArrowDown')pitch=Math.max(.15,pitch-.1);
    if(event.key==='+'||event.key==='=')adjustZoom(1.2);if(event.key==='-')adjustZoom(1/1.2);if(event.key==='0')initialView();
    requestDraw();
  },options);
  updateInfo('Chassi didático');resize();
  if(!context)status.textContent='Seu navegador não disponibilizou o Canvas 2D. Você ainda pode baixar o modelo STL.';
  return ()=>{destroyed=true;abort.abort();observer.disconnect();cancelAnimationFrame(frame);points.clear();root.remove();};
}
