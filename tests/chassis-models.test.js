import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {educationalModels,createChassisMesh,meshToSTL} from '../chassis-models.js';

const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const key=point=>point.join(',');

function verticalHits(triangles,x,y){
  const hits=[];
  for(const [a,b,c] of triangles){
    const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(denominator)<1e-9)continue;
    const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/denominator;
    const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/denominator;
    const w=1-u-v;
    if(u>=-1e-8&&v>=-1e-8&&w>=-1e-8)hits.push(u*a[2]+v*b[2]+w*c[2]);
  }
  return hits;
}

for(const model of educationalModels){
  test(`${model.id}: exact exterior dimensions, no degenerate triangles and closed manifold`,()=>{
    const triangles=createChassisMesh(model.id);
    assert.ok(triangles.length>100&&triangles.length<20000);
    const vertices=new Set(),edges=new Map(),faces=new Set(),adjacency=new Map();
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    let signedVolume=0;
    for(const triangle of triangles){
      for(const point of triangle){
        assert.ok(point.every(Number.isFinite));
        for(let i=0;i<3;i++){min[i]=Math.min(min[i],point[i]);max[i]=Math.max(max[i],point[i]);}
        vertices.add(key(point));
      }
      const normal=cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0]));
      assert.ok(Math.hypot(...normal)>1e-8,'Degenerate triangle');
      const triangleKey=triangle.map(key).sort().join('|');
      assert.ok(!faces.has(triangleKey),'Duplicate surface triangle');faces.add(triangleKey);
      const bc=cross(triangle[1],triangle[2]);
      signedVolume+=triangle[0].reduce((sum,v,i)=>sum+v*bc[i],0)/6;
      for(let i=0;i<3;i++){
        const a=key(triangle[i]),b=key(triangle[(i+1)%3]);
        const edgeKey=[a,b].sort().join('|');
        const entry=edges.get(edgeKey)||{count:0,direction:0};
        entry.count++;entry.direction+=a<b?1:-1;edges.set(edgeKey,entry);
        if(!adjacency.has(a))adjacency.set(a,new Set());
        if(!adjacency.has(b))adjacency.set(b,new Set());
        adjacency.get(a).add(b);adjacency.get(b).add(a);
      }
    }
    assert.deepEqual(min,[-model.width/2,-model.length/2,0]);
    assert.deepEqual(max,[model.width/2,model.length/2,model.height]);
    assert.ok(signedVolume>1000,'Surface must have outward winding and positive enclosed volume');
    for(const [edge,entry] of edges){assert.equal(entry.count,2,`Non-manifold edge ${edge}`);assert.equal(entry.direction,0,`Inconsistent winding ${edge}`);}
    // A continuous chassis, not disconnected closed shells touching at a vertex.
    const seen=new Set(),todo=[vertices.values().next().value];
    while(todo.length){const current=todo.pop();if(seen.has(current))continue;seen.add(current);for(const next of adjacency.get(current))if(!seen.has(next))todo.push(next);}
    assert.equal(seen.size,vertices.size);
    assert.equal(vertices.size-edges.size+triangles.length,2-2*model.holes.length,'Euler genus must match the through-floor openings');
  });

  test(`${model.id}: declared holes are real openings and clear area remains inside walls`,()=>{
    const triangles=createChassisMesh(model.id);
    for(const hole of model.holes){
      for(const [dx,dy] of [[0,0],[.45,0],[-.45,0],[0,.45],[0,-.45]]){
        assert.equal(verticalHits(triangles,hole.x+dx*hole.width,hole.y+dy*hole.length).length,0,`Blocked opening at ${hole.x},${hole.y}`);
      }
    }
    const centerHits=verticalHits(triangles,.123,.321);
    assert.ok(centerHits.some(z=>Math.abs(z)<1e-8));
    assert.ok(centerHits.some(z=>Math.abs(z-model.baseThickness)<1e-8));
    for(const [x,y] of model.usablePolygon){
      assert.ok(Math.abs(x)<=model.width/2-3);
      assert.ok(y>=-model.length/2+3&&y<=model.length/2-3);
    }
  });

  test(`${model.id}: downloadable STL matches the current original mesh`,async()=>{
    const saved=await readFile(new URL(`../assets/chassis/${model.id}.stl`,import.meta.url),'utf8');
    assert.equal(saved,meshToSTL(createChassisMesh(model.id),model.id));
    assert.ok(saved.startsWith(`solid ${model.id}\n`));
    assert.ok(saved.endsWith(`endsolid ${model.id}\n`));
  });
}

test('wedge has a continuous 15 mm front incline, excluded from its usable area',()=>{
  const model=educationalModels.find(m=>m.id==='cunha-150'),triangles=createChassisMesh(model.id);
  const front=-model.length/2;
  for(const [offset,height] of [[0.1,.8+2.2*.1/15],[7.5,1.9],[14.9,.8+2.2*14.9/15]]){
    const hits=verticalHits(triangles,.123,front+offset);
    assert.ok(hits.some(z=>Math.abs(z-height)<1e-6),`Incorrect ramp height at ${offset} mm`);
  }
  assert.ok(model.usablePolygon.every(([,y])=>y>=front+15));
});

test('catalog has all five intended footprints and safe STL naming',()=>{
  assert.deepEqual(educationalModels.map(m=>[m.width,m.length]),[[100,100],[120,140],[120,150],[120,120],[160,180]]);
  assert.throws(()=>createChassisMesh('missing'),RangeError);
  assert.throws(()=>meshToSTL([]),TypeError);
  assert.throws(()=>meshToSTL([[[0,0,0],[0,0,0],[0,0,0]]]),/degenerado/);
  const stl=meshToSTL([[[0,0,0],[1,0,0],[0,1,0]]],'name\nfacet injected');
  assert.ok(stl.startsWith('solid name_facet_injected\n'));
});
