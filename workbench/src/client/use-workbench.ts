"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { LocalAsset, Locale } from "@/domain/contracts";
import { busy, createDemoJob, currentAsset, emptyWorkspace, reducer } from "@/domain/model";
import { AssetError, decodeAsset, exampleAsset } from "./assets";
import { readWorkspace, saveWorkspace } from "./local-store";
import { runDemoJob } from "./demo-renderer";

type Notice = "storage_error" | "file_type" | "file_size" | "image_size" | "image_decode" | "render_failed" | null;

export function useWorkbench() {
  const [state, dispatch] = useReducer(reducer, undefined, () => emptyWorkspace());
  const [ready, setReady] = useState(false);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [locale, setLocaleState] = useState<Locale>("zh");
  const [dark, setDark] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const startGuard = useRef(false);
  const uploadGeneration = useRef(0);

  useEffect(() => {
    let active = true;
    async function restore() {
      let stored;
      try { stored = await readWorkspace(); } catch { if (active) setNotice("storage_error"); }
      if (!stored) {
        stored = emptyWorkspace(crypto.randomUUID());
        try { stored = reducer(stored, { type: "asset", asset: await exampleAsset() }); }
        catch { if (active) setNotice("image_decode"); }
      }
      if (!active) return;
      dispatch({ type: "hydrate", state: stored }); setReady(true);
      setDark(document.documentElement.classList.contains("dark"));
      try {
        const saved = localStorage.getItem("mc.workbench.locale") ?? localStorage.getItem("lang");
        setLocaleState(saved === "en" ? "en" : "zh");
        document.documentElement.lang = saved === "en" ? "en" : "zh-CN";
      } catch { /* Preferences are optional. */ }
    }
    void restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { void saveWorkspace(state).catch(() => setNotice("storage_error")); }, 250);
    return () => clearTimeout(timer);
  }, [state, ready]);

  const job = state.job, jobAsset = state.assets.find(a => a.id === job?.snapshot.sourceAssetId);
  const running = busy(job), jobId = job?.id, snapshot = job?.snapshot, request = job?.request, createdAt = job?.createdAt;
  useEffect(() => {
    if (!running || !jobId || !snapshot || !request || createdAt === undefined || !jobAsset) { startGuard.current = false; return; }
    startGuard.current = true;
    const controller = new AbortController();
    const immutableJob = { id: jobId, snapshot, request, createdAt, mode: "demo" as const, status: "queued" as const };
    void runDemoJob(immutableJob, jobAsset, stage => dispatch({ type: "stage", id: jobId, status: stage }), controller.signal)
      .then(png => {
        if (!controller.signal.aborted) dispatch({ type: "complete", id: jobId, result: {
          id: crypto.randomUUID(), jobId, mode: "demo", createdAt: Date.now(), snapshot: structuredClone(snapshot), png } });
      }).catch(() => {
        if (!controller.signal.aborted) { dispatch({ type: "fail", id: jobId }); setNotice("render_failed"); }
      });
    return () => controller.abort();
  }, [running, jobId, snapshot, request, createdAt, jobAsset]);

  const setLocale = (value: Locale) => {
    setLocaleState(value); document.documentElement.lang = value === "zh" ? "zh-CN" : "en";
    try { localStorage.setItem("mc.workbench.locale", value); } catch { /* Optional preference. */ }
  };
  const toggleTheme = () => {
    const next = !dark;
    setDark(next); document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* Optional preference. */ }
  };
  const load = useCallback(async (source: File | "example") => {
    const token = ++uploadGeneration.current;
    setLoadingAsset(true); setNotice(null);
    try {
      const asset: LocalAsset = source === "example" ? await exampleAsset() : await decodeAsset(source, source.name, "upload");
      if (token === uploadGeneration.current) dispatch({ type: "asset", asset });
    } catch (error) {
      if (token === uploadGeneration.current) setNotice(error instanceof AssetError ? error.code : "image_decode");
    } finally { if (token === uploadGeneration.current) setLoadingAsset(false); }
  }, []);
  const generate = () => {
    if (startGuard.current) return;
    const newJob = createDemoJob(state, crypto.randomUUID(), Date.now());
    if (!newJob) return;
    startGuard.current = true; setNotice(null); dispatch({ type: "start", job: newJob });
  };
  const clear = async () => {
    const token = ++uploadGeneration.current; setLoadingAsset(true);
    const next = emptyWorkspace(crypto.randomUUID());
    dispatch({ type: "hydrate", state: next }); startGuard.current = false;
    try {
      await saveWorkspace(next);
      const asset = await exampleAsset();
      if (token === uploadGeneration.current) { dispatch({ type: "asset", asset }); setNotice(null); }
    } catch { setNotice("storage_error"); }
    finally { if (token === uploadGeneration.current) setLoadingAsset(false); }
  };

  return { state, dispatch, ready, loadingAsset, locale, setLocale, dark, toggleTheme,
    notice, dismissNotice: () => setNotice(null), load, generate, clear, asset: currentAsset(state) };
}
