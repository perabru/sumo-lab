import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHTML, certificateEligibility} from '../state.js';

const lessons=['intro','montagem','testes'];
const completed=()=>({progress:{completed:{intro:true,montagem:true,testes:true},quizScore:70,assemblyChecked:true}});

test('certificate requires account, every lesson, passing score and assembly declaration',()=>{
  const state=completed();
  assert.equal(certificateEligibility(state,lessons,true).eligible,true);
  assert.equal(certificateEligibility(state,lessons,false).eligible,false);
  for(const lesson of lessons){const changed=structuredClone(state);delete changed.progress.completed[lesson];assert.equal(certificateEligibility(changed,lessons,true).eligible,false);}
  assert.equal(certificateEligibility({...state,progress:{...state.progress,quizScore:69}},lessons,true).eligible,false);
  assert.equal(certificateEligibility({...state,progress:{...state.progress,assemblyChecked:false}},lessons,true).eligible,false);
});

test('completion uses explicit true for known lesson IDs only',()=>{
  const state=completed();
  state.progress.completed.montagem='true';
  state.progress.completed.unrelated=true;
  const result=certificateEligibility(state,lessons,true);
  assert.equal(result.completed,2);
  assert.equal(result.total,3);
  assert.equal(result.lessonsDone,false);
  assert.equal(result.eligible,false);
});

test('certificate gracefully handles absent or malformed progress',()=>{
  for(const state of [null,{}, {progress:{}}, {progress:{quizScore:'not a score',completed:null}}]){
    const result=certificateEligibility(state,lessons,true);
    assert.equal(result.score,0);
    assert.equal(result.completed,0);
    assert.equal(result.eligible,false);
  }
});

test('certificate result reports requirements separately at threshold',()=>{
  const result=certificateEligibility(completed(),lessons,true);
  assert.deepEqual(result,{completed:3,total:3,score:70,lessonsDone:true,quizDone:true,assemblyDone:true,signedIn:true,eligible:true});
});

test('escapeHTML protects rendered user names in text and quoted attributes',()=>{
  assert.equal(escapeHTML('<img src=x onerror="alert(1)"> & \'name\''),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;name&#39;');
  assert.equal(escapeHTML('Bruno Michel — Robô 01'),'Bruno Michel — Robô 01');
  assert.equal(escapeHTML(), '');
});
