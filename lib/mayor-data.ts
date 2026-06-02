/**
 * Typed loader for 서울특별시장 JSON output produced by scripts/build-mayor.ts.
 * Import the lightweight index for the office page; load individual candidate JSONs
 * lazily in candidate detail pages.
 */
import indexJson from "@/data/seoul/mayor/index.json";
import type { MayorIndex, MayorIndexEntry } from "./mayor-types";

export const MAYOR_INDEX = indexJson as unknown as MayorIndex;

/** A running entry — `number` is guaranteed non-null because 결번 slots have running:false. */
export type RunningMayorCandidate = MayorIndexEntry & { number: number };

/** Candidates that actually filed (excludes 결번 slots). */
export function runningCandidates(): RunningMayorCandidate[] {
  return MAYOR_INDEX.candidates.filter(
    (c): c is RunningMayorCandidate => c.running && c.number != null
  );
}

/**
 * Top-2 candidates by Truth-status `red + yellow + orange + blue` signal.
 * Used to surface 양강 구도 hints on the home page office card without hard-coding names.
 */
export function topByAttention(n = 2): MayorIndexEntry[] {
  const score = (c: MayorIndexEntry) => {
    const t = c.truthSummary;
    if (!t) return 0;
    return t.red + t.yellow + t.orange + t.blue;
  };
  return runningCandidates()
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
}
