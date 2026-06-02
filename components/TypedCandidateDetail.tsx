import Markdown from "./Markdown";
import SectionNav from "./SectionNav";
import CandidateMark from "./CandidateMark";
import TruthBadgeSummary from "./TruthBadge";
import { sectionId } from "@/lib/section-id";
import { MILITARY_LABELS } from "@/lib/mayor-types";
import { TRUTH_LABELS, type Section } from "@/lib/types";
import { toTruthSummary, type TypedCandidate } from "@/lib/typed-data";

type Crumb = { label: string; href?: string };

function wealthShort(w?: string): string {
  if (!w) return "—";
  const m = w.match(/([\d.]+\s*억)/);
  return m ? m[1].replace(/\s+/g, "") : w.split("(")[0].trim().slice(0, 12);
}

/** "재산 — 후보 중 위치" comparison bars (Compare × Mark). Highlights this candidate. */
function WealthRank({ me, siblings }: { me: TypedCandidate; siblings: TypedCandidate[] }) {
  const ranked = siblings
    .filter((s) => (s.declaration.wealthKrw ?? 0) > 0)
    .sort((a, b) => (b.declaration.wealthKrw ?? 0) - (a.declaration.wealthKrw ?? 0));
  if (ranked.length < 2 || !(me.declaration.wealthKrw ?? 0)) return null;
  const max = ranked[0].declaration.wealthKrw ?? 1;
  const rank = ranked.findIndex((s) => s.number === me.number && s.name === me.name) + 1;

  return (
    <div className="mt-6 surface-card p-5">
      <div className="flex justify-between items-baseline num text-[11px] uppercase tracking-wide text-muted">
        <span>재산 — 후보 중 위치</span>
        <span>{rank}위 / {ranked.length}명</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {ranked.map((s) => {
          const isMe = s.number === me.number && s.name === me.name;
          return (
            <div key={`${s.number}-${s.name}`} className="grid grid-cols-[84px_1fr_auto] gap-3 items-center text-[13px]">
              <span className={isMe ? "font-bold" : "text-muted"}>{s.number} {s.name}</span>
              <span className="cmp-bar">
                <span style={{ width: `${((s.declaration.wealthKrw ?? 0) / max) * 100}%`, background: isMe ? s.partyColor : undefined }} />
              </span>
              <span className="num">{wealthShort(s.declaration.wealth)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TypedCandidateDetail({
  candidate: c,
  siblings = [],
  breadcrumbs,
}: {
  candidate: TypedCandidate;
  siblings?: TypedCandidate[];
  breadcrumbs: Crumb[];
}) {
  const ordered = Object.values(c.rawSections).sort((a, b) => (a.no ?? 999) - (b.no ?? 999));
  const navSections: Section[] = ordered.map((s) => ({ no: s.no, marker: "", heading: s.title, title: s.title, body: "" }));

  const d = c.declaration;
  const pi = c.personalInfo;
  const stats: { label: string; value: string }[] = [];
  if (pi.birthDate) stats.push({ label: "생년월일", value: pi.age ? `${pi.birthDate} (${pi.age}세)` : pi.birthDate });
  if (pi.occupation) stats.push({ label: "직업", value: pi.occupation });
  if (d.wealth) stats.push({ label: "재산", value: d.wealth });
  stats.push({ label: "전과", value: `${d.criminalRecord.count}건${d.criminalRecord.detail ? ` · ${d.criminalRecord.detail}` : ""}` });
  stats.push({ label: "병역", value: MILITARY_LABELS[d.military.status] });
  if (d.candidacyCount != null) stats.push({ label: "입후보", value: `${d.candidacyCount}회` });

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

      <header className="flex flex-col sm:flex-row gap-6 sm:items-center">
        <CandidateMark number={c.number} name={c.name} partyColor={c.partyColor} photo={c.photo} size={132} radius={28} />
        <div className="min-w-0">
          <div className="num text-[12px]" style={{ color: c.partyColor }}>기호 {c.ballotMark || c.number}</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mt-1">{c.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            {c.hanja && <span className="text-muted">{c.hanja}</span>}
            <span className="font-semibold pl-2.5" style={{ color: c.partyColor, borderLeft: `3px solid ${c.partyColor}` }}>{c.party}</span>
            {c.district && <span className="text-muted">{c.district}</span>}
          </div>
          {c.truthSummary.total > 0 && (
            <div className="mt-3"><TruthBadgeSummary summary={toTruthSummary(c.truthSummary)} /></div>
          )}
        </div>
      </header>

      {/* stat dashboard */}
      <dl className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-border rounded-xl overflow-hidden">
        {stats.map((s, i) => (
          <div key={i} className="p-4 border-r border-b border-border last:border-r-0">
            <dt className="num text-[10px] uppercase tracking-wide text-muted">{s.label}</dt>
            <dd className="text-[17px] font-bold tracking-tight mt-1 leading-snug">{s.value}</dd>
          </div>
        ))}
      </dl>

      <WealthRank me={c} siblings={siblings} />

      <div className="mt-9 flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 lg:shrink-0">
          <SectionNav sections={navSections} />
        </aside>
        <article className="flex-1 min-w-0 max-w-3xl">
          {ordered.map((s, i) => {
            const id = sectionId(navSections[i], i);
            const isPledges = s.no === 5 && c.pledges.length > 0;
            return (
              <section key={i} id={id} className="mb-12">
                <div className="flex items-baseline gap-3 mb-4 border-b-2 border-foreground pb-2">
                  {s.no != null && <span className="num text-[11px] uppercase tracking-wider font-bold text-muted">{s.no}</span>}
                  <h2 className="text-2xl font-black tracking-tight leading-tight">{s.title}</h2>
                </div>
                {isPledges ? (
                  <ol className="space-y-3">
                    {c.pledges.map((p) => (
                      <li key={p.number} className="surface-card p-4 flex gap-4">
                        <span className="num text-xl font-black shrink-0" style={{ color: c.partyColor }}>{p.number}</span>
                        <div>
                          <h3 className="font-bold text-base leading-snug">{p.title}</h3>
                          {p.description && <p className="text-sm text-muted mt-1.5 leading-relaxed">{p.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Markdown source={s.body} />
                )}
              </section>
            );
          })}

          {c.sourcesRaw && (
            <section className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl font-black tracking-tight mb-4">출처</h2>
              <Markdown source={c.sourcesRaw} />
            </section>
          )}

          <footer className="mt-12 pt-6 border-t border-border text-xs text-muted">
            <div className="num">원본 — {c.filename}</div>
            <div className="num">최종 갱신 — {new Date(c.lastModified).toLocaleString("ko-KR")}</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(TRUTH_LABELS).map(([k, v]) => (
                <span key={k} className="whitespace-nowrap">{v.emoji} {v.label}</span>
              ))}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
