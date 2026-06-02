import CandidateCard from "./CandidateCard";
import Markdown from "./Markdown";
import OfficeTabs from "./OfficeTabs";
import type { District } from "@/lib/types";

export default function DistrictView({
  district,
  breadcrumbs,
}: {
  district: District;
  breadcrumbs: Array<{ label: string; href?: string }>;
}) {
  const tabs = [];
  tabs.push({
    id: "cards",
    label: `후보 ${district.candidates.length}명`,
    content: (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {district.candidates.map((c) => (
          <CandidateCard key={c.slug} candidate={c} />
        ))}
      </div>
    ),
  });
  if (district.matrix) {
    tabs.push({
      id: "matrix",
      label: "비교 매트릭스",
      content: (
        <div className="bg-paper border border-[color:var(--border)] p-6 rounded-sm">
          <Markdown source={district.matrix.raw} />
        </div>
      ),
    });
  }
  if (district.index) {
    tabs.push({
      id: "index",
      label: "원본 인덱스",
      content: (
        <div className="bg-paper border border-[color:var(--border)] p-6 rounded-sm">
          <Markdown source={district.index.raw} />
        </div>
      ),
    });
  }
  for (const ex of district.extras) {
    tabs.push({
      id: `extra-${ex.filename}`,
      label: ex.filename.replace(/\.md$/, ""),
      content: (
        <div className="bg-paper border border-[color:var(--border)] p-6 rounded-sm">
          <Markdown source={ex.raw} />
        </div>
      ),
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <nav className="text-xs text-[color:var(--muted)] mb-4 flex flex-wrap items-center gap-1.5">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {b.href ? (
              <a href={b.href} className="hover:text-foreground">{b.label}</a>
            ) : (
              <span>{b.label}</span>
            )}
            {i < breadcrumbs.length - 1 && <span aria-hidden>›</span>}
          </span>
        ))}
      </nav>
      <header className="mb-8 pb-6 border-b border-[color:var(--border)]">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)] font-semibold mb-1">
          선거구
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {district.name}
        </h1>
        <div className="mt-2 text-sm text-[color:var(--muted)]">
          후보 {district.candidates.length}명
        </div>
      </header>
      <OfficeTabs tabs={tabs} />
    </div>
  );
}
