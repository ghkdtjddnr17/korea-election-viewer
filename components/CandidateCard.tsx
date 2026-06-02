import Link from "next/link";
import { getPartyColor } from "@/lib/party-colors";
import { PartyChip } from "./PartyBar";
import TruthBadgeSummary from "./TruthBadge";
import CandidateMark from "./CandidateMark";
import type { Candidate } from "@/lib/types";

/**
 * System A card (markdown-backed offices — e.g. 서울시의원비례). Same Compare × Mark
 * language as TypedCandidateCard, driven by the parsed header instead of typed fields.
 */
export default function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { header } = candidate;
  const partyColor = getPartyColor(header.정당);
  const num = header.기호 ? parseInt(header.기호, 10) : 0;
  const showChip = header.정당 && header.정당 !== header.이름;

  return (
    <Link
      href={candidate.href}
      className="block surface-card p-4 hover:border-foreground hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center gap-3">
        {num > 0 && (
          <CandidateMark number={num} name={header.이름} partyColor={partyColor.bg} photo={candidate.photo} size={52} />
        )}
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            {header.기호 && <span className="num text-xs text-muted">{header.기호}</span>}
            <span className="font-extrabold text-lg tracking-tight truncate">{header.이름}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[13px] text-muted">
            {header.한자 && <span>{header.한자}</span>}
            {showChip && <PartyChip party={header.정당} />}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
        <TruthBadgeSummary summary={candidate.truthSummary} compact />
        <span className="text-[11px] text-muted">상세 →</span>
      </div>
    </Link>
  );
}
