/**
 * Typed schema for 관악구 offices.
 *
 * Coverage in this commit:
 *   - 관악구청장 (head): identical shape to MayorCandidate; ballot-numbered, with
 *     potential 결번 slots.
 *   - 관악구의원비례 (council-pr): party-as-entity. `name` carries the party's own name.
 *
 * 구의원/시의원 (district-scoped) ship in a follow-up — their headers use a different
 * pattern and need their own parser.
 */

import type { Pledge, PersonalInfo, Declaration } from "./office-parsers";
import type { MilitaryStatus } from "./mayor-types";

export type GwanakHeadCandidate = {
  number: number;
  name: string;
  hanja?: string;
  party: string;
  partyColor: string;
  filename: string;
  lastModified: string;
  meta: { election: string; primarySource?: string; notes: string[] };
  personalInfo: PersonalInfo;
  education: string[];
  career: string[];
  declaration: Declaration;
  pledges: Pledge[];
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

export type GwanakHeadIndex = {
  // Office label, e.g. "관악구청장" / "동작구청장" (shared across 자치구 builders).
  office: string;
  electionDate: string;
  lastModified: string;
  primarySource: string;
  rosterRaw: string;
  rawSections: { title: string; body: string }[];
  candidates: GwanakHeadIndexEntry[];
  sources: { label: string; url: string; prefix?: string }[];
};

export type GwanakHeadIndexEntry = {
  number: number | null;
  name: string;
  party: string;
  partyColor: string;
  href: string;
  running: boolean;
  wealth?: string;
  criminalCount?: number;
  militaryStatus?: MilitaryStatus;
  photo?: string;
  truthSummary?: {
    red: number;
    yellow: number;
    orange: number;
    black: number;
    white: number;
    blue: number;
  };
};

/**
 * 관악구의원비례 (council-pr). Entity is a party, not a person.
 * `name` here is the party name itself ("더불어민주당" etc) so it doubles as the
 * card label and the party reference.
 */
export type GwanakCouncilPrCandidate = GwanakHeadCandidate;
export type GwanakCouncilPrIndexEntry = GwanakHeadIndexEntry;
export type GwanakCouncilPrIndex = Omit<GwanakHeadIndex, "office" | "candidates"> & {
  office: string;
  candidates: GwanakCouncilPrIndexEntry[];
};

export type GwanakMatrix = {
  office: string;
  raw: string;
  lastModified: string;
};

/**
 * 관악구의원 (구·시·군의회의원, 지역구). Candidates run inside one of seven 선거구
 * (가/나/다/라/마/바/사), each with its own ballot numbering (e.g. "1-가", "2-가",
 * "1-나"). `ballotMark` preserves the printed ballot label, `number` is the within-
 * district order from the filename prefix.
 */
export type GwanakCouncilCandidate = {
  number: number;          // intra-district order (1, 2, 3 ...) from filename
  ballotMark?: string;     // printed mark e.g. "1-가"
  name: string;
  hanja?: string;
  party: string;
  partyColor: string;
  district: string;        // "가선거구", "나선거구" ...
  filename: string;
  lastModified: string;
  meta: { election: string; primarySource?: string; notes: string[] };
  /** Front-matter dict for files that ship YAML, e.g. id/선거구/기호/성명/한자/성별. */
  frontmatter: Record<string, string>;
  personalInfo: PersonalInfo;
  education: string[];
  career: string[];
  declaration: Declaration;
  pledges: Pledge[];
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

export type GwanakCouncilIndexEntry = {
  number: number;
  ballotMark?: string;
  name: string;
  party: string;
  partyColor: string;
  district: string;
  href: string;
  running: true;
  wealth?: string;
  criminalCount?: number;
  militaryStatus?: MilitaryStatus;
  photo?: string;
};

export type GwanakCouncilIndex = {
  office: string;
  electionDate: string;
  lastModified: string;
  primarySource: string;
  rosterRaw: string;
  /** Per-district groupings of running candidates. */
  districts: {
    name: string;       // "가선거구"
    candidates: GwanakCouncilIndexEntry[];
  }[];
  sources: { label: string; url: string; prefix?: string }[];
};

/**
 * 관악구시의원 (광역의원, 시도의원). Flat directory; the district is encoded in the
 * filename prefix ("03-제3-임만균.md" → 제3선거구). Each 선거구 typically has one
 * candidate but a couple have two competing within the same party.
 */
export type GwanakMetroCandidate = GwanakCouncilCandidate;
export type GwanakMetroIndexEntry = GwanakCouncilIndexEntry;
export type GwanakMetroIndex = Omit<GwanakCouncilIndex, "office"> & {
  office: string;
};
