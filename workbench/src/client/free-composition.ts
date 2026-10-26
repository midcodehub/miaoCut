import type {LocalAsset, ProductDocument} from '@/domain/contracts';
import {comparisonRect, type FreeBackground} from '@/domain/comparison';
import {imageFromUrl} from './assets';
import {drawBackground, loadBackdrop} from './demo-renderer';

interface EditorState {
  background: {type:string;color:string;gradientId:string;image:unknown};
  layout: {ratio:string;subjectScale:number;offsetX:number;offsetY:number;exportSize:string};
  shadow: unknown;
}
interface LegacyEditor {
  originalOffset: {x:number;y:number};
  exportImage(state:EditorState): Promise<{blob:Blob;width:number;height:number}>;
  dispose():void;
}

/** Uses the free site's actual engine and shadow presets. This function never submits a model job. */
export async function renderFreeComposition(doc:ProductDocument, asset:LocalAsset, background:FreeBackground, signal:AbortSignal):Promise<Blob> {
  const rect = comparisonRect(doc,asset), url = URL.createObjectURL(asset.blob);
  let editor:LegacyEditor|undefined;
  const placed = document.createElement('canvas'), backdrop = document.createElement('canvas');
  try {
    const [image, engineModule, presetModule, marble] = await Promise.all([
      imageFromUrl(url), import('../../../editor/engine.js'), import('../../../editor/presets.js'),
      background==='scene' ? loadBackdrop() : Promise.resolve(undefined),
    ]);
    signal.throwIfAborted();
    placed.width=placed.height=backdrop.width=backdrop.height=1024;
    const ctx=placed.getContext('2d');
    if(!ctx)throw new Error('canvas_unavailable');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const b=asset.bounds;
    ctx.drawImage(image,b.x,b.y,b.width,b.height,rect.x,rect.y,rect.width,rect.height);
    const engine=engineModule.default as unknown as {createEngine(sources:{cutout:HTMLCanvasElement}):LegacyEditor};
    const presets=presetModule.default as unknown as {createDefaultState():EditorState;applyShadowPreset(shadow:unknown,id:string):unknown};
    editor=engine.createEngine({cutout:placed});
    const state=presets.createDefaultState();
    // Place once at the API's exact output coordinates, then keep the original canvas geometry in the free engine.
    state.layout={...state.layout,ratio:'original',subjectScale:1,offsetX:editor.originalOffset.x,offsetY:editor.originalOffset.y,exportSize:'1024'};
    state.shadow=presets.applyShadowPreset(state.shadow,'contact');
    if(background==='scene' && marble) {
      const bg=backdrop.getContext('2d');if(!bg)throw new Error('canvas_unavailable');
      drawBackground(bg,doc.scene,marble);
      state.background={...state.background,type:'image',image:{img:backdrop,scale:1,offsetX:0,offsetY:0}};
    } else state.background={...state.background,type:background==='white'?'solid':'gradient',color:'#FFFFFF',gradientId:'studio-top'};
    const output=await editor.exportImage(state);
    signal.throwIfAborted();
    if(output.width!==1024||output.height!==1024)throw new Error('comparison_geometry_mismatch');
    return output.blob;
  } finally {
    editor?.dispose();URL.revokeObjectURL(url);placed.width=placed.height=backdrop.width=backdrop.height=0;
  }
}
