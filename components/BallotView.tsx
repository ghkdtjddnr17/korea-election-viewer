import Link from "next/link";
import CandidateMark from "./CandidateMark";
import type { OfficeLite } from "@/lib/locality-index";

/**
 * "투표용지" — the races a voter at this locality actually receives, in NEC ballot
 * order (시장 first). Each office is one ballot paper: an ordinal numeral, its kind,
 * the office name, and either a candidate preview (flat races) or a "내 선거구"
 * hand-off (district races). Empty offices show dimmed as 자료 준비 중.
 *
 * Pure server component — the OfficeLite list is precomputed by lib/locality-index.
 */
export default function BallotView({ offices }: { offices: OfficeLite[] }) {
  // Ordinals only count the races that actually have data — the "N장" the voter gets.
  let ordinal = 0;
  return (
    <ol className="space-y-2.5">
      {offices.map((o) => {
        if (!o.empty) ordinal += 1;
        return <BallotRow key={o.href} office={o} ordinal={o.empty ? null : ordinal} />;
      })}
    </ol>
  );
}

function BallotRow({ office, ordinal }: { office: OfficeLite; ordinal: number | null }) {
  const meta = office.districts > 0 ? `${office.districts}개 선거구` : `후보 ${office.candidates}명`;

  const Numeral = (
    <span
      className={`num shrink-0 grid place-items-center w-11 h-11 rounded-sm border text-lg font-black tabular-nums ${
        ordinal === null ? "border-border text-muted" : "border-foreground text-foreground"
      }`}
      aria-hidden
    >
      {ordinal ?? "—"}
    </span>
  );

  if (office.empty) {
    return (
      <li className="surface-card flex items-center gap-4 p-4 opacity-40">
        {Numeral}
        <div className="min-w-0">
          <div className="num text-[10px] uppercase tracking-widest text-muted font-bold">{office.kind}</div>
          <div className="font-black text-lg tracking-tight truncate">{office.name}</div>
        </div>
        <span className="ml-auto num text-xs text-muted">자료 준비 중</span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={office.href}
        className="surface-card flex items-center gap-4 p-4 hover:border-foreground hover:-translate-y-0.5 transition-all"
      >
        {Numeral}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="num text-[10px] uppercase tracking-widest text-muted font-bold">{office.kind}</span>
            <span className="num text-[10px] text-muted">· {meta}</span>
          </div>
          <div className="font-black text-lg lg:text-xl tracking-tight truncate">{office.name}</div>
        </div>

        {office.marks.length > 0 ? (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {office.marks.slice(0, 5).map((m, i) => (
              <CandidateMark
                key={i}
                number={m.number}
                name={m.name}
                partyColor={m.partyColor}
                photo={m.photo}
                size={32}
              />
            ))}
            {office.candidates > 5 && <span className="num text-xs text-muted ml-0.5">+{office.candidates - 5}</span>}
          </div>
        ) : (
          <span className="shrink-0 num text-xs text-muted">내 선거구 →</span>
        )}
        <span className="shrink-0 num text-sm text-muted" aria-hidden>비교 →</span>
      </Link>
    </li>
  );
}
