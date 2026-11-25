/**
 * Geometric planning only. Units: millimetres; x/y locate each part's centre.
 * Rotation is counterclockwise in degrees, around the centre. Width follows X
 * and length follows Y before rotation. top/bottom are independent planes.
 * The usable surface must be supplied explicitly; an STL bounding box is NOT
 * evidence of a mounting surface. No mounting holes or mechanical loads checked.
 */
export const componentPresets = Object.freeze([
  {id:'uno',name:'Arduino Uno R3',width:68.6,length:53.4,height:25,estimated:true,note:'Placa: 68,6 × 53,4 mm conforme Arduino. Altura de 25 mm é estimada; meça sua placa e amplie a área para conectores, cabo USB e espaçadores.',source:'https://store.arduino.cc/products/arduino-uno-rev3'},
  {id:'esp32',name:'ESP32 DevKit',width:55,length:28,height:15,estimated:true,note:'Envelope aproximado de um DevKit. A largura, o comprimento e os conectores variam entre fabricantes; substitua pelas medidas reais.'},
  {id:'l298n',name:'Módulo L298N',width:43,length:43,height:27,estimated:true,note:'Envelope típico estimado, incluindo dissipador. Meça bornes, dissipador e espaço dos cabos do módulo comprado.'},
  {id:'battery2s',name:'Pack de bateria 2S',width:70,length:38,height:20,estimated:true,note:'Pack de exemplo; não descreve todas as baterias 2S. Inclua proteção, cinta, plugue e saída dos cabos nas medidas.'},
  {id:'n20-left',name:'Motor N20 esquerdo',width:26,length:12,height:12,estimated:true,note:'Corpo aproximado de motor com redução. Eixo, roda, suporte e cabos não estão incluídos; meça o conjunto completo.'},
  {id:'n20-right',name:'Motor N20 direito',width:26,length:12,height:12,estimated:true,note:'Corpo aproximado de motor com redução. Eixo, roda, suporte e cabos não estão incluídos; meça o conjunto completo.'},
  {id:'tt-left',name:'Motor TT esquerdo',width:70,length:23,height:19,estimated:true,note:'Envelope estimado do corpo. Eixos, rodas e suportes variam; ajuste às medidas do conjunto comprado.'},
  {id:'tt-right',name:'Motor TT direito',width:70,length:23,height:19,estimated:true,note:'Envelope estimado do corpo. Eixos, rodas e suportes variam; ajuste às medidas do conjunto comprado.'},
  {id:'tt',name:'Motor TT',width:70,length:23,height:19,estimated:true,note:'Envelope estimado do corpo. Eixos, rodas e suportes variam; ajuste às medidas do conjunto comprado.'}
].map(Object.freeze));

const EPS=1e-7, MAX_PARTS=100;
const number=value=>typeof value==='number'?value:(typeof value==='string'&&value.trim()!==''?Number(value):NaN);
const finite=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const baseNotes=[
  'Resultado geométrico nas superfícies e alturas informadas; não é garantia de montagem.',
  'Furos, parafusos, apoios, rodas, cabos, dissipação e resistência mecânica precisam de conferência própria.',
  'Peças em cima e embaixo são verificadas como planos separados; confirme no robô a distância do chão e a espessura da base.'
];

function surfaceOf(model) {
  const raw=model?.usablePolygon;
  if(!Array.isArray(raw)||raw.length<3||raw.length>100) return {error:'Defina uma superfície útil convexa. As dimensões externas do STL não bastam para verificar encaixe.'};
  let polygon=raw.map(p=>Array.isArray(p)?[number(p[0]),number(p[1])]:[number(p?.x),number(p?.y)]);
  if(polygon.some(p=>p.some(v=>!finite(v,-100000,100000)))) return {error:'A superfície útil contém coordenadas inválidas.'};
  if(polygon.length>3&&Math.hypot(polygon[0][0]-polygon.at(-1)[0],polygon[0][1]-polygon.at(-1)[1])<EPS) polygon.pop();
  let area=0;
  for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];if(Math.hypot(b[0]-a[0],b[1]-a[1])<EPS)return{error:'A superfície útil contém pontos repetidos.'};area+=a[0]*b[1]-b[0]*a[1];}
  if(Math.abs(area)<EPS)return{error:'A superfície útil não tem área válida.'};
  if(area<0)polygon.reverse();
  // Each directed boundary edge must leave every other vertex on its left.
  // Unlike a turn-only check this rejects self-intersecting star polygons too.
  for(let i=0;i<polygon.length;i++)for(const p of polygon)if(cross(polygon[i],polygon[(i+1)%polygon.length],p)<-EPS)return{error:'Use uma superfície convexa sem cruzamentos. Superfícies côncavas exigem outra análise.'};
  const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);
  return{polygon,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}
