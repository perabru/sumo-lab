import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSTL, chassisModels } from '../chassis.js';

const encode = text => new TextEncoder().encode(text).buffer;
const triangle = [[-10, 2, 0], [10, 2, 0], [-10, 12, 5]];

function binarySTL(triangles, header='Binary STL fixture') {
  const buffer=new ArrayBuffer(84+triangles.length*50);
  new Uint8Array(buffer).set(new TextEncoder().encode(header).slice(0,80));
  const view=new DataView(buffer);
  view.setUint32(80,triangles.length,true);
  triangles.forEach((t,i)=>t.forEach((p,j)=>p.forEach((n,k)=>view.setFloat32(84+i*50+12+j*12+k*4,n,true))));
  return buffer;
}

test('reads ASCII STL, including scientific notation, and calculates bounding dimensions',()=>{
  const mesh=parseSTL(encode(`solid triangle
    facet normal 0 0 1
      outer loop
        vertex -1e1 2 0
        vertex +1.0e1 2 0
        vertex -10 1.2e1 5
      endloop
    endfacet
  endsolid triangle`));
  assert.deepEqual(mesh.triangles,[triangle]);
  assert.deepEqual(mesh.min,[-10,2,0]);
  assert.deepEqual(mesh.max,[10,12,5]);
  assert.deepEqual(mesh.dimensions,[20,10,5]);
  assert.deepEqual(mesh.center,[0,7,2.5]);
});

test('reads binary STL even when its header begins with solid',()=>{
  for(const header of ['Binary STL fixture','solid misleading binary header']) {
    const mesh=parseSTL(binarySTL([triangle],header));
    assert.deepEqual(mesh.triangles,[triangle]);
    assert.deepEqual(mesh.dimensions,[20,10,5]);
  }
});

test('rejects malformed and truncated files instead of reading beyond the supplied bytes',()=>{
  assert.throws(()=>parseSTL(encode('not an STL')),/STL/);
  assert.throws(()=>parseSTL(encode('solid x\nvertex 0 0 0\nendsolid x')),/STL/);
  assert.throws(()=>parseSTL('solid x'),/inválido/);
  const truncated=binarySTL([triangle]);
  new DataView(truncated).setUint32(80,2,true);
  assert.throws(()=>parseSTL(truncated),error=>!(error instanceof RangeError));
});

test('untrusted binary counts cannot trigger oversized triangle allocation',()=>{
  const maliciousHeader=new ArrayBuffer(84);
  new DataView(maliciousHeader).setUint32(80,0xffffffff,true);
  assert.throws(()=>parseSTL(maliciousHeader),error=>!(error instanceof RangeError));
  const aboveLimit=new ArrayBuffer(84+80001*50);
  new DataView(aboveLimit).setUint32(80,80001,true);
  assert.throws(()=>parseSTL(aboveLimit),/80\.000/);
  assert.throws(()=>parseSTL(new ArrayBuffer(16*1024*1024+1)),/16 MB/);
});

test('rejects non-finite coordinates and geometry with no extent',()=>{
  const invalid=binarySTL([triangle]);
  new DataView(invalid).setFloat32(96,NaN,true);
  assert.throws(()=>parseSTL(invalid),/coordenadas inválidas/);
  assert.throws(()=>parseSTL(binarySTL([[[0,0,0],[0,0,0],[0,0,0]]])),/geometria visível/);
});

test('downloadable educational chassis is closed, consistently wound and has the documented dimensions',async()=>{
  const bytes=await readFile(new URL('../assets/chassi-didatico.stl',import.meta.url));
  const mesh=parseSTL(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  assert.equal(mesh.triangles.length,44);
  assert.deepEqual(mesh.dimensions,[100,100,12]);
  const edges=new Map();
  for(const t of mesh.triangles)for(let i=0;i<3;i++){
    const from=t[i].join(','),to=t[(i+1)%3].join(',');
    const key=[from,to].sort().join('|');
    const data=edges.get(key)||{count:0,direction:0};
    data.count++;data.direction+=from<to?1:-1;edges.set(key,data);
  }
  assert.equal(edges.size,66);
  for(const [edge,data] of edges){
    assert.equal(data.count,2,`Open/non-manifold edge: ${edge}`);
    assert.equal(data.direction,0,`Inconsistent winding at edge: ${edge}`);
  }
});

test('catalog preserves the seven requested references and only confirmed creator names',()=>{
  assert.deepEqual(chassisModels.map(m=>m.id),['29827','248423','2982229','2123791','3911221','6719505','1297434']);
  for(const model of chassisModels)assert.equal(model.url,`https://www.thingiverse.com/thing:${model.id}`);
  assert.deepEqual(chassisModels.filter(m=>m.verified).map(m=>m.creator),['bwevans','outcastrc','Joecarnine']);
  assert.ok(chassisModels.filter(m=>!m.verified).every(m=>m.creator===null));
});
