"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { Maximize2, Move } from "lucide-react";
import type { LocalAsset, ProductDocument, Rect } from "@/domain/contracts";
import type { Messages } from "@/client/i18n";
import { imageFromUrl } from "@/client/assets";
import { drawComposition, loadBackdrop } from "@/client/demo-renderer";
import { movePlacement, resizePlacement } from "@/domain/model";

export function EditorCanvas({ document: draft, asset, guides, onPlacement, t }: {
  document: ProductDocument; asset: LocalAsset | undefined; guides: boolean;
  onPlacement: (rect: Rect) => void; t: Messages;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; rect: Rect; resizing: boolean } | null>(null);
  const [loaded, setLoaded] = useState<{ blob: Blob; image: HTMLImageElement; marble: HTMLImageElement }>();
  const [failedBlob, setFailedBlob] = useState<Blob>();
  const [attempt, retry] = useReducer(n => n + 1, 0);
  useEffect(() => {
    if (!asset) return;
    let active = true;
    const blob = asset.blob, url = URL.createObjectURL(blob);
    // Keep the URL alive through decoding, including Strict Mode's immediately disposed effect.
    void Promise.all([imageFromUrl(url).finally(() => URL.revokeObjectURL(url)), loadBackdrop()]).then(([image, marble]) => {
      if (active) { setLoaded({ blob, image, marble }); setFailedBlob(undefined); }
    }).catch(() => { if (active) setFailedBlob(blob); });
    return () => { active = false; };
  }, [asset, attempt]);
  const drawable = loaded?.blob === asset?.blob && !!asset;
  useEffect(() => {
    const target = canvas.current, context = target?.getContext("2d");
    if (!target || !context) return;
    if (!drawable || !loaded || !asset) {
      // Clearing the asset must also clear pixels retained by the Canvas backing store.
      context.clearRect(0, 0, target.width, target.height);
      return;
    }
    const frame = requestAnimationFrame(() => {
      drawComposition(context, draft, asset, loaded.image, loaded.marble);
    });
    return () => cancelAnimationFrame(frame);
  }, [draft, asset, loaded, drawable]);

  const start = (event: React.PointerEvent<HTMLElement>, resizing = false) => {
    if (!asset || event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rect: { ...draft.placement }, resizing };
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current, bounds = stage.current?.getBoundingClientRect();
    if (!current || current.id !== event.pointerId || !bounds || !asset) return;
    const dx = (event.clientX - current.x) / bounds.width, dy = (event.clientY - current.y) / bounds.height;
    onPlacement(current.resizing ? resizePlacement(current.rect, current.rect.width + dx * 2, asset) :
      movePlacement(current.rect, current.rect.x + dx, current.rect.y + dy));
  };
  const finish = () => { drag.current = null; };
  const keys = (event: React.KeyboardEvent<HTMLElement>, resize = false) => {
    if (!asset || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const amount = event.shiftKey ? .04 : .01;
    if (resize) {
      onPlacement(resizePlacement(draft.placement, draft.placement.width +
        (event.key === "ArrowLeft" || event.key === "ArrowDown" ? -amount : amount), asset));
    } else onPlacement(movePlacement(draft.placement,
      draft.placement.x + (event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0),
      draft.placement.y + (event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0)));
  };
  const rect = draft.placement;
  return (
    <div ref={stage} className="editor-stage" data-testid="editor-stage">
      <canvas ref={canvas} width={1024} height={1024} aria-label={t.canvasLabel} role="img" />
      {!drawable ? <div className="stage-loading"><Move size={22} /><span>{failedBlob === asset?.blob && asset ? t.image_decode : t.loadingCanvas}</span>
        {failedBlob === asset?.blob && asset ? <button type="button" className="subtle-button" onClick={retry}>{t.retryCanvas}</button> : null}</div> : null}
      {guides ? <div className="composition-guides" aria-hidden="true"><i /><i /><i /><i /></div> : null}
      {drawable ? <div className="subject-controls" tabIndex={0} role="group" aria-label={t.moveLabel}
        style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}
        onPointerDown={e => start(e)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
        onLostPointerCapture={finish} onKeyDown={e => keys(e)}>
        <span className="subject-drag-label" aria-hidden="true"><Move size={12} /></span>
        <i className="corner corner-tl" /><i className="corner corner-tr" /><i className="corner corner-bl" />
        <button type="button" className="resize-handle" aria-label={t.resizeLabel} title={t.resizeLabel}
          onPointerDown={e => start(e, true)} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
          onLostPointerCapture={finish} onKeyDown={e => keys(e, true)}><Maximize2 size={12} /></button>
      </div> : null}
      <span className="stage-mode"><Move size={12} />{t.draft}</span>
    </div>
  );
}
