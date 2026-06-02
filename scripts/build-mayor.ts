/**
 * Builds typed JSON for 서울특별시장 candidates.
 *
 * Output:
 *   data/seoul/mayor/index.json     ← 인덱스 (6명 lightweight)
 *   data/seoul/mayor/matrix.json    ← 비교매트릭스 raw
 *   data/seoul/mayor/{number}.json  ← 후보별 full typed (1,2,4,5,6,7)
 *
 * Run:  pnpm build:mayor
 */

import * as fs from "fs";
import * as path from "path";
import { parseCandidateHeader, parseSections, summarizeTruth } from "../lib/parsers";
import { getPartyColor } from "../lib/party-colors";
import type {
  MayorCandidate,
  MayorIndex,
  MayorIndexEntry,
  MayorMatrix,
  MilitaryStatus,
} from "../lib/mayor-types";

const SRC_DIR =
  process.env.MAYOR_SRC ||
  path.resolve(
    process.env.HOME || "",
    "Documents/markdown_manager/files/markdown/2026-지방선거/서울특별시/서울시장"
  );
const OUT_DIR = path.resolve(__dirname, "..", "data/seoul/mayor");
const PHOTOS_DIR = path.resolve(__dirname, "..", "public/photos");

/** Returns "/photos/01.jpg" style path when the file exists, else undefined. */
function findPhotoForNumber(n: number): string | undefined {
  const padded = String(n).padStart(2, "0");
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const file = path.join(PHOTOS_DIR, `${padded}.${ext}`);
    if (fs.existsSync(file)) return `/photos/${padded}.${ext}`;
  }
  return undefined;
}

// ---------- helpers ----------

function readFile(p: string): { raw: string; mtime: string } {
  const stat = fs.statSync(p);
  return {
    raw: fs.readFileSync(p, "utf8").normalize("NFC"),
    mtime: stat.mtime.toISOString(),
  };
}

/**
 * Parse `| 항목 | 내용 |` style table rows into a dictionary.
 * Markdown text on the left becomes the lookup key (Korean — it's data, not an identifier).
 */
function parseKeyValueTable(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*[-:]+\s*\|/.test(trimmed)) continue; // separator row
    const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const key = cells[0].replace(/\*\*/g, "").trim();
    const value = cells.slice(1).join(" | ").replace(/\*\*/g, "").trim();
    if (key === "항목" && /^내용/.test(value)) continue; // table header row
    if (!key || !value) continue;
    out[key] = value;
  }
  return out;
}

/** Parse a top-level `- ...` / `* ...` list into trimmed strings. */
function parseTopLevelList(body: string): string[] {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^[-*]\s+(.+)$/);
    if (m) {
      out.push(m[1].replace(/^\*\*(.+?)\*\*\s*[—–-]\s*/, "$1 — ").trim());
    }
  }
  return out;
}

/**
 * Parse `1. ... 2. ...` ordered pledges and split each into title/description.
 * Multi-line items get joined.
 */
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
  // "**착착개발 (1호 공약)** — 재개발·재건축..."
  const bold = s.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
  if (bold) return { title: bold[1].trim(), desc: bold[2].trim() };
  // "착착개발 — 재개발..."
  const dash = s.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  if (dash) return { title: dash[1].replace(/\*\*/g, "").trim(), desc: dash[2].trim() };
  return { title: s.replace(/\*\*/g, "").trim(), desc: "" };
}

// ---------- field-level parsers ----------

function parsePersonalInfo(rows: Record<string, string>): MayorCandidate["personalInfo"] {
  const out: MayorCandidate["personalInfo"] = { other: {} };
  for (const [k, v] of Object.entries(rows)) {
    if (/생년월일|생년/.test(k)) {
      out.birthDate = v.replace(/\s*\([^)]*세\)\s*$/, "").trim();
      const age = v.match(/\((\d+)\s*세\)/);
      if (age) out.age = parseInt(age[1], 10);
    } else if (/^성별$/.test(k)) {
      out.gender = v;
    } else if (/주소/.test(k)) {
      out.address = v;
    } else if (/^직업$/.test(k)) {
      out.occupation = v;
    } else if (/출생지/.test(k)) {
      out.birthplace = v;
    } else if (/^가족/.test(k)) {
      out.family = v;
    } else {
      out.other[k] = v;
    }
  }
  return out;
}

