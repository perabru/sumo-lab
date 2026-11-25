import test from 'node:test';
import assert from 'node:assert/strict';
import {checkFit,defaultPlacement,componentPresets} from '../fit-checker.js';
const square={usablePolygon:[[-50,-50],[50,-50],[50,50],[-50,50]],maxComponentHeight:40};
const part=(id='p',changes={})=>({id,name:id,x:0,y:0,width:20,length:20,height:10,rotation:0,layer:'top',enabled:true,...changes});

test('clearance containment uses exact corner distance to every polygon edge',()=>{
 assert.equal(checkFit(square,[part('full',{width:96,length:96})]).fits,true);
 assert.equal(checkFit(square,[part('over',{width:96.001,length:96})]).fits,false);
 assert.equal(checkFit(square,[part('side',{x:39})]).fits,false);
});

test('convex polygon containment rejects a rectangle inside bbox but beyond chamfer',()=>{
 const chamfer={usablePolygon:[[-50,-35],[-35,-50],[35,-50],[50,-35],[50,50],[-50,50]],maxComponentHeight:40};
 assert.equal(checkFit(chamfer,[part('corner',{x:42,y:-42,width:10,length:10})],{clearance:0}).fits,false);
 assert.equal(checkFit(chamfer,[part('center')]).fits,true);
});

test('clockwise and repeated closing vertices produce the same usable surface',()=>{
 const clockwise={...square,usablePolygon:[...square.usablePolygon].reverse()};
 const closed={...square,usablePolygon:[...square.usablePolygon,square.usablePolygon[0]]};
 assert.equal(checkFit(clockwise,[part()]).fits,true);
 assert.equal(checkFit(closed,[part()]).fits,true);
});

test('rejects concave, star, degenerate and unavailable mounting surfaces',()=>{
 const invalid=[null,{}, {dimensions:[100,100,12]}, {usablePolygon:[[0,0],[10,0],[10,10],[5,5],[0,10]]}, {usablePolygon:[[0,0],[1,1],[2,2]]}, {usablePolygon:[[0,50],[29,-40],[-47,15],[47,15],[-29,-40]]}];
 for(const model of invalid){const result=checkFit({...model,maxComponentHeight:40},[part()]);assert.equal(result.fits,false);assert.match(result.status,/Superfície/);}
});

test('rotation is arbitrary and is applied around the component center',()=>{
 const rect={usablePolygon:[[-50,-15],[50,-15],[50,15],[-50,15]],maxComponentHeight:40};
 assert.equal(checkFit(rect,[part('wide',{width:80,length:20,rotation:0})]).fits,true);
 assert.equal(checkFit(rect,[part('turned',{width:80,length:20,rotation:90})]).fits,false);
 assert.equal(checkFit(square,[part('angle',{width:40,length:20,rotation:30})]).fits,true);
 assert.deepEqual(checkFit(square,[part('angle',{rotation:-30})]),checkFit(square,[part('angle',{rotation:330})]));
});

test('SAT avoids false collisions from intersecting rotated bounding boxes',()=>{
 const a=part('a',{width:60,length:4,rotation:45});
 const b=part('b',{width:60,length:4,rotation:45,y:20});
 const result=checkFit(square,[a,b]);
 assert.equal(result.fits,true);
 assert.deepEqual(result.collisions,[]);
 const collided=checkFit(square,[a,{...b,x:5,y:5}]);
 assert.equal(collided.fits,false);
 assert.deepEqual(collided.collisions,[['a','b']]);
});

test('peer clearance is measured between actual rectangles, including diagonal corners',()=>{
 assert.equal(checkFit(square,[part('a'),part('b',{x:20})],{clearance:0}).fits,true);
 assert.equal(checkFit(square,[part('a'),part('b',{x:20})],{clearance:2}).fits,false);
 assert.equal(checkFit(square,[part('a'),part('b',{x:22})],{clearance:2}).fits,true);
 // Gaps of 1.5 in both X and Y yield a true corner distance > 2 mm.
 assert.equal(checkFit(square,[part('a'),part('b',{x:21.5,y:21.5})],{clearance:2}).fits,true);
 assert.equal(checkFit(square,[part('a'),part('b',{x:21,y:21})],{clearance:2}).fits,false);
});

test('top and bottom are distinct planes but both need height and containment',()=>{
 const model={...square,maxComponentHeight:{top:30,bottom:12}};
 assert.equal(checkFit(model,[part('a',{height:25}),part('b',{layer:'bottom',height:12})]).fits,true);
 const result=checkFit(model,[part('a'),part('b',{layer:'bottom',height:13})]);
 assert.equal(result.fits,false);
 assert.equal(result.items[1].issues.some(i=>i.includes('Altura')),true);
 assert.deepEqual(result.collisions,[]);
});