function heightLimit(model,layer){
  const override=layer==='top'?model?.maxTopHeight:model?.maxBottomHeight;
  const shared=model?.maxComponentHeight;
  return number(override??(shared&&typeof shared==='object'?shared[layer]:shared));
}
function rectangle(component) {
  const angle=component.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),hw=component.width/2,hl=component.length/2;
  return [[-hw,-hl],[hw,-hl],[hw,hl],[-hw,hl]].map(([x,y])=>[component.x+x*c-y*s,component.y+x*s+y*c]);
}
function partOf(raw,index){
  const id=String(raw?.id??'part-'+(index+1));
  const issues=[];
  const part={...raw,id,name:String(raw?.name||id),enabled:raw?.enabled!==false,layer:raw?.layer??'top'};
  for(const key of ['width','length','height']){part[key]=number(raw?.[key]);if(!finite(part[key],0.1,10000))issues.push(`A medida ${key==='width'?'largura':key==='length'?'comprimento':'altura'} deve estar entre 0,1 e 10.000 mm.`);}
  for(const key of ['x','y']){part[key]=number(raw?.[key]??0);if(!finite(part[key],-100000,100000))issues.push(`A posição ${key.toUpperCase()} é inválida.`);}
  part.rotation=number(raw?.rotation??0);
  if(!finite(part.rotation,-1e7,1e7))issues.push('A rotação deve ser um número finito.');
  else part.rotation=((part.rotation%360)+360)%360;
  if(!['top','bottom'].includes(part.layer))issues.push('Escolha a camada superior ou inferior.');
  if(!issues.length)part.polygon=rectangle(part);
  return {part,issues};
}
function isInside(rect,polygon,clearance){
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],edgeLength=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(const corner of rect)if(cross(a,b,corner)/edgeLength<clearance-EPS)return false;
  }
  return true;
}
function projection(polygon,axis){const values=polygon.map(p=>p[0]*axis[0]+p[1]*axis[1]);return[Math.min(...values),Math.max(...values)]}
function overlaps(a,b){
  // SAT over every edge normal; a merely touching edge is not interior overlap.
  for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){
    const p=polygon[i],q=polygon[(i+1)%polygon.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);
    const axis=[-(q[1]-p[1])/length,(q[0]-p[0])/length],pa=projection(a,axis),pb=projection(b,axis);
    if(pa[1]<=pb[0]+EPS||pb[1]<=pa[0]+EPS)return false;
  }
  return true;
}
function pointSegmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function distanceBetween(a,b){let distance=Infinity;for(const [points,segments]of[[a,b],[b,a]])for(const p of points)for(let i=0;i<segments.length;i++)distance=Math.min(distance,pointSegmentDistance(p,segments[i],segments[(i+1)%segments.length]));return distance;}
function conflicts(a,b,clearance){return overlaps(a,b)||(clearance>EPS&&distanceBetween(a,b)<clearance-EPS)}

