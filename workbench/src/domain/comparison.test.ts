import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonRect, compositionKey} from './comparison';
import {emptyWorkspace} from './model';

test('comparison uses the recorded foreground and rounds both edges exactly as the GPU API', () => {
  const doc = {...emptyWorkspace().document, foregroundAssetId:'fg', placement:{x:.14,y:.3866341463414634,width:.72,height:.3933658536585366}};
  const asset = {id:'fg',transparent:true,bounds:{x:44,y:118,width:410,height:224}};
  assert.deepEqual(comparisonRect(doc,asset),{x:143,y:396,width:738,height:403});
  assert.throws(()=>comparisonRect(doc,{...asset,id:'other-product'}),/geometry_mismatch/);
  assert.throws(()=>comparisonRect(doc,{...asset,transparent:false}),/geometry_mismatch/);
  assert.throws(()=>comparisonRect({...doc,placement:{...doc.placement,width:.9}},asset),/geometry_mismatch/);
  assert.throws(()=>comparisonRect({...doc,placement:{...doc.placement,x:NaN}},asset),/geometry_mismatch/);
});

test('a saved AI result compares with its own snapshot after the draft changes', () => {
  const saved = {...emptyWorkspace().document,sourceAssetId:'old',foregroundAssetId:'old-fg'};
  const key = compositionKey(saved);
  const draft = {...saved,revision:5,sourceAssetId:'new',foregroundAssetId:'new-fg'};
  assert.notEqual(compositionKey(draft),key);
  assert.equal(compositionKey({...saved,revision:9}),key);
  assert.notEqual(compositionKey({...saved,scene:'wood'}),key);
});