function parseDeclaration(rows: Record<string, string>): MayorCandidate["declaration"] {
  const out: MayorCandidate["declaration"] = {
    criminalRecord: { count: 0 },
    military: { status: "unknown" },
    other: {},
  };
  for (const [k, v] of Object.entries(rows)) {
    // Match the top-line wealth row only.
    // - Strip parenthetical units like "(천원)" before matching.
    // - Accept "재산", "재산 신고액", "재산 총액", "재산총액", etc.
    // - Skip subrows ("후보자 재산", "배우자 재산", "직계존속 재산") which restate slices.
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
 * Handles the Korean accounting negative marker "△" (or U+25B3) and standard minus signs
 * so values like "△706,523천원 (약 -7.06억)" come out negative.
 */
function parseAmount(s: string): number | null {
  const negative = /△|[-−]\s*\d/.test(s); // △ or "-7" patterns indicate negative
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

// ---------- file builders ----------

function buildCandidateJson(filePath: string, filename: string): MayorCandidate | null {
  const { raw, mtime } = readFile(filePath);
  const parsed = parseSections(raw);
  const header = parseCandidateHeader(parsed.headerLine);
  const ballotNumber = header.기호 ? parseInt(header.기호, 10) : null;
  if (ballotNumber == null) {
    console.warn(`[skip] ${filename}: no 기호`);
    return null;
  }

  const party = header.정당 || "무소속";
  const partyColor = getPartyColor(party);

  const sec = (no: number) => parsed.sections.find((s) => s.no === no);
  const personalInfo = sec(1) ? parsePersonalInfo(parseKeyValueTable(sec(1)!.body)) : { other: {} };
  const education = sec(2) ? parseTopLevelList(sec(2)!.body) : [];
  const career = sec(3) ? parseTopLevelList(sec(3)!.body) : [];
  const declaration = sec(4)
    ? parseDeclaration(parseKeyValueTable(sec(4)!.body))
    : { criminalRecord: { count: 0 }, military: { status: "unknown" as MilitaryStatus }, other: {} };
  const pledges = sec(5) ? parseOrderedPledges(sec(5)!.body) : [];

  const truth = summarizeTruth(raw);

  const rawSections: MayorCandidate["rawSections"] = {};
  for (const s of parsed.sections) {
    const key = s.no != null ? `${String(s.no).padStart(2, "0")}-${s.title}` : s.title;
    rawSections[key] = { title: s.title, body: s.body, no: s.no };
  }

  return {
    number: ballotNumber,
    name: header.이름,
    hanja: header.한자,
    party,
    partyColor: partyColor.bg,
    filename,
    lastModified: mtime,
    meta: {
      election: "2026 제9회 지방선거 · 서울특별시장 후보",
      primarySource: parsed.metaLines.find((l) => /선관위|info\.nec\.go\.kr/.test(l)),
      notes: parsed.metaLines,
    },
    personalInfo,
    education,
    career,
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

function buildIndexJson(filePath: string, candidates: MayorCandidate[]): MayorIndex {
  const { raw, mtime } = readFile(filePath);
  const parsed = parseSections(raw);

  // Anything before the first ## heading is the candidate roster table + prelude.
  const rosterRaw = raw.split(/^##\s/m)[0].trim();

  const byNumber: Record<number, MayorCandidate> = {};
  for (const c of candidates) byNumber[c.number] = c;

  const ballotOrder = [1, 2, 3, 4, 5, 6, 7];
  const indexEntries: MayorIndexEntry[] = ballotOrder.map((n) => {
    const c = byNumber[n];
    if (!c) {
      // 3번 결번 (조국혁신당 통일기호 — 서울시장 후보 미출마)
      return {
        number: null,
        name: "결번",
        party: "(조국혁신당)",
        partyColor: getPartyColor("조국혁신당").bg,
        href: "",
        running: false,
      };
    }
    return {
      number: c.number,
      name: c.name,
      party: c.party,
      partyColor: c.partyColor,
      // zero-pad to match the catch-all router's candidate.urlSlug ("01", "02", ...)
      href: `/seoul/mayor/${String(c.number).padStart(2, "0")}`,
      running: true,
      photo: findPhotoForNumber(c.number),
      wealth: c.declaration.wealth,
      criminalCount: c.declaration.criminalRecord.count,
      militaryStatus: c.declaration.military.status,
      truthSummary: {
        red: c.truthSummary.red,
        yellow: c.truthSummary.yellow,
        orange: c.truthSummary.orange,
        black: c.truthSummary.black,
        white: c.truthSummary.white,
        blue: c.truthSummary.blue,
      },
    };
  });

  return {
    office: "서울특별시장",
    electionDate: "2026-06-03",
    lastModified: mtime,
    primarySource: "중앙선거관리위원회 선거통계시스템 (info.nec.go.kr)",
    rosterRaw,
    rawSections: parsed.sections.map((s) => ({ title: s.title, body: s.body })),
    candidates: indexEntries,
    sources: parsed.sources,
  };
}

function buildMatrixJson(filePath: string): MayorMatrix {
  const { raw, mtime } = readFile(filePath);
  return { office: "서울특별시장", raw, lastModified: mtime };
}

// ---------- main ----------

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

  const candidates: MayorCandidate[] = [];
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
      `  ${c.number}. ${c.name} (${c.party}) · wealth=${c.declaration.wealthKrw ?? "?"} · criminal=${c.declaration.criminalRecord.count} · education=${c.education.length} · pledges=${c.pledges.length}`
    );
  }
}

main();
