/**
 * Builds typed JSON for 서울특별시교육감 candidates.
 *
 * Output:
 *   data/seoul/edu/index.json     ← lightweight 8명 명부
 *   data/seoul/edu/matrix.json    ← 비교매트릭스 raw
 *   data/seoul/edu/{number}.json  ← 후보별 full typed (1..8)
 *
 * Run:  pnpm build:edu
 */

import * as fs from "fs";
import * as path from "path";
import { parseCandidateHeader, parseSections, summarizeTruth } from "../lib/parsers";
import { getPartyColor } from "../lib/party-colors";
import type {
  EduCandidate,
  EduIndex,
  EduIndexEntry,
  EduMatrix,
} from "../lib/edu-types";
import type { MilitaryStatus } from "../lib/mayor-types";

const SRC_DIR =
  process.env.EDU_SRC ||
  path.resolve(
    process.env.HOME || "",
    "Documents/markdown_manager/files/markdown/2026-지방선거/서울특별시/서울교육감"
  );
const OUT_DIR = path.resolve(__dirname, "..", "data/seoul/edu");
const PHOTOS_DIR = path.resolve(__dirname, "..", "public/photos/edu");

function findPhotoForNumber(n: number): string | undefined {
  const padded = String(n).padStart(2, "0");
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const file = path.join(PHOTOS_DIR, `${padded}.${ext}`);
    if (fs.existsSync(file)) return `/photos/edu/${padded}.${ext}`;
  }
  return undefined;
}

// ---------- helpers (shared shape with build-mayor.ts) ----------

function readFile(p: string): { raw: string; mtime: string } {
  const stat = fs.statSync(p);
  return {
    raw: fs.readFileSync(p, "utf8").normalize("NFC"),
    mtime: stat.mtime.toISOString(),
  };
}

function parseKeyValueTable(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*[-:]+\s*\|/.test(trimmed)) continue;
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const key = cells[0].replace(/\*\*/g, "").trim();
    const value = cells.slice(1).join(" | ").replace(/\*\*/g, "").trim();
    if (key === "항목" && /^내용/.test(value)) continue;
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Parse a generic markdown table body into row strings — used for §2 학력 and §3 경력
 * where rows are heterogeneous (구분/학교/전공/학위) and we don't want to over-structure.
 */
function parseTableRowsAsText(body: string): string[] {
  const rows: string[] = [];
  const lines = body.split(/\r?\n/);
  let inTable = false;
  let headerSkipped = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      if (inTable && !trimmed) continue;
      inTable = false;
      headerSkipped = false;
      continue;
    }
    if (/^\|\s*[-:]+\s*\|/.test(trimmed)) {
      inTable = true;
      headerSkipped = true;
      continue;
    }
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (!headerSkipped) {
      // first row of a table without a separator yet — treat as header, skip once
      headerSkipped = true;
      continue;
    }
    // join cells with ' · ' so the row still reads as one phrase
    rows.push(cells.filter((c) => c).join(" · "));
  }
  return rows;
}

