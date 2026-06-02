import Link from "next/link";
import CandidateMark from "./CandidateMark";
import { MILITARY_LABELS } from "@/lib/mayor-types";
import { typedCandidateKey, type TypedCandidate, type TypedOfficeBundle } from "@/lib/typed-data";
import type { Candidate, District } from "@/lib/types";

export type Entry = { c: Candidate; tc: TypedCandidate };

export function entriesFor(
  cands: Candidate[],
  typed: TypedOfficeBundle,
  district?: District
): Entry[] {
  return cands
    .map((c) => {
      const tc = typed.candidates[typedCandidateKey(Number(c.urlSlug), district?.name)];
      return tc ? { c, tc } : null;
    })
    .filter((e): e is Entry => e !== null);
}

function wealthShort(w?: string): string {
  if (!w) return "—";
  const m = w.match(/([\d.]+\s*억)/);
  return m ? m[1].replace(/\s+/g, "") : w.split("(")[0].trim().slice(0, 10);
}

function TruthDots({ t }: { t: TypedCandidate["truthSummary"] }) {
  const items: [string, number][] = [
    ["#b91c1c", t.red],
    ["#a16207", t.yellow],
    ["#c2410c", t.orange],
    ["#1d4ed8", t.blue],
  ];
  const shown = items.filter(([, n]) => n > 0);
  if (shown.length === 0) return <span className="text-muted text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      {shown.map(([c, n], i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, display: "inline-block" }} />
          <span className="num text-xs">{n}</span>
        </span>
      ))}
    </span>
  );
}

const cellCls = "p-4 border-b border-border border-l border-border align-top text-[15px]";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="text-left align-top p-3 sticky left-0 bg-background num text-[11px] uppercase tracking-wide text-muted font-medium border-b border-border">
        {label}
      </th>
      {children}
    </tr>
  );
}

/** Comparison matrix — identity marks as column headers, attributes as rows, 재산 as bars. */
export default function CompareMatrix({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;
  const maxWealth = Math.max(1, ...entries.map((e) => e.tc.declaration.wealthKrw ?? 0));

  return (
    <>
      {/* Mobile: a vertical card per candidate — no horizontal scrolling. */}
      <div className="md:hidden space-y-3">
        {entries.map(({ c, tc }) => (
          <Link key={c.slug} href={c.href} className="surface-card block p-4">
            <div className="flex items-center gap-3">
              <CandidateMark number={tc.number} name={tc.name} partyColor={tc.partyColor} photo={tc.photo} size={48} />
              <div className="min-w-0">
                <div className="num text-[11px]" style={{ color: tc.partyColor }}>기호 {tc.ballotMark || tc.number}</div>
                <div className="font-extrabold text-lg tracking-tight leading-tight truncate">{tc.name}</div>
                <div className="text-[12.5px] text-muted truncate">{tc.party}</div>
              </div>
              <span className="ml-auto shrink-0 num text-xs text-muted">상세 →</span>
            </div>
            <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              <div className="col-span-2">
                <dt className="num text-[10px] uppercase tracking-wide text-muted">재산</dt>
                <dd className="flex items-center gap-2 mt-0.5">
                  <span className="num font-semibold whitespace-nowrap">{wealthShort(tc.declaration.wealth)}</span>
                  <span className="cmp-bar flex-1">
                    <span style={{ width: `${((tc.declaration.wealthKrw ?? 0) / maxWealth) * 100}%` }} />
                  </span>
                </dd>
              </div>
              <div>
                <dt className="num text-[10px] uppercase tracking-wide text-muted">전과</dt>
                <dd className="mt-0.5"><span className="num font-semibold">{tc.declaration.criminalRecord.count}</span><span className="text-muted">건</span></dd>
              </div>
              <div>
                <dt className="num text-[10px] uppercase tracking-wide text-muted">병역</dt>
                <dd className="mt-0.5">{MILITARY_LABELS[tc.declaration.military.status]}</dd>
              </div>
              <div className="col-span-2">
                <dt className="num text-[10px] uppercase tracking-wide text-muted">검증</dt>
                <dd className="mt-0.5"><TruthDots t={tc.truthSummary} /></dd>
              </div>
              {tc.pledges[0] && (
                <div className="col-span-2">
                  <dt className="num text-[10px] uppercase tracking-wide text-muted">대표공약</dt>
                  <dd className="mt-0.5 font-semibold leading-snug">{tc.pledges[0].title}</dd>
                </div>
              )}
            </dl>
          </Link>
        ))}
      </div>

      {/* Desktop: side-by-side comparison matrix. */}
      <div className="hidden md:block overflow-x-auto border-y-2 border-foreground">
      <table className="w-full border-collapse" style={{ minWidth: 130 + entries.length * 150 }}>
        <thead>
          <tr>
            <th className="w-[92px]" />
            {entries.map(({ c, tc }) => (
              <th key={c.slug} className="align-bottom text-left p-4 border-b border-border">
                <Link href={c.href} className="inline-block group">
                  <CandidateMark number={tc.number} name={tc.name} partyColor={tc.partyColor} photo={tc.photo} size={56} />
                  <div className="num text-[11px] mt-2.5" style={{ color: tc.partyColor }}>기호 {tc.ballotMark || tc.number}</div>
                  <div className="font-extrabold text-lg tracking-tight group-hover:underline">{tc.name}</div>
                  <div className="text-[12.5px] text-muted">{tc.party}</div>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="재산">
            {entries.map(({ c, tc }) => (
              <td key={c.slug} className={cellCls}>
                <span className="num text-lg font-semibold">{wealthShort(tc.declaration.wealth)}</span>
                <div className="cmp-bar mt-2 max-w-[150px]">
                  <span style={{ width: `${((tc.declaration.wealthKrw ?? 0) / maxWealth) * 100}%` }} />
                </div>
              </td>
            ))}
          </Row>
          <Row label="전과">
            {entries.map(({ c, tc }) => (
              <td key={c.slug} className={cellCls}>
                <span className="num text-lg font-semibold">{tc.declaration.criminalRecord.count}</span>
                <span className="text-muted text-[13px]">건</span>
              </td>
            ))}
          </Row>
          <Row label="병역">
            {entries.map(({ c, tc }) => (
              <td key={c.slug} className={cellCls}>{MILITARY_LABELS[tc.declaration.military.status]}</td>
            ))}
          </Row>
          <Row label="대표공약">
            {entries.map(({ c, tc }) => (
              <td key={c.slug} className={cellCls}>
                {tc.pledges[0] ? (
                  <>
                    <div className="font-semibold text-[15px] tracking-tight">{tc.pledges[0].title}</div>
                    {tc.pledges[0].description && (
                      <div className="text-muted text-[12.5px] mt-0.5 line-clamp-2">{tc.pledges[0].description}</div>
                    )}
                  </>
                ) : (
                  <span className="text-muted text-xs">—</span>
                )}
              </td>
            ))}
          </Row>
          <Row label="검증">
            {entries.map(({ c, tc }) => (
              <td key={c.slug} className={cellCls}><TruthDots t={tc.truthSummary} /></td>
            ))}
          </Row>
        </tbody>
      </table>
      </div>
    </>
  );
}
