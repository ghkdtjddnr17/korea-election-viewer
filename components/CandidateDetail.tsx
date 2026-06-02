import Markdown from "./Markdown";
import { getPartyColor } from "@/lib/party-colors";
import { PartyChip } from "./PartyBar";
import QuickStats from "./QuickStats";
import CandidateMark from "./CandidateMark";
import SectionNav from "./SectionNav";
import { sectionId } from "@/lib/section-id";
import TruthBadgeSummary from "./TruthBadge";
import type { Candidate } from "@/lib/types";
import { TRUTH_LABELS } from "@/lib/types";

export default function CandidateDetail({
  candidate,
  breadcrumbs,
}: {
  candidate: Candidate;
  breadcrumbs: Array<{ label: string; href?: string }>;
}) {
  const partyColor = getPartyColor(candidate.header.정당);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <nav className="text-xs text-muted mb-4 flex flex-wrap items-center gap-1.5">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {b.href ? (
              <a href={b.href} className="hover:text-foreground">
                {b.label}
              </a>
            ) : (
              <span>{b.label}</span>
            )}
            {i < breadcrumbs.length - 1 && <span aria-hidden>›</span>}
          </span>
        ))}
      </nav>

      <header className="bg-paper border-l-8 border border-border p-6 md:p-8 rounded-sm" style={{ borderLeftColor: partyColor.bg }}>
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {candidate.header.기호 && (
            <div className="shrink-0">
              <CandidateMark
                number={parseInt(candidate.header.기호, 10) || 0}
                name={candidate.header.이름}
                partyColor={partyColor.bg}
                photo={candidate.photo}
                size={112}
                radius={24}
              />
              <div className="num text-[10px] uppercase tracking-wider text-muted mt-1.5 text-center font-semibold">
                기호 {candidate.header.기호}
              </div>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              {candidate.header.이름}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
              {candidate.header.한자 && (
                <span className="font-mono text-muted">
                  {candidate.header.한자}
                </span>
              )}
              <PartyChip party={candidate.header.정당} />
            </div>
            <div className="mt-4">
              <TruthBadgeSummary summary={candidate.truthSummary} />
            </div>
          </div>
        </div>

        <QuickStats candidate={candidate} />
      </header>

      <div className="mt-8 flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 lg:shrink-0">
          <SectionNav sections={candidate.sections} />
        </aside>
        <article className="flex-1 min-w-0 max-w-3xl">
          {candidate.sections.map((s, i) => (
            <section key={i} id={sectionId(s, i)} className="mb-12">
              <div className="flex items-baseline gap-3 mb-4 border-b-2 border-foreground pb-2">
                {(s.marker || s.no) && (
                  <span className="text-[11px] uppercase tracking-wider font-bold text-muted tabular-nums">
                    {s.marker || s.no}
                  </span>
                )}
                <h2 className="text-2xl font-black tracking-tight leading-tight">
                  {s.title}
                </h2>
              </div>
              <Markdown source={s.body} />
            </section>
          ))}

          {candidate.sourcesRaw && (
            <section id="sec-sources" className="mt-16 pt-8 border-t border-border">
              <h2 className="text-xl font-black tracking-tight mb-4">출처</h2>
              <Markdown source={candidate.sourcesRaw} />
            </section>
          )}

          <footer className="mt-12 pt-6 border-t border-border text-xs text-muted">
            <div>원본 파일: <code className="font-mono">{candidate.hierarchy.join("/")}/{candidate.filename}</code></div>
            <div>최종 갱신: {new Date(candidate.lastModified).toLocaleString("ko-KR")}</div>
            <div className="mt-2">
              {Object.entries(TRUTH_LABELS).map(([k, v]) => (
                <span key={k} className="mr-3 whitespace-nowrap">
                  {v.emoji} {v.label}
                </span>
              ))}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
