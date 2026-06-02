/**
 * Loader for the combined typed bundle (data/typed.json, built by scripts/build-typed.ts).
 *
 * Routing + URL structure stays owned by System A (data/elections.json). This module only
 * supplies the *rich content* (structured 신고사항/공약/의혹 etc.) for offices that have a
 * typed builder. The catch-all looks an office/candidate up here by a key derived from the
 * System A url slugs; a miss means "no typed data — fall back to the markdown renderer".
 */
import bundle from "@/data/typed.json";
import type { MilitaryStatus } from "./mayor-types";
import type { TruthSummary } from "./types";

export type TypedCandidate = {
  number: number;
  /** Printed ballot label for district seats, e.g. "1-가". Absent for flat offices. */
  ballotMark?: string;
  name: string;
  hanja?: string;
  party: string;
  partyColor: string;
  /** Portrait path under /public, merged from the index roster by build-typed.ts. */
  photo?: string;
  /** "가선거구" / "제1선거구" — present for 구의원/시의원. */
  district?: string;
  filename: string;
  lastModified: string;
  meta: { election: string; primarySource?: string; notes: string[] };
  personalInfo: {
    birthDate?: string;
    age?: number;
    gender?: string;
    address?: string;
    occupation?: string;
    birthplace?: string;
    family?: string;
    other: Record<string, string>;
  };
  education: string[];
  career: string[];
  declaration: {
    wealth?: string;
    wealthKrw?: number;
    taxPaidKrw?: number;
    taxArrearsKrw?: number;
    criminalRecord: { count: number; detail?: string };
    military: { status: MilitaryStatus; raw?: string };
    candidacyCount?: number;
    other: Record<string, string>;
  };
  pledges: { number: number; title: string; description: string }[];
  truthSummary: {
    red: number;
    yellow: number;
    orange: number;
    black: number;
    white: number;
    blue: number;
    total: number;
  };
  rawSections: Record<string, { title: string; body: string; no: number | null }>;
  sources: { label: string; url: string; prefix?: string }[];
  sourcesRaw: string;
};

export type TypedIndex = {
  office: string;
  electionDate: string;
  lastModified: string;
  primarySource: string;
  rosterRaw?: string;
  rawSections?: { title: string; body: string }[];
  districts?: { name: string; candidates: unknown[] }[];
  sources: { label: string; url: string; prefix?: string }[];
};

export type TypedOfficeBundle = {
  kind: "flat" | "district";
  index: TypedIndex;
  matrix: string | null;
  candidates: Record<string, TypedCandidate>;
};

const TYPED = bundle as unknown as Record<string, TypedOfficeBundle>;

export function hasTypedOffice(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(TYPED, key);
}

export function getTypedOffice(key: string): TypedOfficeBundle | null {
  return TYPED[key] ?? null;
}

export function getTypedCandidate(
  officeKey: string,
  candidateKey: string
): TypedCandidate | null {
  return TYPED[officeKey]?.candidates[candidateKey] ?? null;
}

/** Office key from System A url slugs: ["seoul","mayor"] → "seoul/mayor". */
export function typedOfficeKey(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join("/");
}

/** System A district.name ("가선거구" / "제1선거구") → on-disk typed dir key ("가" / "1"). */
export function typedDistrictKey(districtName: string): string {
  return districtName.replace("선거구", "").replace("제", "");
}

/** Candidate key inside a typed office bundle. */
export function typedCandidateKey(
  number: number,
  districtName?: string
): string {
  return districtName ? `${typedDistrictKey(districtName)}/${number}` : String(number);
}

/** Adapt the flat typed truthSummary to the {counts,total} shape TruthBadge expects. */
export function toTruthSummary(ts: TypedCandidate["truthSummary"]): TruthSummary {
  const { total, ...counts } = ts;
  return { counts, total };
}

