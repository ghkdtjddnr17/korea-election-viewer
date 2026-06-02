/**
 * Shared markdown-to-typed parsers used across the per-office build scripts
 * (build-mayor, build-edu, build-gwanak-*). Extracted so we don't drift fixes
 * across copy-pasted helpers.
 *
 * Inputs: markdown bodies for a single ## section.
 * Outputs: plain TS values that the per-office types impose schemas on.
 */

import type { MilitaryStatus } from "./mayor-types";
import { PARTY_COLORS } from "./party-colors";

const PARTY_NAMES = new Set(Object.keys(PARTY_COLORS));

/**
 * Strip a YAML-style front matter block (`---\nkey: value\n---`) off the top of a
 * markdown source. Returns the parsed key/value dict and the remaining body.
 * Used by 구의원/시의원 files that lead with structured metadata instead of an H1.
 */
export function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([^:]+):\s*(.+)$/);
    if (kv) meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: m[2] };
}

/**
 * Pull `기호 X · 정당명 · ...` style metadata out of the first bold blockquote line
 * (used by 가/사 선거구 구의원 files without YAML).
 */
export function extractBlockquoteMeta(raw: string): { ballotMark?: string; party?: string } {
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith(">")) continue;
    const cleaned = line.replace(/^>\s*\**\s*/, "").replace(/\**\s*$/, "");
    const parts = cleaned.split(/\s*·\s*/);
    let ballotMark: string | undefined;
    let party: string | undefined;
    for (const raw of parts) {
      const p = raw.replace(/\*\*/g, "").trim();
      const sym = p.match(/^기호\s+(\S+)/);
      if (sym) ballotMark = sym[1].trim();
      else if (PARTY_NAMES.has(p)) party = p;
    }
    if (ballotMark || party) return { ballotMark, party };
  }
  return {};
}

/** Parse `| 항목 | 내용 |` style tables into a key→value dict. */
export function parseKeyValueTable(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*[-:]+\s*\|/.test(trimmed)) continue; // separator row
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const key = cells[0].replace(/\*\*/g, "").trim();
    const value = cells.slice(1).join(" | ").replace(/\*\*/g, "").trim();
    if (key === "항목" && /^내용/.test(value)) continue; // table header
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}

/** Parse a top-level `- ...` / `* ...` list into trimmed strings. */
export function parseTopLevelList(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^[-*]\s+(.+)$/);
    if (m) out.push(m[1].replace(/^\*\*(.+?)\*\*\s*[—–-]\s*/, "$1 — ").trim());
  }
  return out;
}

/**
 * Parse a generic table body into row strings — used for §2 학력 / §3 경력 when
 * rows are heterogeneous (구분/학교/전공/학위) and we don't want to over-structure.
 */
export function parseTableRowsAsText(body: string): string[] {
  const rows: string[] = [];
  let headerSkipped = false;
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      if (!trimmed) continue;
      headerSkipped = false;
      continue;
    }
    if (/^\|\s*[-:]+\s*\|/.test(trimmed)) {
      headerSkipped = true;
      continue;
    }
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (!headerSkipped) {
      headerSkipped = true; // treat the first row before a separator as header
      continue;
    }
    rows.push(cells.filter((c) => c).join(" · "));
  }
  return rows;
}

export type Pledge = { number: number; title: string; description: string };

export function parseOrderedPledges(body: string): Pledge[] {
  const out: Pledge[] = [];
  let current: { number: number; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const joined = current.lines.join(" ").replace(/\s+/g, " ").trim();
    const split = splitTitleDesc(joined);
    out.push({ number: current.number, title: split.title, description: split.desc });
    current = null;
  };
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\.\s+(.+)$/);
    if (m) {
      flush();
      current = { number: parseInt(m[1], 10), lines: [m[2]] };
      continue;
    }
    if (current && line.trim() && !line.startsWith("#")) {
      current.lines.push(line.trim());
    }
  }
  flush();
  return out;
}

function splitTitleDesc(s: string): { title: string; desc: string } {
  const bold = s.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
  if (bold) return { title: bold[1].trim(), desc: bold[2].trim() };
  const dash = s.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (dash) return { title: dash[1].replace(/\*\*/g, "").trim(), desc: dash[2].trim() };
  return { title: s.replace(/\*\*/g, "").trim(), desc: "" };
}

