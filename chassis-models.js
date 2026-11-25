/**
 * Original parametric study chassis. Units: millimetres. Front: negative Y.
 * The meshes describe the named geometry only; they do not certify component
 * compatibility, print strength, tolerances or eligibility for a competition.
 * Measure the actual parts and adapt/add mounting holes before fabrication.
 *
 * Global, nonuniform voxel coordinates keep every exposed face edge aligned.
 * A shared vertex transform adds the wedge's continuous inclined front plate.
 */

const mounting = (positions) => positions.map(([x,y])=>({x,y,width:4,length:4,type:'mount',label:'Furo quadrado de fixação · 4 × 4 mm'}));
const straps = (width, yPositions) => yPositions.flatMap(y=>[-1,1].map(side=>({x:side*(width/2-12),y,width:6,length:16,type:'strap',label:'Passagem para abraçadeira · 6 × 16 mm'})));

const specs = [
  {id:'compacto-100',name:'Compacto 100',subtitle:'Base compacta com frente aberta',width:100,length:100,height:12,frontLip:0,
    holes:[...mounting([[-22,-22],[22,-22],[-22,22],[22,22]]),...straps(100,[0])],
    features:['Piso de 3 mm e paredes laterais de 3 mm','Quatro furos quadrados de 4 mm','Duas passagens de 6 × 16 mm para abraçadeiras','Nervuras internas reforçam as laterais']},
  {id:'classico-120',name:'Clássico 120',subtitle:'Mais espaço para distribuir a eletrônica',width:120,length:140,height:14,frontLip:6,
    holes:[...mounting([[-25,-35],[25,-35],[-25,35],[25,35]]),...straps(120,[-25,25])],
    features:['Piso de 3 mm e laterais de 14 mm de altura','Borda frontal baixa de 6 mm','Quatro passagens para abraçadeiras','Reforços laterais integrados ao piso']},
  {id:'cunha-150',name:'Cunha 150',subtitle:'Rampa frontal integrada à base',width:120,length:150,height:14,frontLip:0,rampLength:15,rampTip:.8,
    holes:[...mounting([[-25,-25],[25,-25],[-25,35],[25,35]]),...straps(120,[-20,30])],
    features:['Rampa frontal de 15 mm, fora da área útil','Espessura da rampa cresce de 0,8 a 3 mm','Laterais reforçadas e traseira de 14 mm','Quatro furos de fixação e quatro passagens para abraçadeiras']},
  {id:'perfil-baixo-120',name:'Perfil baixo 120',subtitle:'Centro de massa próximo ao piso',width:120,length:120,height:8,frontLip:0,cableNotch:20,
    holes:[...mounting([[-24,-24],[24,-24],[-24,24],[24,24]]),...straps(120,[0])],
    features:['Altura externa de 8 mm e piso de 3 mm','Frente aberta e recorte traseiro para cabos','Quatro furos quadrados de 4 mm','Nervuras baixas nas paredes laterais']},
  {id:'expandido-180',name:'Expandido 180',subtitle:'Área ampliada para experimentos',width:160,length:180,height:16,frontLip:6,cableNotch:24,
    holes:[...mounting([[-30,-40],[30,-40],[-30,40],[30,40],[-52,0],[52,0]]),...straps(160,[-45,0,45])],
    features:['Piso de 3 mm e paredes de até 16 mm','Seis furos de fixação e seis passagens para abraçadeiras','Seis nervuras laterais reforçam a estrutura','Recorte traseiro de 24 mm para passagem de cabos']},
];

export const educationalModels = specs.map(spec=>{
  const margin=6;
  const left=-spec.width/2+margin,right=spec.width/2-margin;
  const front=-spec.length/2+(spec.rampLength||0)+3,rear=spec.length/2-margin;
  return {
    id:spec.id,name:spec.name,subtitle:spec.subtitle,
    width:spec.width,length:spec.length,height:spec.height,
    // Conservative clear area excludes 3 mm walls, side ribs and the ramp.
    usablePolygon:[[left,front],[right,front],[right,rear],[left,rear]],
    baseThickness:3,maxComponentHeight:30,
    holes:spec.holes.map(h=>({...h})),features:[...spec.features],
    download:`./assets/chassis/${spec.id}.stl`,
    note:'Furação genérica: meça as peças e adapte a fixação, as folgas e as regras da categoria antes de imprimir.',
  };
});

const uniqueSorted=values=>[...new Set(values.map(n=>Math.round(n*10000)/10000))].sort((a,b)=>a-b);
const inRect=(x,y,rect)=>Math.abs(x-rect.x)<rect.width/2 && Math.abs(y-rect.y)<rect.length/2;

