'use client';

import {useEffect,useState} from 'react';
import {Scissors} from 'lucide-react';
import type {LocalAsset, ProductDocument} from '@/domain/contracts';
import {decodeAsset} from '@/client/assets';
import {SceneComparison} from './scene-comparison';

interface Sample {
  id:string;label:string;kind:string;foreground:string;final:string;
  sha256:{foreground:string;final:string};document:ProductDocument;
  elapsedSeconds:number;protectedPixels:number;badPixels:number;
}
async function verifiedImage(file:string,hash:string,signal:AbortSignal) {
  const response=await fetch(`/workbench/comparison/${file}`,{signal});
  if(!response.ok)throw Error('sample_unavailable');
  const bytes=await response.arrayBuffer();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==hash)throw Error('sample_mismatch');
  return new Blob([bytes],{type:'image/png'});
}
export function ComparisonShowcase({samples}:{samples:Sample[]}) {
  const [selected,setSelected]=useState(samples[0].id),[attempt,setAttempt]=useState(0);
  const [loaded,setLoaded]=useState<{id:string;foreground:LocalAsset;ai:Blob}>(),[failed,setFailed]=useState<string>();
  const sample=samples.find(s=>s.id===selected)!;
  useEffect(()=>{
    const controller=new AbortController();
    void Promise.all([verifiedImage(sample.foreground,sample.sha256.foreground,controller.signal),verifiedImage(sample.final,sample.sha256.final,controller.signal)])
      .then(async([foreground,ai])=>({id:sample.id,foreground:{...await decodeAsset(foreground,sample.label,'example'),id:sample.document.foregroundAssetId!},ai}))
      .then(value=>{if(!controller.signal.aborted)setLoaded(value);})
      .catch(()=>{if(!controller.signal.aborted)setFailed(sample.id);});
    return ()=>controller.abort();
  },[sample,attempt]);
  const pair=loaded?.id===sample.id?loaded:undefined;
  return <div className="workbench-app"><header className="site-header"><div className="header-content"><a className="brand-link" href="/workbench/product"><span className="brand-mark"><Scissors size={19}/></span>MiaoCut</a>
    <span className="header-workspace">场景效果对比</span><a className="comparison-back" href="/workbench/product/internal">用自己的商品制作</a></div></header>
    <main className="workspace-main comparison-main"><div className="page-heading"><div><h1>免费合成和 AI 场景，有什么不同？</h1><p>切换同一商品的两种成图，先看效果，再决定是否需要生成。</p></div></div>
      <div className="comparison-samples" role="group" aria-label="选择对比样图">{samples.map(s=><button type="button" key={s.id} aria-pressed={s.id===selected} onClick={()=>setSelected(s.id)}>{s.label}<small>{s.kind}</small></button>)}</div>
      <div className="demo-notice">右侧是已保存的真实 GPU 生成结果，查看不会发起任务或扣积分。当前样图用于功能验证，尚未通过完整商品质量验收。</div>
      {failed===sample.id&&!pair?<div className="error-notice" role="alert">样图读取失败。<button type="button" className="subtle-button" onClick={()=>{setFailed(undefined);setAttempt(n=>n+1);}}>重新读取</button></div>:null}
      <SceneComparison key={sample.id} document={sample.document} foreground={pair?.foreground} ai={pair?.ai}/>
      <section className="comparison-evidence" aria-label="样图记录"><div><strong>本张样图记录</strong><p>生成于 2026-10-25，1024 × 1024 PNG。耗时包括素材处理、推理与回传，不包含首次环境启动。</p></div>
        <dl><div><dt>该次任务耗时</dt><dd>{Math.round(sample.elapsedSeconds)} 秒</dd></div><div><dt>保护区 RGB 差异</dt><dd>{sample.badPixels} 像素</dd></div><div><dt>保护区覆盖</dt><dd>{sample.protectedPixels.toLocaleString('en-US')} 像素</dd></div></dl>
        <p>重点观察台面材质、落地阴影与边缘融合。像素检查只证明保护区未改变，不代表背景或商品整体质量已合格。</p><a href="/workbench/comparison/provenance.json" download>下载样图来源记录</a>
      </section>
    </main></div>;
}