/** Inspect rectangles against a known convex surface, height limits and peers. */
export function checkFit(model,components,options={}){
  const notes=[...baseNotes],issues=[],collisions=[],list=Array.isArray(components)?components:[];
  const entries=list.slice(0,MAX_PARTS).map(partOf);
  const items=entries.map(({part})=>({id:part.id,fits:!part.enabled,issues:[],enabled:part.enabled}));
  const add=(index,type,message,ids=[items[index]?.id])=>{if(index>=0){items[index].issues.push(message);items[index].fits=false;}issues.push({type,message,componentIds:ids.filter(Boolean)});};
  let clearance=number(options.clearance??2);
  const badClearance=!finite(clearance,0,1000);
  if(badClearance)clearance=0;
  const surface=surfaceOf(model);
  const enabled=entries.map((entry,index)=>({...entry,index})).filter(e=>e.part.enabled);
  const counts=new Map();for(const{part}of enabled)counts.set(part.id,(counts.get(part.id)||0)+1);
  if(!Array.isArray(components))issues.push({type:'input',message:'Informe uma lista de componentes.',componentIds:[]});
  if(list.length>MAX_PARTS)issues.push({type:'input',message:'O limite é de 100 componentes. Nenhum resultado de encaixe pode ser confirmado com esta lista.',componentIds:[]});
  for(const{part,issues:invalid,index}of enabled){
    items[index].fits=true;
    for(const message of invalid)add(index,'invalid',message);
    if(counts.get(part.id)>1)add(index,'duplicate','Use um identificador diferente para cada componente.');
    if(surface.error)add(index,'surface',surface.error);
    if(badClearance)add(index,'clearance','A folga deve estar entre 0 e 1.000 mm.');
    const limit=heightLimit(model,part.layer);
    if(!finite(limit,0.1,10000))add(index,'height','Informe a altura disponível para esta camada.');
    else if(part.height>limit+EPS)add(index,'height',`Altura de ${part.height} mm excede o espaço disponível de ${limit} mm.`);
    if(part.polygon&&!surface.error&&!isInside(part.polygon,surface.polygon,clearance))add(index,'boundary',`A peça ultrapassa a superfície útil ou a folga de ${clearance} mm da borda.`);
  }
  const valid=enabled.filter(e=>e.part.polygon);
  for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
    const a=valid[i],b=valid[j];
    if(a.part.layer!==b.part.layer||!conflicts(a.part.polygon,b.part.polygon,clearance))continue;
    collisions.push([a.part.id,b.part.id]);
    const overlap=overlaps(a.part.polygon,b.part.polygon),message=overlap?'As peças se sobrepõem nesta camada.':`As peças estão a menos de ${clearance} mm uma da outra.`;
    items[a.index].issues.push(`${message} Outra peça: ${b.part.name}.`);items[a.index].fits=false;
    items[b.index].issues.push(`${message} Outra peça: ${a.part.name}.`);items[b.index].fits=false;
    issues.push({type:overlap?'collision':'clearance',message,componentIds:[a.part.id,b.part.id]});
  }
  if(!enabled.length)issues.push({type:'empty',message:'Selecione pelo menos uma peça para verificar.',componentIds:[]});
  if(surface.error)notes.unshift(surface.error);
  if(enabled.some(e=>e.part.estimated))notes.push('Há dimensões estimadas. Meça os componentes reais e atualize os valores antes de fabricar.');
  const fits=enabled.length>0&&issues.length===0;
  const status=surface.error?'Superfície útil não definida ou inválida':!enabled.length?'Nenhuma peça selecionada':fits?'Cabe nas medidas informadas':'Ajuste medidas, posições ou camadas';
  return{fits,status,items,collisions,notes,issues};
}

/**
 * Deterministic greedy placement: large parts first, then a bounded XY grid and
 * 0°/90° rotations. It is a suggestion, not a proof that no other layout exists.
 * Optional overrides[id or presetId] applies measured width/length/height, layer
 * and preferred rotation before packing; options.clearance defaults to 2 mm.
 * Unplaced/unknown parts stay enabled outside the surface, visibly failing QA.
 */
