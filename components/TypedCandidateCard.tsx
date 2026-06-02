import Link from "next/link";
import CandidateMark from "./CandidateMark";
import { MILITARY_LABELS } from "@/lib/mayor-types";
import type { TypedCandidate } from "@/lib/typed-data";

/** "약 18.6억 원" → "18.6억" */
function wealthShort(w?: string): string {
  if (!w) return "—";
  const m = w.match(/([\d.]+\s*억)/);
  return m ? m[1].replace(/\s+/g, "") : w.split("(")[0].trim().slice(0, 10);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="num text-sm font-semibold mt-0.5">{value}</dd>
    </div>
  );
}

/**
 * Candidate card (home + district grids). Identity mark carries the party color;
 * everything else stays monochrome so the marks read as the accent.
 */
export default function TypedCandidateCard({
  candidate: c,
  href,
}: {
  candidate: TypedCandidate;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block surface-card p-4 hover:border-foreground hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center gap-3">
        <CandidateMark
          number={c.number}
          name={c.name}
          partyColor={c.partyColor}
          photo={c.photo}
          size={52}
        />
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="num text-xs text-muted">{c.ballotMark || c.number}</span>
            <span className="font-extrabold text-lg tracking-tight truncate">{c.name}</span>
          </div>
          <div className="text-[13px] text-muted truncate">{c.party}</div>
        </div>
      </div>
      <dl className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
        <Stat label="재산" value={wealthShort(c.declaration.wealth)} />
        <Stat label="전과" value={`${c.declaration.criminalRecord.count}건`} />
        <Stat label="병역" value={MILITARY_LABELS[c.declaration.military.status]} />
      </dl>
    </Link>
  );
}
