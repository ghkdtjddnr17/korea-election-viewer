/**
 * Slim, serializable navigation index derived from the full ELECTION tree.
 * Server-only at the source (it imports the 14MB bundle), but the returned shape
 * is small enough to hand to client components (the home selector, the header
 * switcher) as props — names, slugs, counts, and a capped candidate preview.
 *
 * Offices come back in NEC ballot order (광역단체장 → 교육감 → …) via sortOffices,
 * so "시장 맨 위" holds everywhere the index is consumed.
 */

import { ELECTION, isOfficeEmpty } from "./election-data";
import { sortOffices } from "./office-order";
import { getPartyColor } from "./party-colors";
import { getTypedOffice, typedOfficeKey, typedCandidateKey } from "./typed-data";
import type { Office, Region, SubRegion, OfficeKind } from "./types";

export type MarkLite = {
  number: number;
  name: string;
  party: string;
  partyColor: string;
  photo?: string;
  href: string;
};

export type OfficeLite = {
  name: string;
  kind: OfficeKind;
  href: string;
  candidates: number;
  districts: number;
  empty: boolean;
  /** Candidate preview for flat offices (capped); [] for district-based or empty offices. */
  marks: MarkLite[];
};

export type LocalityLite = {
  name: string;
  slug: string;
  href: string;
  offices: OfficeLite[];
  empty: boolean;
};

export type RegionLite = {
  name: string;
  slug: string;
  href: string;
  offices: OfficeLite[];
  localities: LocalityLite[];
  candidateTotal: number;
};

const PREVIEW_CAP = 8;

function markPreview(office: Office, typedKeyParts: (string | undefined)[]): MarkLite[] {
  if (office.districts.length > 0 || office.candidates.length === 0) return [];
  const typed = getTypedOffice(typedOfficeKey(typedKeyParts));
  return office.candidates.slice(0, PREVIEW_CAP).map((c) => {
    const number = c.header.기호 ? parseInt(c.header.기호, 10) || 0 : 0;
    const party = c.header.정당 ?? "";
    const tc = typed?.candidates[typedCandidateKey(number)];
    return {
      number,
      name: c.header.이름,
      party,
      partyColor: getPartyColor(party).bg,
      photo: c.photo ?? tc?.photo,
      href: c.href,
    };
  });
}

export function liteOffice(office: Office, typedKeyParts: (string | undefined)[]): OfficeLite {
  return {
    name: office.name,
    kind: office.kind,
    href: office.href,
    candidates: office.candidates.length,
    districts: office.districts.length,
    empty: isOfficeEmpty(office),
    marks: markPreview(office, typedKeyParts),
  };
}

function countCandidates(region: Region): number {
  const inOffices = (offices: Office[]) =>
    offices.reduce(
      (n, o) => n + o.candidates.length + o.districts.reduce((m, d) => m + d.candidates.length, 0),
      0
    );
  return (
    inOffices(region.offices) +
    region.subregions.reduce((n, sr) => n + inOffices(sr.offices), 0)
  );
}

function liteLocality(region: Region, sr: SubRegion): LocalityLite {
  return {
    name: sr.name,
    slug: sr.urlSlug,
    href: sr.href,
    offices: sortOffices(sr.offices).map((o) =>
      liteOffice(o, [region.urlSlug, sr.urlSlug, o.urlSlug])
    ),
    empty: sr.offices.every(isOfficeEmpty),
  };
}

/**
 * The full ballot a locality voter faces: region-level races (시·도지사·교육감·광역비례)
 * merged with that locality's races (구청장·기초의원 …), in NEC ballot order.
 * Pass no subregion to get just the region-level slate (used by the region page).
 */
export function ballotFor(region: Region, subregion?: SubRegion): OfficeLite[] {
  const lites: OfficeLite[] = [
    ...region.offices.map((o) => liteOffice(o, [region.urlSlug, o.urlSlug])),
    ...(subregion?.offices ?? []).map((o) =>
      liteOffice(o, [region.urlSlug, subregion!.urlSlug, o.urlSlug])
    ),
  ];
  return sortOffices(lites);
}

/** Display order of regions: 서울 → 광역시 → 특별자치시(세종) → 도, then Korean name. */
function regionRank(name: string): number {
  if (name === "서울특별시") return 0;
  if (name.endsWith("광역시")) return 1;
  if (name.endsWith("특별자치시")) return 2;
  if (name.endsWith("도")) return 3;
  return 4;
}

export function localityIndex(): RegionLite[] {
  return ELECTION.regions
    .map((region) => ({
      name: region.name,
      slug: region.urlSlug,
      href: region.href,
      offices: sortOffices(region.offices).map((o) =>
        liteOffice(o, [region.urlSlug, o.urlSlug])
      ),
      localities: region.subregions.map((sr) => liteLocality(region, sr)),
      candidateTotal: countCandidates(region),
    }))
    .sort(
      (a, b) => regionRank(a.name) - regionRank(b.name) || a.name.localeCompare(b.name, "ko")
    );
}
