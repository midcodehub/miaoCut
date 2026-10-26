"use client";

import { Images, ArrowUpRight, Check } from "lucide-react";
import type { LocalResult, Locale } from "@/domain/contracts";
import type { Messages } from "@/client/i18n";
import { BlobImage } from "./blob-image";

export function ResultGallery({ results, selected, locale, onSelect, t }: {
  results: LocalResult[]; selected: string; locale: Locale; onSelect: (id: string) => void; t: Messages;
}) {
  return <section className="results-panel" aria-labelledby="results-title">
    <div className="results-heading"><div><h2 id="results-title">{t.recentResults}</h2><p>{t.resultsHint}</p></div><span>{t.limitResults}</span></div>
    {results.length === 0 ? <div className="empty-results"><span className="empty-result-icon"><Images size={23} strokeWidth={1.4} /></span>
      <div><strong>{t.noResults}</strong><p>{t.noResultsHint}</p></div><ArrowUpRight size={19} /></div> :
      <div className="results-list">{results.map(result => <button type="button" key={result.id} className={`result-tile ${selected === result.id ? "is-selected" : ""}`}
        onClick={() => onSelect(result.id)} aria-pressed={selected === result.id} aria-label={`${t.version} ${result.sequence} — ${t[result.snapshot.scene]}`}>
        <span className="result-thumbnail"><BlobImage blob={result.png} alt="" width={90} height={90} />
          {selected === result.id ? <i className="result-selected"><Check size={11} /></i> : null}</span>
        <span className="result-info"><strong>{t.version} {result.sequence}</strong><small>{t[result.snapshot.scene]}</small>
          <time dateTime={new Date(result.createdAt).toISOString()}>{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", { hour: "2-digit", minute: "2-digit" }).format(result.createdAt)}</time></span>
      </button>)}</div>}
  </section>;
}