test('invalid dimensions, positions, rotation, layers and clearance never report a fit',()=>{
 for(const changes of [{width:0},{length:-1},{height:Infinity},{x:NaN},{y:1e8},{rotation:Infinity},{layer:'middle'}])assert.equal(checkFit(square,[part('bad',changes)]).fits,false);
 assert.equal(checkFit(square,[part()],{clearance:NaN}).fits,false);
 assert.equal(checkFit({...square,maxComponentHeight:undefined},[part()]).fits,false);
});

test('disabled pieces do not collide and duplicate active IDs are rejected',()=>{
 assert.equal(checkFit(square,[part('a'),part('b',{enabled:false})]).fits,true);
 assert.equal(checkFit(square,[part('same'),part('same',{x:30})]).fits,false);
 assert.equal(checkFit(square,[]).fits,false);
 assert.equal(checkFit(square,[part('disabled',{enabled:false})]).fits,false);
});

test('default placement is deterministic, fits a roomy model and separates motor layers',()=>{
 const model={usablePolygon:[[-100,-100],[100,-100],[100,100],[-100,100]],maxComponentHeight:40};
 const selected=['uno','l298n','battery2s','n20-left','n20-right'];
 const placed=defaultPlacement(model,selected);
 assert.deepEqual(placed,defaultPlacement(model,selected));
 assert.equal(placed.length,selected.length);
 assert.equal(placed.every(p=>p.enabled&&p.placementFound),true);
 assert.equal(placed.find(p=>p.id==='n20-left').layer,'bottom');
 assert.equal(placed.find(p=>p.id==='uno').layer,'top');
 assert.equal(checkFit(model,placed).fits,true);
});

test('failed placement retains every enabled part and returns visible fit errors',()=>{
 const tiny={usablePolygon:[[-5,-5],[5,-5],[5,5],[-5,5]],maxComponentHeight:40};
 const placed=defaultPlacement(tiny,['uno','n20-left','n20-left','not-found']);
 assert.equal(placed.length,4);
 assert.equal(placed.every(p=>p.enabled),true);
 assert.equal(placed.every(p=>!p.placementFound),true);
 assert.equal(new Set(placed.map(p=>p.id)).size,4);
 assert.equal(checkFit(tiny,placed).fits,false);
 assert.equal(defaultPlacement({},['uno'])[0].placementFound,false);
});

test('fit calculation does not mutate components or model',()=>{
 const model=structuredClone(square),parts=[part('a'),part('b',{x:25})],before=JSON.stringify({model,parts});
 checkFit(model,parts);
 assert.equal(JSON.stringify({model,parts}),before);
 assert.equal(componentPresets.find(p=>p.id==='uno').width,68.6);
 assert.equal(componentPresets.find(p=>p.id==='uno').estimated,true);
});

test('packing honors measured dimensions, layer, preferred rotation and clearance overrides',()=>{
 const model={usablePolygon:[[-100,-100],[100,-100],[100,100],[-100,100]],maxComponentHeight:{top:40,bottom:12}};
 const placed=defaultPlacement(model,['esp32','l298n'],{clearance:7,overrides:{esp32:{width:85,length:31,height:11,rotation:30,layer:'bottom'},l298n:{width:50,length:55}}});
 const board=placed.find(p=>p.id==='esp32');
 assert.equal(board.width,85);assert.equal(board.length,31);assert.equal(board.height,11);assert.equal(board.rotation,30);assert.equal(board.layer,'bottom');
 assert.equal(checkFit(model,placed,{clearance:7}).fits,true);
 const impossible=defaultPlacement(model,['esp32'],{overrides:{esp32:{width:1000,length:1000}}});
 assert.equal(impossible[0].width,1000);assert.equal(impossible[0].placementFound,false);assert.equal(impossible[0].enabled,true);
});

test('packing retries large-part orientation and supports two TT motors',()=>{
 const model={usablePolygon:[[-54,-67],[54,-67],[54,64],[-54,64]],maxComponentHeight:40};
 const placed=defaultPlacement(model,['uno','l298n','battery2s','tt-left','tt-right']);
 assert.equal(checkFit(model,placed).fits,true);
 assert.equal(placed.find(p=>p.id==='uno').rotation,90);
 assert.equal(placed.filter(p=>p.layer==='bottom').length,2);
});