function parseOrderedPledges(body: string): { number: number; title: string; description: string }[] {
  const out: { number: number; title: string; description: string }[] = [];
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

function parsePersonalInfo(rows: Record<string, string>): EduCandidate["personalInfo"] {
  const out: EduCandidate["personalInfo"] = { other: {} };
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

function parseDeclaration(rows: Record<string, string>): EduCandidate["declaration"] {
  const out: EduCandidate["declaration"] = {
    criminalRecord: { count: 0 },
    military: { status: "unknown" },
    other: {},
  };
  for (const [k, v] of Object.entries(rows)) {
    // Match the top-line wealth row only.
    // Strip parenthetical units like "(천원)" first so "재산 신고액 (천원)" still matches.
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
 * Same as build-mayor.parseAmount: handles "△" Korean accounting negative marker
 * and standard minus signs.
 */
function parseAmount(s: string): number | null {
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

// ---------- candidate / index / matrix builders ----------

function buildCandidateJson(filePath: string, filename: string): EduCandidate | null {
  const { raw, mtime } = readFile(filePath);
  const parsed = parseSections(raw);
  const header = parseCandidateHeader(parsed.headerLine);

  // 교육감 headers use "명부순 N번" instead of "기호 N번" — fall back to filename prefix.
  let ordinal: number | null = header.기호 ? parseInt(header.기호, 10) : null;
  if (ordinal == null) {
    const m = filename.match(/^(\d+)/);
    if (m) ordinal = parseInt(m[1], 10);
  }
  if (ordinal == null) {
    console.warn(`[skip] ${filename}: no leading number`);
    return null;
  }

  const party = header.정당 || "무소속";
  const partyColor = getPartyColor(party);

  const sec = (no: number) => parsed.sections.find((s) => s.no === no);
  const personalInfo = sec(1) ? parsePersonalInfo(parseKeyValueTable(sec(1)!.body)) : { other: {} };
  const educationRows = sec(2) ? parseTableRowsAsText(sec(2)!.body) : [];
  const careerRows = sec(3) ? parseTableRowsAsText(sec(3)!.body) : [];
  const declaration = sec(4)
    ? parseDeclaration(parseKeyValueTable(sec(4)!.body))
    : { criminalRecord: { count: 0 }, military: { status: "unknown" as MilitaryStatus }, other: {} };
  const pledges = sec(5) ? parseOrderedPledges(sec(5)!.body) : [];

  const truth = summarizeTruth(raw);

  const rawSections: EduCandidate["rawSections"] = {};
  for (const s of parsed.sections) {
    const key = s.no != null ? `${String(s.no).padStart(2, "0")}-${s.title}` : s.title;
    rawSections[key] = { title: s.title, body: s.body, no: s.no };
  }

  return {
    number: ordinal,
    name: header.이름,
    hanja: header.한자,
    party,
    partyColor: partyColor.bg,
    filename,
    lastModified: mtime,
    meta: {
      election: "2026 제9회 지방선거 · 서울특별시교육감 후보",
      primarySource: parsed.metaLines.find((l) => /선관위|info\.nec\.go\.kr/.test(l)),
      notes: parsed.metaLines,
    },
    personalInfo,
    educationRows,
    careerRows,
    declaration,
    pledges,
    truthSummary: {
      red: truth.counts.red,
      yellow: truth.counts.yellow,
      orange: truth.counts.orange,
      black: truth.counts.black,
      white: truth.counts.white,
      blue: truth.counts.blue,
      total: truth.total,
    },
    rawSections,
    sources: parsed.sources,
    sourcesRaw: parsed.sourcesRaw,
  };
}

function buildIndexJson(filePath: string, candidates: EduCandidate[]): EduIndex {
  const { raw, mtime } = readFile(filePath);
  const parsed = parseSections(raw);
  const rosterRaw = raw.split(/^##\s/m)[0].trim();

  // No 결번 — straight 1..8 in roster order.
  const indexEntries: EduIndexEntry[] = candidates
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((c) => ({
      number: c.number,
      name: c.name,
      party: c.party,
      partyColor: c.partyColor,
      href: `/seoul/edu/${String(c.number).padStart(2, "0")}`,
      running: true,
      wealth: c.declaration.wealth,
      criminalCount: c.declaration.criminalRecord.count,
      militaryStatus: c.declaration.military.status,
      photo: findPhotoForNumber(c.number),
      truthSummary: {
        red: c.truthSummary.red,
        yellow: c.truthSummary.yellow,
        orange: c.truthSummary.orange,
        black: c.truthSummary.black,
        white: c.truthSummary.white,
        blue: c.truthSummary.blue,
      },
    }));

  return {
    office: "서울특별시교육감",
    electionDate: "2026-06-03",
    lastModified: mtime,
    primarySource: "중앙선거관리위원회 선거통계시스템 (info.nec.go.kr, 교육감선거)",
    rosterRaw,
    rawSections: parsed.sections.map((s) => ({ title: s.title, body: s.body })),
    candidates: indexEntries,
    sources: parsed.sources,
  };
}

function buildMatrixJson(filePath: string): EduMatrix {
  const { raw, mtime } = readFile(filePath);
  return { office: "서울특별시교육감", raw, lastModified: mtime };
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error("Source not found:", SRC_DIR);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const entries = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.normalize("NFC"));

  const candidates: EduCandidate[] = [];
  let indexFile: string | null = null;
  let matrixFile: string | null = null;

  for (const f of entries) {
    if (/^00.*인덱스/.test(f)) indexFile = f;
    else if (/^00.*(비교매트릭스|매트릭스)/.test(f)) matrixFile = f;
    else if (/^\d{2}/.test(f)) {
      const c = buildCandidateJson(path.join(SRC_DIR, f), f);
      if (c) candidates.push(c);
    }
  }

  for (const c of candidates) {
    fs.writeFileSync(path.join(OUT_DIR, `${c.number}.json`), JSON.stringify(c, null, 2));
  }

  if (indexFile) {
    const idx = buildIndexJson(path.join(SRC_DIR, indexFile), candidates);
    fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(idx, null, 2));
  }
  if (matrixFile) {
    const mx = buildMatrixJson(path.join(SRC_DIR, matrixFile));
    fs.writeFileSync(path.join(OUT_DIR, "matrix.json"), JSON.stringify(mx, null, 2));
  }

  console.log(`Wrote ${candidates.length} candidate JSONs + index + matrix → ${OUT_DIR}`);
  for (const c of candidates) {
    console.log(
      `  ${c.number}. ${c.name} (${c.party}) · wealth=${c.declaration.wealthKrw ?? "?"} · criminal=${c.declaration.criminalRecord.count} · edu rows=${c.educationRows.length} · career rows=${c.careerRows.length} · pledges=${c.pledges.length}`
    );
  }
}

main();
