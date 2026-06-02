import CandidateCard from "./CandidateCard";
import Markdown from "./Markdown";
import OfficeTabs from "./OfficeTabs";
import type { Office, District } from "@/lib/types";

export default function OfficeView({
  office,
  breadcrumbs,
}: {
  office: Office;
  breadcrumbs: Array<{ label: string; href?: string }>;
}) {
  const hasCandidates = office.candidates.length > 0;
  const hasDistricts = office.districts.length > 0;
  const hasMatrix = !!office.matrix;
  const hasIndex = !!office.index;

  const tabs = [];
  if (hasCandidates) {
    tabs.push({
      id: "cards",
      label: `후보 ${office.candidates.length}명`,
      content: <CandidateGrid candidates={office.candidates} />,
    });
  }
  if (hasDistricts) {
    tabs.push({
      id: "districts",
      label: `선거구 ${office.districts.length}`,
      content: <DistrictsView districts={office.districts} />,
    });
  }
  if (hasMatrix) {
    tabs.push({
      id: "matrix",
      label: "비교 매트릭스",
      content: (
        <div className="bg-paper border border-[color:var(--border)] p-6 rounded-sm">
          <Markdown source={office.matrix!.raw} />
        </div>
      ),
    });
  }
  if (hasIndex) {
    tabs.push({
      id: "index",
      label: "원본 인덱스",
      content: (
        <div className="bg-paper border border-[color:var(--border)] p-6 rounded-sm">
          <Markdown source={office.index!.raw} />
        </div>
      ),
    });
  }
  for (const ex of office.extras) {
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
          {office.kind}
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {office.name}
        </h1>
        <div className="mt-2 text-sm text-[color:var(--muted)]">
          후보 {office.candidates.length}명
          {office.districts.length > 0 && ` · ${office.districts.length}개 선거구`}
        </div>
      </header>

      {tabs.length === 0 ? (
        <div className="bg-paper border border-[color:var(--border)] p-12 text-center text-[color:var(--muted)] rounded-sm">
          이 직책의 후보 자료가 아직 등록되지 않았습니다.
        </div>
      ) : (
        <OfficeTabs tabs={tabs} />
      )}
    </div>
  );
}

function CandidateGrid({ candidates }: { candidates: Office["candidates"] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {candidates.map((c) => (
        <CandidateCard key={c.slug} candidate={c} />
      ))}
    </div>
  );
}

function DistrictsView({ districts }: { districts: District[] }) {
  return (
    <div className="space-y-8">
      {districts.map((d) => (
        <section key={d.slug}>
          <h2 className="text-xl font-black tracking-tight mb-4">
            <a href={d.href} className="hover:underline">{d.name}</a>
            <span className="ml-2 text-xs font-normal text-[color:var(--muted)]">
              후보 {d.candidates.length}명
            </span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {d.candidates.map((c) => (
              <CandidateCard key={c.slug} candidate={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