export function defaultPlacement(model,presetIDs,options={}){
  if(!Array.isArray(presetIDs))throw new TypeError('Informe uma lista de peças.');
  if(presetIDs.length>MAX_PARTS)throw new RangeError('O limite é de 100 componentes.');
  const counts=new Map();
  const parts=presetIDs.map((raw,index)=>{
    const presetId=String(raw),preset=componentPresets.find(p=>p.id===presetId),count=(counts.get(presetId)||0)+1;counts.set(presetId,count);
    const id=count===1?presetId:presetId+'-'+count,overrides=options.overrides?.[id]??options.overrides?.[presetId]??{};
    const part={...(preset||{id:presetId,name:'Peça desconhecida: '+presetId,width:0,length:0,height:0,estimated:true,note:'Informe as dimensões reais.'}),id,presetId,x:0,y:0,rotation:0,layer:/^(n20|tt)/.test(presetId)?'bottom':'top',enabled:true,placementFound:false,_index:index};
    for(const key of ['width','length','height','rotation'])if(overrides[key]!==undefined)part[key]=number(overrides[key]);
    if(overrides.layer!==undefined)part.layer=overrides.layer;
    if(Number.isFinite(part.rotation))part.rotation=((part.rotation%360)+360)%360;
    return part;
  });
  const surface=surfaceOf(model),clearance=number(options.clearance??2);
  const ordered=[...parts].sort((a,b)=>b.width*b.length-a.width*a.length||a._index-b._index);
  if(!surface.error&&finite(clearance,0,1000)){
    const spanX=surface.maxX-surface.minX,spanY=surface.maxY-surface.minY;
    const step=Math.max(2,Math.max(spanX,spanY)/65);
    // Retry a few orientation preferences for the largest top-side pieces.
    // Greedy packing alone can miss the useful 90° Uno + battery arrangement.
    const pivotIDs=ordered.filter(p=>p.layer==='top').slice(0,parts.length<=12?3:1).map(p=>p.id);
    let best=parts.map(p=>({...p})),bestCount=-1;
    for(let mask=0;mask<2**pivotIDs.length;mask++){
      const candidateParts=ordered.map(p=>({...p})),placed=[];
      for(const part of candidateParts){
        const limit=heightLimit(model,part.layer);
        if(!['top','bottom'].includes(part.layer)||!['width','length','height'].every(key=>finite(part[key],.1,10000))||!Number.isFinite(part.rotation)||!finite(limit,.1,10000)||part.height>limit)continue;
        const pivot=pivotIDs.indexOf(part.id),preferred=(part.rotation+(pivot>=0&&(mask&(1<<pivot))?90:0))%360;
        search:for(const rotation of [preferred,(preferred+90)%360]){
          const radians=rotation*Math.PI/180,ac=Math.abs(Math.cos(radians)),as=Math.abs(Math.sin(radians));
          const rw=part.width*ac+part.length*as,rl=part.width*as+part.length*ac;
          const startX=surface.minX+clearance+rw/2,endX=surface.maxX-clearance-rw/2,startY=surface.minY+clearance+rl/2,endY=surface.maxY-clearance-rl/2;
          if(endX<startX-EPS||endY<startY-EPS)continue;
          const nx=Math.max(1,Math.ceil((endX-startX)/step)),ny=Math.max(1,Math.ceil((endY-startY)/step));
          for(let yi=0;yi<=ny;yi++)for(let xi=0;xi<=nx;xi++){
            const x=startX+(endX-startX)*xi/nx,y=startY+(endY-startY)*yi/ny,candidate={...part,x,y,rotation},polygon=rectangle(candidate);
            if(!isInside(polygon,surface.polygon,clearance)||placed.some(other=>other.layer===part.layer&&conflicts(polygon,other.polygon,clearance)))continue;
            Object.assign(part,{x,y,rotation,placementFound:true});placed.push({...part,polygon});break search;
          }
        }
      }
      const count=candidateParts.filter(p=>p.placementFound).length;
      if(count>bestCount){best=candidateParts;bestCount=count;}
      if(count===parts.length)break;
    }
    for(const part of parts){const found=best.find(p=>p.id===part.id);Object.assign(part,found);}
  }
  let outside=surface.error?1000:surface.maxX+(Number.isFinite(clearance)?clearance:2)+10;
  for(const part of parts){if(!part.placementFound){part.x=outside+Math.max(part.width,10)/2;part.y=surface.error?0:surface.minY;outside+=Math.max(part.width,10)+10;}delete part._index;}
  return parts;
}