export function createChassisMesh(id) {
  const spec=specs.find(model=>model.id===id);
  if(!spec)throw new RangeError(`Modelo de chassi desconhecido: ${id}`);
  const w=spec.width/2,l=spec.length/2,rampEnd=-l+(spec.rampLength||0);
  const ribYs=spec.id==='expandido-180'?[-l+24,0,l-24]:[rampEnd+20,l-20];
  const ribs=ribYs.flatMap(y=>[-1,1].map(side=>({x:side*(w-4.5),y,width:3,length:8})));
  const xs=[-w,-w+3,-w+6,w-6,w-3,w];
  const ys=[-l,rampEnd,rampEnd+3,l-6,l-3,l];
  for(const hole of spec.holes){xs.push(hole.x-hole.width/2,hole.x+hole.width/2);ys.push(hole.y-hole.length/2,hole.y+hole.length/2);}
  for(const rib of ribs){xs.push(rib.x-rib.width/2,rib.x+rib.width/2);ys.push(rib.y-rib.length/2,rib.y+rib.length/2);}
  if(spec.cableNotch)xs.push(-spec.cableNotch/2,spec.cableNotch/2);
  const X=uniqueSorted(xs),Y=uniqueSorted(ys),Z=uniqueSorted([0,3,6,spec.frontLip,spec.height].filter(z=>z>=0&&z<=spec.height));
  const nx=X.length-1,ny=Y.length-1,nz=Z.length-1;
  const occupied=new Uint8Array(nx*ny*nz),index=(x,y,z)=>(z*ny+y)*nx+x;
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const cx=(X[x]+X[x+1])/2,cy=(Y[y]+Y[y+1])/2,cz=(Z[z]+Z[z+1])/2;
    const floor=cz<3;
    const sidewall=Math.abs(cx)>w-3&&cy>rampEnd;
    const rearwall=cy>l-3&&!(spec.cableNotch&&Math.abs(cx)<spec.cableNotch/2);
    const frontwall=spec.frontLip>0&&cy<rampEnd+3&&cy>=rampEnd&&cz<spec.frontLip;
    const brace=cz<6&&ribs.some(rib=>inRect(cx,cy,rib));
    const hole=spec.holes.some(h=>inRect(cx,cy,h));
    if((floor||sidewall||rearwall||frontwall||brace)&&!hole)occupied[index(x,y,z)]=1;
  }
  const filled=(x,y,z)=>x>=0&&x<nx&&y>=0&&y<ny&&z>=0&&z<nz&&occupied[index(x,y,z)]===1;
  const transform=p=>{
    if(spec.rampLength&&p[1]<rampEnd&&p[2]<=3){
      const fraction=(p[1]+l)/spec.rampLength;
      return [p[0],p[1],Math.round(p[2]*(spec.rampTip/3+fraction*(1-spec.rampTip/3))*1000000)/1000000];
    }
    return p;
  };
  const triangles=[];
  const quad=(a,b,c,d)=>{a=transform(a);b=transform(b);c=transform(c);d=transform(d);triangles.push([a,b,c],[a,c,d]);};
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    if(!filled(x,y,z))continue;
    const x0=X[x],x1=X[x+1],y0=Y[y],y1=Y[y+1],z0=Z[z],z1=Z[z+1];
    if(!filled(x-1,y,z))quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]);
    if(!filled(x+1,y,z))quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]);
    if(!filled(x,y-1,z))quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]);
    if(!filled(x,y+1,z))quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]);
    if(!filled(x,y,z-1))quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0]);
    if(!filled(x,y,z+1))quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]);
  }
  return triangles;
}

export function meshToSTL(triangles,name='chassi_didatico') {
  if(!Array.isArray(triangles)||!triangles.length)throw new TypeError('A malha precisa conter triângulos.');
  const safeName=String(name).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'chassi_didatico';
  const lines=[`solid ${safeName}`];
  for(const triangle of triangles){
    if(!Array.isArray(triangle)||triangle.length!==3||triangle.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>!Number.isFinite(n))))throw new TypeError('Triângulo inválido.');
    const a=triangle[1].map((v,i)=>v-triangle[0][i]),b=triangle[2].map((v,i)=>v-triangle[0][i]);
    const normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=Math.hypot(...normal);
    if(length<1e-10)throw new TypeError('A malha contém um triângulo degenerado.');
    lines.push(`  facet normal ${normal.map(v=>v/length).join(' ')}`,'    outer loop');
    for(const point of triangle)lines.push(`      vertex ${point.join(' ')}`);
    lines.push('    endloop','  endfacet');
  }
  lines.push(`endsolid ${safeName}`,'');
  return lines.join('\n');
}
