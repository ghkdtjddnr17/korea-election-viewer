import { ELECTION } from "@/lib/election-data";
import { localityIndex } from "@/lib/locality-index";
import LocalitySelector from "@/components/LocalitySelector";

const ELECTION_DATE = new Date(ELECTION.meta.electionDate);
function daysUntil(target: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86_400_000));
}

export default function Home() {
  const daysLeft = daysUntil(ELECTION_DATE);
  const regions = localityIndex();

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-6 py-6 lg:py-8">
      <div className="flex items-center gap-3 lg:gap-4 mb-10 lg:mb-12 text-sm flex-wrap">
        <span className="num bg-foreground text-paper px-2.5 py-1 rounded font-black text-base">D-{daysLeft}</span>
        <span className="text-muted">투표 <strong className="num text-foreground">{ELECTION.meta.electionDate}</strong></span>
        <span className="num text-muted">06:00–18:00</span>
        <span className="text-muted hidden sm:inline">·</span>
        <span className="text-muted">여론조사 블랙아웃 2026-05-28 이후</span>
      </div>

      <LocalitySelector regions={regions} />
    </div>
  );
}
