import { TRUTH_LABELS } from "@/lib/types";
import type { TruthSummary } from "@/lib/types";

export default function TruthBadgeSummary({
  summary,
  compact = false,
}: {
  summary: TruthSummary;
  compact?: boolean;
}) {
  if (summary.total === 0) return null;
  const order: Array<keyof typeof TRUTH_LABELS> = [
    "red",
    "yellow",
    "orange",
    "black",
    "white",
    "blue",
  ];
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {order.map((key) => {
        const count = summary.counts[key] ?? 0;
        if (count === 0) return null;
        const meta = TRUTH_LABELS[key];
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
            style={{
              background: `${meta.color}10`,
              color: meta.color,
              border: `1px solid ${meta.color}30`,
            }}
            title={meta.label}
          >
            <span>{meta.emoji}</span>
            {!compact && <span>{meta.label}</span>}
            <span className="tabular-nums font-semibold">{count}</span>
          </span>
        );
      })}
    </div>
  );
}
