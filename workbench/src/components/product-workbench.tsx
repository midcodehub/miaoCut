"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, CircleHelp, Download, Focus, Grid2X2, ImagePlus, Info, Layers,
  LoaderCircle, LockKeyhole, Moon, Move, RotateCcw, Scissors, ShieldCheck, Sparkles, Sun, Trash2, Upload, X } from "lucide-react";
import { messages, JOB_TEXT } from "@/client/i18n";
import { useWorkbench } from "@/client/use-workbench";
import { downloadPng } from "@/client/assets";
import { busy, fitPlacement, movePlacement, resizePlacement, SCENES, sizeLimits } from "@/domain/model";
import { EditorCanvas } from "./editor-canvas";
import { BlobImage } from "./blob-image";
import { ResultGallery } from "./result-gallery";

const SCENE_CLASS = { marble: "scene-marble", wood: "scene-wood", geometry: "scene-geometry" };

export function ProductWorkbench() {
  const app = useWorkbench();
  const { state, asset, ready, loadingAsset, dispatch } = app;
  const t = messages[app.locale];
  const upload = useRef<HTMLInputElement>(null), about = useRef<HTMLDialogElement>(null), clearDialog = useRef<HTMLDialogElement>(null);
  const [guides, setGuides] = useState(false), [draggingFile, setDraggingFile] = useState(false);
  const selected = state.results.find(result => result.id === state.view);
  const running = busy(state.job), readonly = !!selected;
  const limits = asset ? sizeLimits(asset) : { min: .2, max: .92, aspect: 1 };
  const changed = !!state.results.length && !readonly && !state.results.some(result =>
    result.snapshot.sourceAssetId === state.document.sourceAssetId && result.snapshot.scene === state.document.scene &&
    (["x", "y", "width", "height"] as const).every(key => result.snapshot.placement[key] === state.document.placement[key]));
  const differentVersion = running && state.job!.snapshot.revision !== state.document.revision;
  const resultAsset = selected ? state.assets.find(a => a.id === selected.snapshot.sourceAssetId) : undefined;
  const named = asset?.origin === "example" ? t.exampleName : asset?.name;
  const activeScene = selected?.snapshot.scene ?? state.document.scene;
  const controlsDisabled = !asset || readonly || !ready || loadingAsset;
  const onFile = (file: File | undefined) => { if (file && ready && !loadingAsset) void app.load(file); };
  const download = () => { if (selected) downloadPng(selected.png, `miaocut-demo-${selected.snapshot.scene}-v${selected.sequence}.png`); };

  return <div className="workbench-app">
    <header className="site-header"><div className="header-content">
      <a href="https://miaocut.app" className="brand-link" aria-label="MiaoCut"><span className="brand-mark"><Scissors size={19} strokeWidth={1.7} /></span>MiaoCut</a>
      <span className="header-divider" /><span className="header-workspace">{t.workspace}</span>
      <div className="header-actions"><a className="comparison-back" href="/workbench/compare">{app.locale === "zh" ? "查看对比样图" : "Compare samples"}</a><button className="demo-badge" onClick={() => about.current?.showModal()} type="button"><span />{t.demo}<CircleHelp size={13} /></button>
        <button className="icon-button language-button" onClick={() => app.setLocale(app.locale === "zh" ? "en" : "zh")} aria-label={t.language} type="button">{app.locale === "zh" ? "EN" : "中"}</button>
        <button className="icon-button" onClick={app.toggleTheme} aria-label={app.dark ? t.switchLight : t.switchDark} title={app.dark ? t.switchLight : t.switchDark} type="button">{app.dark ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>
    </div></header>

    <main className="workspace-main">
      <div className="page-heading"><div><div className="page-context"><span className="context-icon"><Layers size={14} /></span>{t.productWorkspace}</div>
        <h1>{t.title}</h1><p>{t.subtitle}</p></div>
        <div className="local-status"><ShieldCheck size={15} /><span>{t.privacy}</span></div>
      </div>
      <div className="demo-notice"><Info size={15} /><span>{t.demoNotice}</span><button type="button" onClick={() => about.current?.showModal()}>{t.demoDetails}</button></div>
      {app.notice ? <div className="error-notice" role="alert"><span>{t[app.notice]}</span><button type="button" className="icon-button" aria-label={t.dismiss} onClick={app.dismissNotice}><X size={16} /></button></div> : null}

      <div className="workspace-grid">
        <aside className="asset-panel side-panel" aria-label={t.assetTitle}>
          <div className="panel-section"><div className="section-title"><h2>{t.assetTitle}</h2><ImagePlus size={16} /></div><p className="section-description">{t.assetNumber}</p>
            <input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label={t.upload}
              onChange={event => { onFile(event.target.files?.[0]); event.currentTarget.value = ""; }} disabled={!ready || loadingAsset} />
            <button type="button" className={`upload-zone ${draggingFile ? "is-dragging" : ""}`} disabled={!ready || loadingAsset}
              aria-label={asset ? t.replace : t.upload} onClick={() => upload.current?.click()}
              onDragOver={e => { e.preventDefault(); setDraggingFile(true); }} onDragLeave={() => setDraggingFile(false)}
              onDrop={e => { e.preventDefault(); setDraggingFile(false); onFile(e.dataTransfer.files[0]); }}>
              {loadingAsset ? <LoaderCircle className="spinner" size={25} /> : asset ? <span className="asset-thumbnail checkerboard"><BlobImage blob={asset.blob} alt={named} /></span> : <Upload size={25} strokeWidth={1.5} />}
              <span className="upload-zone-label">{loadingAsset ? t.loadingAsset : asset ? t.replace : t.drop}</span><small>{t.fileHint}</small>
            </button>
            {asset ? <div className="asset-meta"><strong title={named}>{named}</strong><span>{asset.width} × {asset.height}</span>
              <p className={asset.transparent ? "subject-ready" : "subject-pending"}>{asset.transparent ? <Check size={13} /> : <Info size={13} />}{asset.transparent ? t.transparentReady : t.needsCutout}</p></div> : null}
            <button type="button" className="sample-button" onClick={() => void app.load("example")} disabled={!ready || loadingAsset}>{t.useExample}<ChevronDown size={13} /></button>
          </div>
          <div className="panel-section scene-section"><div className="section-title"><h2>{t.sceneTitle}</h2><span className="small-count">3</span></div><p className="section-description">{t.sceneHint}</p>
            <div className="scene-list">{SCENES.map(scene => <button type="button" key={scene}
              className={`scene-card ${state.document.scene === scene ? "is-selected" : ""}`}
              onClick={() => dispatch({ type: "scene", scene })} aria-label={t[scene]} aria-pressed={state.document.scene === scene} disabled={!ready}>
              <span className={`scene-thumbnail ${SCENE_CLASS[scene]}`} aria-hidden="true">{scene === "geometry" ? <i /> : null}</span>
              <span className="scene-card-copy"><strong>{t[scene]}</strong><small>{t[`${scene}Detail`]}</small></span>
              <span className="scene-check">{state.document.scene === scene ? <Check size={11} /> : null}</span>
            </button>)}</div><p className="scene-note">{t.sceneNote}</p>
          </div>
        </aside>

        <section className="canvas-panel" aria-label={t.canvasLabel}>
          <div className="canvas-toolbar"><div className="view-tabs" role="tablist" aria-label={t.canvasLabel} onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
            const index = tabs.indexOf(event.target as HTMLButtonElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next]?.focus(); tabs[next]?.click();
          }}>
            <button type="button" id="draft-tab" role="tab" aria-controls="workspace-canvas" tabIndex={readonly ? -1 : 0} aria-selected={!readonly} onClick={() => dispatch({ type: "view", id: "draft" })}>{t.draft}</button>
            <button type="button" id="result-tab" role="tab" aria-controls="workspace-canvas" tabIndex={readonly ? 0 : -1} aria-selected={readonly} disabled={!state.results.length}
              onClick={() => dispatch({ type: "view", id: state.results[0].id })}>{t.result}</button></div>
            <div className="canvas-tools"><span>1:1</span><button type="button" className={`icon-button ${guides ? "is-active" : ""}`} aria-pressed={guides} aria-label={guides ? t.hideGrid : t.grid}
              onClick={() => setGuides(value => !value)} disabled={readonly}><Grid2X2 size={16} /></button></div>
          </div>
          <div className="canvas-space" id="workspace-canvas" role="tabpanel" aria-labelledby={readonly ? "result-tab" : "draft-tab"}>{selected ? <div className="editor-stage completed-stage"><BlobImage blob={selected.png} alt={`${t.demoResult} ${t.version} ${selected.sequence}`} width={1024} height={1024} />
            <span className="stage-mode"><Check size={12} />{t.demoResult}</span></div> :
            <EditorCanvas document={state.document} asset={asset} guides={guides} onPlacement={placement => dispatch({ type: "placement", placement })} t={t} />}
          </div>
          <div className="canvas-caption"><span>{readonly ? <Check size={13} /> : <Move size={13} />}{readonly ? t.resultHint : t.canvasHint}</span>
            <span className="canvas-preset">{t[activeScene]}</span></div>
        </section>

        <aside className="inspector-panel side-panel" aria-label={t.composition}>
          <div className="panel-section"><div className="section-title"><h2>{t.composition}</h2><Move size={16} /></div>
            <div className="editing-state"><span className={readonly ? "ready-dot" : "draft-dot"} />{readonly ? t.readOnly : t.editCurrent}</div>
            <label className="size-label" htmlFor="product-size"><span>{t.scale}</span><output>{Math.round((readonly ? selected.snapshot.placement.width : state.document.placement.width) * 100)}%</output></label>
            <input id="product-size" className="size-slider" type="range" min={limits.min} max={limits.max} step="0.005"
              value={readonly ? selected.snapshot.placement.width : state.document.placement.width} disabled={controlsDisabled}
              onChange={event => { if (asset) dispatch({ type: "placement", placement: resizePlacement(state.document.placement, Number(event.target.value), asset) }); }} />
            <p className="control-help">{t.scaleHelp}</p><div className="placement-actions">
              <button type="button" className="subtle-button" disabled={controlsDisabled} onClick={() => dispatch({ type: "placement", placement: movePlacement(state.document.placement, (1 - state.document.placement.width) / 2, state.document.placement.y) })}><Focus size={14} />{t.center}</button>
              <button type="button" className="subtle-button" disabled={controlsDisabled} onClick={() => { if (asset) dispatch({ type: "placement", placement: fitPlacement(asset) }); }}><RotateCcw size={14} />{t.reset}</button>
            </div>
          </div>
          <div className="panel-section output-section"><h2>{t.output}</h2><dl className="output-spec"><div><dt>{t.spec}</dt><dd>1:1</dd></div><div><dt>{t.format}</dt><dd>PNG</dd></div></dl><p className="output-resolution">{t.resolution}</p></div>
          <div className="generate-section">
            {selected ? <><div className="result-ready"><ShieldCheck size={19} /><span>{t.completeTitle}</span></div>
              <button type="button" className="primary-button" onClick={download}><Download size={17} />{t.download}</button>
              <button type="button" className="secondary-button" disabled={!resultAsset} onClick={() => dispatch({ type: "edit_result", id: selected.id })}><ArrowLeft size={15} />{t.continueEdit}</button></> :
              <><div className="generation-label"><span className="mini-icon"><Sparkles size={16} /></span><div><strong>{t.generate}</strong><span>{t.noCredits}</span></div></div>
                <button type="button" className="primary-button" onClick={app.generate} disabled={!ready || loadingAsset || !asset?.transparent || running}>
                  {running ? <LoaderCircle className="spinner" size={17} /> : <Sparkles size={17} />}{running ? t.generating : t.generate}</button>
                <p className="generation-help">{!asset?.transparent ? (asset ? t.needsCutoutHelp : t.noAsset) : differentVersion ? t.draftNext : changed ? t.dirty : t.opacityHint}</p></>}
          </div>
          <div className="inspector-footer"><LockKeyhole size={13} /><span>{t.saved}</span></div>
        </aside>
      </div>

      <div className="job-status" role="status" aria-live="polite"><span className="job-status-leading">{running ? <LoaderCircle size={14} className="spinner" /> : state.job?.status === "failed" ? <Info size={14} /> : <Check size={14} />}
        {state.job ? t[JOB_TEXT[state.job.status]] : t.stateIdle}</span>
        {running ? <><span className="job-status-hint">{differentVersion ? t.pendingOlder : t.editingNext}</span><button type="button" onClick={() => dispatch({ type: "cancel" })}>{t.cancel}</button></> : <span className="job-status-hint">{changed ? t.dirty : t.noCredits}</span>}
      </div>
      <ResultGallery results={state.results} selected={state.view} locale={app.locale} onSelect={id => dispatch({ type: "view", id })} t={t} />
      <footer className="workspace-footer"><span>MiaoCut <span aria-hidden="true">/</span> {t.workspace}</span><button type="button" onClick={() => clearDialog.current?.showModal()}><Trash2 size={13} />{t.clear}</button></footer>
    </main>

    <dialog ref={about} className="workspace-dialog" aria-labelledby="about-title"><button type="button" className="icon-button dialog-close" aria-label={t.close} onClick={() => about.current?.close()}><X size={18} /></button>
      <span className="dialog-icon"><Scissors size={22} /></span><h2 id="about-title">{t.demoDetails}</h2><p>{t.demoBody}</p><p>{t.demoPhoto}</p>
      <button type="button" className="primary-button" onClick={() => about.current?.close()}>{t.gotIt}</button></dialog>
    <dialog ref={clearDialog} className="workspace-dialog" aria-labelledby="clear-title"><h2 id="clear-title">{t.clearTitle}</h2><p>{t.clearBody}</p><div className="dialog-actions">
      <button type="button" className="secondary-button" onClick={() => clearDialog.current?.close()}>{t.keep}</button>
      <button type="button" className="primary-button" onClick={() => { clearDialog.current?.close(); void app.clear(); }}>{t.clearConfirm}</button></div></dialog>
  </div>;
}
