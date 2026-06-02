import Link from "next/link";
import Markdown from "./Markdown";
import CompareMatrix, { entriesFor } from "./CompareMatrix";
import type { TypedOfficeBundle } from "@/lib/typed-data";
import type { Office } from "@/lib/types";

type Crumb = { label: string; href?: string };

/**
 * Office page = comparison matrix (Compare × Mark). Flat offices render one matrix;
 * district offices render one matrix per 선거구. Original index/matrix markdown stays
 * available under a collapsible for completeness.
 */
export default function TypedOfficeView({
  office,
  typed,
  breadcrumbs,
}: {
  office: Office;
  typed: TypedOfficeBundle;
  breadcrumbs: Crumb[];
}) {
  const flat = entriesFor(office.candidates, typed);
  const districts = office.districts.map((d) => ({ d, entries: entriesFor(d.candidates, typed, d) }));
  const indexRaw = office.index?.raw;
  const matrixRaw = typed.matrix ?? office.matrix?.raw ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <nav className="text-xs text-muted mb-4 flex flex-wrap items-center gap-1.5">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {b.href ? <a href={b.href} className="hover:text-foreground">{b.label}</a> : <span>{b.label}</span>}
            {i < breadcrumbs.length - 1 && <span aria-hidden>›</span>}
          </span>
        ))}
      </nav>

      <header className="mb-7 pb-5 border-b border-border">
        <div className="num text-[11px] uppercase tracking-[0.18em] text-muted mb-1">{office.kind}</div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {office.name} <span className="text-muted font-bold">— 비교</span>
        </h1>
        <div className="mt-2 text-sm text-muted">
          후보 {office.candidates.length}명{office.districts.length > 0 && ` · ${office.districts.length}개 선거구`}
        </div>
      </header>

      {flat.length > 0 && <CompareMatrix entries={flat} />}

      {districts.length > 0 && (
        <div className="space-y-10">
          {districts.map(({ d, entries }) => (
            <section key={d.slug}>
              <h2 className="text-xl font-black tracking-tight mb-3">
                <Link href={d.href} className="hover:underline">{d.name}</Link>
                <span className="ml-2 num text-xs font-normal text-muted">후보 {d.candidates.length}</span>
              </h2>
              <CompareMatrix entries={entries} />
            </section>
          ))}
        </div>
      )}

      {(indexRaw || matrixRaw) && (
        <details className="mt-10 surface-card p-5">
          <summary className="cursor-pointer font-bold text-sm">원본 자료 — 인덱스 · 비교표</summary>
          <div className="article-prose mt-4 text-[15px]">
            {matrixRaw && <Markdown source={matrixRaw} />}
            {indexRaw && <Markdown source={indexRaw} />}
          </div>
        </details>
      )}
    </div>
  );
}
