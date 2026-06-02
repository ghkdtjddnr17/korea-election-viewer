import type { Section } from "./types";

export function sectionId(s: Section, idx: number): string {
  return `sec-${s.no ?? `x${idx}`}`;
}
