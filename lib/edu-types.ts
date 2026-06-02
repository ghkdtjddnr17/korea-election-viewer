/**
 * Typed schema for 서울특별시교육감 candidate data.
 *
 * Mirrors the shape of MayorCandidate, with two domain differences:
 *   - `party` is essentially always "무소속" — the 교육자치법 forbids party affiliation.
 *   - There is no nation-wide unified ballot number; `number` here is the
 *     선관위 명부 게재 순서 (1~8). The actual on-ballot order rotates per polling station.
 *
 * §2 학력 and §3 경력 in this office come as tables (not bullet lists), so the
 * typed fields stay raw strings (one per row) — the raw markdown is the truth.
 */

import type { MilitaryStatus } from "./mayor-types";

export type EduCandidate = {
  /** 선관위 명부 게재 순서 (1~8). NOT a ballot number — order rotates per station. */
  number: number;
  name: string;
  hanja?: string;
  /** Always "무소속" for this office; kept for shape parity with MayorCandidate. */
  party: string;
  /** Mirror of party-colors; for 무소속 this resolves to the neutral gray. */
  partyColor: string;
  filename: string;
  lastModified: string;

  meta: {
    election: string;
    primarySource?: string;
    notes: string[];
  };

  /** §1. 인적 사항 — table → typed (same shape as Mayor). */
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

  /** §2. 학력 — table rows, one string per row. Falls back to raw markdown if parsing misses. */
  educationRows: string[];

  /** §3. 주요 경력 — table rows, one string per row. */
  careerRows: string[];

  /** §4. 신고 사항 — table → typed. */
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

  /** §5. 핵심 공약 — list of `1. **title** — description`. */
  pledges: { number: number; title: string; description: string }[];

  /** Truth-status emoji counts over the full document. */
  truthSummary: {
    red: number;
    yellow: number;
    orange: number;
    black: number;
    white: number;
    blue: number;
    total: number;
  };

  /** All ## sections preserved as raw markdown for lossless render. */
  rawSections: Record<string, { title: string; body: string; no: number | null }>;

  sources: { label: string; url: string; prefix?: string }[];
  sourcesRaw: string;
};

export type EduIndex = {
  office: "서울특별시교육감";
  electionDate: string;
  lastModified: string;
  primarySource: string;
  /** Roster table + prelude at the top of the index file. */
  rosterRaw: string;
  rawSections: { title: string; body: string }[];
  candidates: EduIndexEntry[];
  sources: { label: string; url: string; prefix?: string }[];
};

export type EduIndexEntry = {
  /** Roster order (1~8). All running — there is no 결번 concept here. */
  number: number;
  name: string;
  party: string; // "무소속"
  partyColor: string;
  href: string;
  running: true;
  /** Optional camp leaning the source data flags (보수/진보/중도). */
  camp?: "보수" | "진보" | "중도";
  wealth?: string;
  criminalCount?: number;
  militaryStatus?: MilitaryStatus;
  /** Path under /public when a portrait was downloaded. */
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

export type EduMatrix = {
  office: "서울특별시교육감";
  raw: string;
  lastModified: string;
};
