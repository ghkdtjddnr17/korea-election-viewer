import type { Office, OfficeKind } from "./types";

/**
 * Canonical display order of offices, following the NEC local-election ballot
 * sequence: 광역단체장(시·도지사) → 교육감 → 기초단체장(구청장·시장·군수)
 * → 광역의원(지역구·비례) → 기초의원. The Korean strings here are OfficeKind
 * *values* (matching lib/types.ts), used only as data — not as identifiers/keys.
 */
const KIND_ORDER: OfficeKind[] = [
  "광역단체장",
  "교육감",
  "기초단체장",
  "광역의원지역구",
  "광역의원비례",
  "기초의원지역구",
  "기초의원비례",
];

export function officeKindRank(kind: OfficeKind): number {
  const i = KIND_ORDER.indexOf(kind);
  return i === -1 ? 99 : i;
}

/** Sort offices into ballot order; ties (same kind) fall back to Korean name order. */
export function sortOffices<T extends Pick<Office, "kind" | "name">>(offices: T[]): T[] {
  return [...offices].sort(
    (a, b) =>
      officeKindRank(a.kind) - officeKindRank(b.kind) ||
      a.name.localeCompare(b.name, "ko")
  );
}
