import {educationalModels,createChassisMesh} from './chassis-models.js';
import {mountFitChecker} from './component-fit-ui.js';
import {escapeHTML as esc} from './state.js';

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

/** The public API keeps the route's single cleanup callback. */
export function mountViewer(container) {
  const root=document.createElement('section');root.className='chassis-lab';
  const silhouette=model=>`<svg viewBox="0 0 180 130" aria-hidden="true"><path d="M25 30 L155 30 L155 103 L25 103 Z" fill="#f2ebff" stroke="#8858d3" stroke-width="3"/><path d="M25 30 L38 18 L167 18 L155 30 M155 103 L167 91 L167 18" fill="none" stroke="#c1a4e6" stroke-width="3"/>${model.id.includes('cunha')?'<path d="M25 103 L12 117 L144 117 L155 103" fill="#48d9ec" stroke="#2596b6"/>':''}${model.holes.slice(0,6).map((h,i)=>`<rect x="${49+(i%2)*64}" y="${43+Math.floor(i/2)*18}" width="8" height="6" rx="1" fill="#8858d3"/>`).join('')}</svg>`;
  root.innerHTML=`<div class="chassis-picks" role="group" aria-label="Escolha um chassi">${educationalModels.map(m=>`<button class="chassis-pick" data-model="${m.id}" aria-pressed="false">${silhouette(m)}<strong>${esc(m.name)}</strong><span>${m.width} × ${m.length} mm</span></button>`).join('')}</div>
  <section class="chassis-view"><div class="chassis-stage"><div class="chassis-stage-title"><span>VISUALIZADOR 3D</span><strong data-name></strong></div><span class="chassis-mode" data-render-mode>Preparando 3D…</span><canvas tabindex="0" role="img" aria-label="Chassi em 3D. Arraste para girar. Use os botões para escolher a vista ou ajustar o zoom."></canvas><div class="chassis-stage-foot"><span data-size></span><span>Arraste para girar</span></div></div>
  <div class="chassis-tools"><div class="chassis-views" role="group" aria-label="Vista do chassi"><button data-view="perspective" class="active">3D</button><button data-view="top">De cima</button><button data-view="front">Frente</button><button data-view="side">Lado</button></div><div class="chassis-zoom"><button data-zoom="1.2" aria-label="Aproximar chassi">+</button><button data-zoom="0.833333" aria-label="Afastar chassi">−</button><button data-reset>Redefinir vista</button></div></div>
  <div class="chassis-toggles"><label><input type="checkbox" data-show-parts checked> Mostrar peças</label><label><input type="checkbox" data-exploded> Separar peças</label><span class="chassis-legend"><i></i> Placa <i></i> Ponte H <i></i> Bateria</span></div>
  <div class="chassis-info"><div><p data-subtitle></p><span data-features></span></div><a data-download class="button primary" download>Baixar este chassi (.STL)</a></div>
  <p class="chassis-short-note">Furos e encaixes genéricos. Confira a fixação das suas peças antes de imprimir. O desenho das peças é uma representação das medidas.</p></section>
  <div class="chassis-import"><div><strong>Já tem um modelo?</strong><p>Abra o arquivo STL do Thingiverse ou do seu computador.</p></div><label class="button outline chassis-upload">Abrir meu STL<input type="file" accept=".stl,model/stl,application/sla" aria-label="Abrir meu arquivo STL"></label></div>
  <p class="chassis-status" role="status" aria-live="polite"></p>
  <form class="chassis-import-measures panel" hidden><h2>Meça a área onde as peças vão ficar.</h2><p>O STL mostra a forma. Para verificar o espaço, informe um retângulo plano e livre de paredes, rampa e apoios. Medidas em milímetros.</p><div class="form-grid"><label>Largura útil (mm)<input name="width" type="number" min="1" max="2000" step="0.1" required></label><label>Comprimento útil (mm)<input name="length" type="number" min="1" max="2000" step="0.1" required></label><label>Centro X da área útil (mm)<input name="centerX" type="number" min="-2000" max="2000" value="0" step="0.1" required></label><label>Centro Y da área útil (mm)<input name="centerY" type="number" min="-2000" max="2000" value="0" step="0.1" required></label><label>Espessura da base (mm)<input name="base" type="number" min="0.5" max="100" value="3" step="0.1" required></label></div><p class="fine-print" style="margin-top:14px">X=0 e Y=0 ficam no centro externo do modelo. O arquivo deve estar em mm, com a base horizontal e virada para cima. A verificação usa a área que você informou, sem reconhecer encaixes automaticamente.</p><button class="button primary" type="submit">Usar estas medidas</button></form>
  <div class="chassis-fit-mount"></div>`;
  container.appendChild(root);
  const q=s=>root.querySelector(s),stage=q('.chassis-stage'),canvas=q('canvas'),status=q('.chassis-status'),upload=q('input[type=file]'),measureForm=q('form'),fitMount=q('.chassis-fit-mount');
  const abort=new AbortController(),opts={signal:abort.signal};
  let destroyed=false,scene=null,fit=null,selected=educationalModels.find(m=>m.id==='classico-120')||educationalModels[0],mesh=inspectMesh(createChassisMesh(selected.id)),fitData={components:[],result:null},importGeneration=0;
  let fallback=null,frame=0,yaw=-.55,pitch=.95,zoom=1,drag=null;
  const format=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:1});
  function info(){q('[data-name]').textContent=selected.name;q('[data-size]').textContent=mesh.dimensions.map(format).join(' × ')+' mm';q('[data-subtitle]').textContent=selected.subtitle||'Seu modelo STL';q('[data-features]').textContent=selected.features?.slice(0,2).join(' · ')||'Confira a unidade e a posição da base antes de medir.';root.querySelectorAll('[data-model]').forEach(b=>{b.classList.toggle('selected',b.dataset.model===selected.id);b.setAttribute('aria-pressed',String(b.dataset.model===selected.id))});const d=q('[data-download]');d.hidden=!!selected.manual;d.href=selected.download||'#';d.download=selected.id+'.stl';q('[data-exploded]').checked=false}
  function updateScene(){scene?.setChassis(mesh,selected);scene?.setComponents(fitData.components,fitData.result);scene?.setOptions({showParts:q('[data-show-parts]').checked,exploded:q('[data-exploded]').checked});requestFallback()}
  function initFit(model){if(fit)fit.setModel(model);else fit=mountFitChecker(fitMount,{model,onChange:data=>{fitData=data;scene?.setComponents(data.components,data.result);requestFallback()}});fitMount.hidden=false}
  function choose(id){const model=educationalModels.find(m=>m.id===id);if(!model)return;importGeneration++;selected=model;mesh=inspectMesh(createChassisMesh(id));status.textContent='';measureForm.hidden=true;upload.value='';info();initFit(selected);updateScene();reset()}
  function reset(){scene?.reset();yaw=-.55;pitch=.95;zoom=1;root.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='perspective'));requestFallback()}
  function requestFallback(){if(!scene&&fallback&&!frame&&!destroyed)frame=requestAnimationFrame(drawFallback)}
  function drawFallback(){
    frame=0;if(destroyed||scene||!fallback)return;
    const ctx=fallback.getContext('2d');if(!ctx)return;
    const r=stage.getBoundingClientRect(),width=Math.max(1,r.width),height=Math.max(1,r.height),dpr=Math.min(globalThis.devicePixelRatio||1,1.5);
    fallback.width=Math.round(width*dpr);fallback.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#f8f7fc';ctx.fillRect(0,0,width,height);
    const surfaces=mesh.triangles.map(triangle=>({triangle,color:[130,77,211]})),edges=[];
    const min=[...mesh.min],max=[...mesh.max];
    const bounds=point=>{for(let i=0;i<3;i++){min[i]=Math.min(min[i],point[i]);max[i]=Math.max(max[i],point[i])}};
    const fitById=new Map((fitData.result?.items||[]).map(item=>[String(item.id),item]));
    if(q('[data-show-parts]').checked)for(const part of fitData.components.slice(0,100)){
      if(part.enabled===false)continue;
      const values=['width','length','height'].map(key=>Number(part[key]));
      const [w,l,h]=values,x=Number(part.x||0),y=Number(part.y||0),rotation=Number(part.rotation||0)*Math.PI/180;
      if(![...values,x,y,rotation].every(Number.isFinite)||values.some(v=>v<=0))continue;
      const exploded=q('[data-exploded]').checked,bottom=part.layer==='bottom';
      const z=bottom?-2-h-(exploded?25:0):Number(selected.baseThickness||3)+2+(exploded?30:0);
      const ca=Math.cos(rotation),sa=Math.sin(rotation);
      const vertices=[[-w/2,-l/2,z],[w/2,-l/2,z],[w/2,l/2,z],[-w/2,l/2,z],[-w/2,-l/2,z+h],[w/2,-l/2,z+h],[w/2,l/2,z+h],[-w/2,l/2,z+h]].map(([px,py,pz])=>[x+px*ca-py*sa,y+px*sa+py*ca,pz]);
      vertices.forEach(bounds);
      const type=String(part.presetId||part.id||'');
      const color=type.startsWith('uno')?[27,153,161]:type.startsWith('esp32')?[48,96,111]:type.startsWith('l298n')?[194,60,86]:type.startsWith('battery')?[54,61,78]:/^(n20|tt)/.test(type)?[200,156,70]:[127,139,160];
      for(const [a,b,c,d]of[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]]){
        surfaces.push({triangle:[vertices[a],vertices[b],vertices[c]],color},{triangle:[vertices[a],vertices[c],vertices[d]],color});
      }
      const edgeColor=fitById.get(String(part.id))?.fits===false?[247,64,96]:color.map(v=>Math.round(v*.6+100));
      for(const [a,b]of[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])edges.push({a:vertices[a],b:vertices[b],color:edgeColor});
    }
    const center=min.map((v,i)=>(v+max[i])/2),c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    // Orthographic camera: pitch=pi/2 really is the top view; front is -Y.
    const rotated=p=>{const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2],xx=x*c-y*s,yy=-x*s-y*c;return[xx,yy*sp-z*cp,yy*cp+z*sp]};
    const projectedBounds=[];for(const x of[min[0],max[0]])for(const y of[min[1],max[1]])for(const z of[min[2],max[2]])projectedBounds.push(rotated([x,y,z]));
    const left=Math.min(...projectedBounds.map(p=>p[0])),right=Math.max(...projectedBounds.map(p=>p[0])),top=Math.min(...projectedBounds.map(p=>p[1])),bottom=Math.max(...projectedBounds.map(p=>p[1]));
    const scale=Math.min((width-48)/Math.max(1,right-left),(height-116)/Math.max(1,bottom-top))*zoom;
    const project=p=>{const v=rotated(p);return[width/2+(v[0]-(left+right)/2)*scale,height*.53+(v[1]-(top+bottom)/2)*scale,v[2]]};
    const floorZ=min[2]-4,span=Math.max(max[0]-min[0],max[1]-min[1],60),gridStep=Math.max(10,Math.ceil(span/16/10)*10);
    ctx.lineWidth=.7;ctx.strokeStyle='#e5dfed';ctx.beginPath();
    for(let i=-12;i<=12;i++){
      for(const endpoints of[[[center[0]+i*gridStep,center[1]-span,floorZ],[center[0]+i*gridStep,center[1]+span,floorZ]],[[center[0]-span,center[1]+i*gridStep,floorZ],[center[0]+span,center[1]+i*gridStep,floorZ]]]){
        const a=project(endpoints[0]),b=project(endpoints[1]);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
      }
    }ctx.stroke();
    const shadow=project([center[0],center[1],floorZ]);ctx.save();ctx.translate(shadow[0],shadow[1]);ctx.scale(1,.38);
    const shadowRadius=Math.max(15,Math.min(width*.35,span*scale*.58));
    const gradient=ctx.createRadialGradient(0,0,shadowRadius*.1,0,0,shadowRadius);gradient.addColorStop(0,'rgba(64,41,100,.18)');gradient.addColorStop(1,'rgba(64,41,100,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,shadowRadius,0,Math.PI*2);ctx.fill();ctx.restore();
    // Software depth buffering prevents rear faces showing through holes/walls,
    // and avoids the antialias seams caused by filling adjacent triangles alone.
    const pixelWidth=fallback.width,pixelHeight=fallback.height,image=ctx.getImageData(0,0,pixelWidth,pixelHeight),pixels=image.data,depths=new Float32Array(pixelWidth*pixelHeight);depths.fill(-Infinity);
    const lightLength=Math.hypot(-.35,-.5,1),view=[-s*cp,-c*cp,sp];
    for(const surface of surfaces){
      const triangle=surface.triangle,normal=cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0])),normalLength=Math.hypot(...normal);
      if(normalLength<1e-12)continue;
      const facing=normal.reduce((sum,n,i)=>sum+n*view[i],0);
      // Imported files can have inconsistent winding; depth testing still hides back faces.
      if(!selected.manual&&facing<=1e-9)continue;
      const flip=facing<0?-1:1,brightness=Math.max(0,flip*(-.35*normal[0]-.5*normal[1]+normal[2])/(normalLength*lightLength)),shade=.56+.51*brightness;
      const rgb=surface.color.map(n=>Math.min(255,Math.round(n*shade+brightness*9)));
      const projected=triangle.map(p=>{const v=project(p);return[v[0]*dpr,v[1]*dpr,v[2]]});
      const [a,b,c]=projected,area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(area)<1e-8)continue;
      const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(pixelWidth-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(pixelHeight-1,Math.ceil(Math.max(a[1],b[1],c[1])));
      const inv=1/area;
      for(let py=y0;py<=y1;py++)for(let px=x0;px<=x1;px++){
        const dx=px+.5-a[0],dy=py+.5-a[1],u=(dx*(c[1]-a[1])-dy*(c[0]-a[0]))*inv,v=((b[0]-a[0])*dy-(b[1]-a[1])*dx)*inv;
        if(u< -1e-7||v< -1e-7||u+v>1.0000001)continue;
        const depth=a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]),index=py*pixelWidth+px;
        if(depth<depths[index]-1e-5)continue;depths[index]=depth;const offset=index*4;pixels[offset]=rgb[0];pixels[offset+1]=rgb[1];pixels[offset+2]=rgb[2];
      }
    }
    // Envelope edges remain occluded by the actual nearer surface.
    for(const edge of edges){const a=project(edge.a),b=project(edge.b),dx=(b[0]-a[0])*dpr,dy=(b[1]-a[1])*dpr,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)));for(let i=0;i<=steps;i++){
      const t=i/steps,x=Math.round(a[0]*dpr+dx*t),y=Math.round(a[1]*dpr+dy*t),depth=a[2]+(b[2]-a[2])*t;
      if(x<0||x>=pixelWidth||y<0||y>=pixelHeight)continue;const index=y*pixelWidth+x;if(depth<depths[index]-.3)continue;const offset=index*4;pixels[offset]=edge.color[0];pixels[offset+1]=edge.color[1];pixels[offset+2]=edge.color[2];
    }}
    ctx.putImageData(image,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#7c6b91';
  }
  function useFallback(){if(destroyed||fallback)return;fallback=document.createElement('canvas');fallback.tabIndex=0;fallback.setAttribute('role','img');fallback.setAttribute('aria-label','Chassi em modo básico. Arraste para girar.');canvas.replaceWith(fallback);q('[data-render-mode]').textContent='Modo básico';fallback.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};fallback.setPointerCapture(e.pointerId)},opts);fallback.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;yaw+=(e.clientX-drag.x)*.009;pitch=Math.max(.08,Math.min(2.6,pitch+(e.clientY-drag.y)*.008));drag={id:e.pointerId,x:e.clientX,y:e.clientY};requestFallback()},opts);fallback.addEventListener('pointerup',()=>drag=null,opts);fallback.addEventListener('pointercancel',()=>drag=null,opts);fallback.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.3,Math.min(4,zoom*Math.exp(-e.deltaY*.001)));requestFallback()},{...opts,passive:false});requestFallback()}
  const observer=new ResizeObserver(requestFallback);observer.observe(stage);
  root.addEventListener('click',e=>{const model=e.target.closest('[data-model]');if(model)choose(model.dataset.model);const view=e.target.closest('[data-view]');if(view){scene?.setView(view.dataset.view);root.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===view));if(view.dataset.view==='top'){pitch=Math.PI/2;yaw=0}else if(view.dataset.view==='front'){pitch=.05;yaw=0}else if(view.dataset.view==='side'){pitch=.05;yaw=Math.PI/2}else{pitch=.95;yaw=-.55}requestFallback()}const z=e.target.closest('[data-zoom]');if(z){const f=Number(z.dataset.zoom);scene?.zoomBy(f);zoom=Math.max(.3,Math.min(4,zoom*f));requestFallback()}if(e.target.closest('.chassis-tools [data-reset]'))reset()},opts);
  for(const key of ['show-parts','exploded'])q('[data-'+key+']').addEventListener('change',()=>{scene?.setOptions({showParts:q('[data-show-parts]').checked,exploded:q('[data-exploded]').checked});requestFallback()},opts);
  upload.addEventListener('change',async()=>{const file=upload.files?.[0];if(!file)return;const generation=++importGeneration;if(file.size>MAX_FILE_BYTES){status.textContent='Use um STL com até 16 MB.';upload.value='';return}status.textContent='Abrindo o seu modelo…';try{const parsed=parseSTL(await file.arrayBuffer());if(destroyed||generation!==importGeneration)return;const centered=parsed.triangles.map(t=>t.map(p=>[p[0]-parsed.center[0],p[1]-parsed.center[1],p[2]-parsed.min[2]]));mesh=inspectMesh(centered);selected={id:'imported',name:file.name,manual:true,width:mesh.dimensions[0],length:mesh.dimensions[1],height:mesh.dimensions[2],baseThickness:3,maxComponentHeight:40,usablePolygon:null};fitData={components:[],result:null};fitMount.hidden=true;measureForm.hidden=false;measureForm.reset();info();updateScene();reset();status.textContent='STL aberto. Informe abaixo a área plana disponível para verificar as peças.'}catch(e){status.textContent=e.message||'Não foi possível abrir este arquivo.'}upload.value=''},opts);
  measureForm.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(measureForm)),w=Number(values.width),l=Number(values.length),x=Number(values.centerX),y=Number(values.centerY),b=Number(values.base);if(![w,l,x,y,b].every(Number.isFinite)||w<=0||l<=0||b<.5||w/2+Math.abs(x)>mesh.dimensions[0]/2+.001||l/2+Math.abs(y)>mesh.dimensions[1]/2+.001||b>mesh.dimensions[2]){status.textContent='A área informada precisa ficar dentro das medidas externas do STL. Confira também a espessura.';return}selected={...selected,manualConfirmed:true,baseThickness:b,usablePolygon:[[x-w/2,y-l/2],[x+w/2,y-l/2],[x+w/2,y+l/2],[x-w/2,y+l/2]],subtitle:'Área útil informada por você'};initFit(selected);updateScene();status.textContent='Verificação ativa para a área que você mediu. As paredes e os furos do STL não são reconhecidos automaticamente.';fitMount.scrollIntoView({behavior:'smooth',block:'start'})},opts);
  info();initFit(selected);
  import('./scene3d.js').then(({mountChassisScene})=>{if(destroyed)return;try{scene=mountChassisScene(canvas,{onError:()=>{const failedScene=scene;scene=null;failedScene?.destroy();useFallback()}});if(!scene){useFallback();return}q('[data-render-mode]').textContent='3D interativo';updateScene()}catch{const failedScene=scene;scene=null;failedScene?.destroy();useFallback()}}).catch(()=>useFallback());
  return()=>{destroyed=true;importGeneration++;abort.abort();observer.disconnect();cancelAnimationFrame(frame);scene?.destroy();fit?.destroy();root.remove()};
}