export type PersonalInfo = {
  birthDate?: string;
  age?: number;
  gender?: string;
  address?: string;
  occupation?: string;
  birthplace?: string;
  family?: string;
  other: Record<string, string>;
};

export function parsePersonalInfo(rows: Record<string, string>): PersonalInfo {
  const out: PersonalInfo = { other: {} };
  for (const [k, v] of Object.entries(rows)) {
    if (/생년월일|생년/.test(k)) {
      out.birthDate = v.replace(/\s*\([^)]*세\)\s*$/, "").trim();
      const age = v.match(/\((\d+)\s*세\)/);
      if (age) out.age = parseInt(age[1], 10);
    } else if (/^성별$/.test(k)) out.gender = v;
    else if (/주소/.test(k)) out.address = v;
    else if (/^직업$/.test(k)) out.occupation = v;
    else if (/출생지/.test(k)) out.birthplace = v;
    else if (/^가족/.test(k)) out.family = v;
    else out.other[k] = v;
  }
  return out;
}

export type Declaration = {
  wealth?: string;
  wealthKrw?: number;
  taxPaidKrw?: number;
  taxArrearsKrw?: number;
  criminalRecord: { count: number; detail?: string };
  military: { status: MilitaryStatus; raw?: string };
  candidacyCount?: number;
  other: Record<string, string>;
};

export function parseDeclaration(rows: Record<string, string>): Declaration {
  const out: Declaration = {
    criminalRecord: { count: 0 },
    military: { status: "unknown" },
    other: {},
  };
  for (const [k, v] of Object.entries(rows)) {
    // Strip parenthetical units like "(천원)" before matching the wealth key.
    const keyNorm = k.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (!out.wealth && /^재산(\s*(신고|총)\s*액?)?$/.test(keyNorm)) {
      out.wealth = v;
      const won = parseAmount(v);
      if (won != null) out.wealthKrw = won;
    } else if (/납세/.test(k)) {
      const taxMatch = v.match(/([\d,]+)\s*천원/);
      if (taxMatch) out.taxPaidKrw = parseInt(taxMatch[1].replace(/,/g, ""), 10) * 1000;
      const arrears = v.match(/체납액\s*([\d,]+)/);
      if (arrears) out.taxArrearsKrw = parseInt(arrears[1].replace(/,/g, ""), 10);
    } else if (/체납/.test(k)) {
      const m = v.match(/([\d,]+)/);
      out.taxArrearsKrw = m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
    } else if (/전과/.test(k)) {
      const m = v.match(/(\d+)\s*건/);
      const count = m ? parseInt(m[1], 10) : v.includes("없음") ? 0 : 0;
      const detail = v.replace(/\*\*/g, "").trim();
      out.criminalRecord = { count, detail: detail || undefined };
    } else if (/병역/.test(k)) {
      out.military = { status: classifyMilitary(v), raw: v };
    } else if (/입후보/.test(k)) {
      const m = v.match(/(\d+)/);
      if (m) out.candidacyCount = parseInt(m[1], 10);
    } else {
      out.other[k] = v;
    }
  }
  return out;
}

function classifyMilitary(v: string): MilitaryStatus {
  if (v.includes("마친") || v.trim() === "필") return "served";
  if (v.includes("미필")) return "exempt";
  if (v.includes("해당없음") || v.includes("해당 없음")) return "not_applicable";
  return "unknown";
}

/**
 * "1,823,897천원 (약 18.2억 원)" → 1823897000.
 * Handles the Korean accounting negative marker "△" so values like
 * "△706,523천원 (약 -7.06억)" come out negative.
 */
export function parseAmount(s: string): number | null {
  const negative = /△|[-−]\s*\d/.test(s);
  const cheonwon = s.match(/([\d,]+)\s*천원/);
  if (cheonwon) {
    const val = parseInt(cheonwon[1].replace(/,/g, ""), 10) * 1000;
    return negative ? -val : val;
  }
  const eok = s.match(/([-]?\s*[\d.]+)\s*억/);
  if (eok) {
    const n = parseFloat(eok[1].replace(/\s+/g, ""));
    if (!Number.isNaN(n)) return Math.round(n * 1_0000_0000);
  }
  return null;
}
