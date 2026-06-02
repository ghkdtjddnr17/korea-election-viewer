/**
 * Builds typed JSON for 동작구 offices. 동작구 mirrors 관악구's folder/file shapes
 * exactly, so this is the 관악 builder with 동작-specific paths, hrefs, and ballot
 * vacancies. If a third 자치구 ships, fold these two into a config-driven builder.
 *
 *   - 동작구청장 (head)        — 3 candidates (1 류삼영 / 2 김정태 / 4 박일하), 3번 결번.
 *   - 동작구의원비례 (council-pr) — 3 parties (1 민주 / 2 국힘 / 4 개혁), 3번 결번.
 *   - 동작구의원 (council)      — 가~사선거구, district-scoped.
 *   - 동작구시의원 (metro)      — 제1~제4선거구, flat dir w/ filename-encoded district.
 *
 * Output layout:
 *   data/seoul/dongjak/head/{1,2,4}.json + index.json + matrix.json
 *   data/seoul/dongjak/council-pr/{1,2,4}.json + index.json + matrix.json
 *   data/seoul/dongjak/council/{가..사}/{N}.json + index.json + matrix.json
 *   data/seoul/dongjak/metro/{1..4}/{N}.json + index.json + matrix.json
 *
 * Run:  pnpm build:dongjak
 */

import * as fs from "fs";
import * as path from "path";
import { parseCandidateHeader, parseSections, summarizeTruth } from "../lib/parsers";
import {
  parseKeyValueTable,
  parseTopLevelList,
  parseOrderedPledges,
  parsePersonalInfo,
  parseDeclaration,
  parseFrontmatter,
  extractBlockquoteMeta,
} from "../lib/office-parsers";
import { getPartyColor, PARTY_COLORS } from "../lib/party-colors";
import type {
  GwanakHeadCandidate,
  GwanakHeadIndex,
  GwanakHeadIndexEntry,
  GwanakCouncilPrCandidate,
  GwanakCouncilPrIndex,
  GwanakCouncilCandidate,
  GwanakCouncilIndex,
  GwanakCouncilIndexEntry,
  GwanakMetroCandidate,
  GwanakMetroIndex,
  GwanakMatrix,
} from "../lib/gwanak-types";
import type { MilitaryStatus } from "../lib/mayor-types";

const SRC_ROOT =
  process.env.DONGJAK_SRC ||
  path.resolve(
    process.env.HOME || "",
    "Documents/markdown_manager/files/markdown/2026-지방선거/서울특별시/동작구"
  );
const OUT_ROOT = path.resolve(__dirname, "..", "data/seoul/dongjak");
const PHOTOS_ROOT = path.resolve(__dirname, "..", "public/photos/dongjak");

const PARTY_NAMES = new Set(Object.keys(PARTY_COLORS));

function readFile(p: string): { raw: string; mtime: string } {
  const stat = fs.statSync(p);
  return {
    raw: fs.readFileSync(p, "utf8").normalize("NFC"),
    mtime: stat.mtime.toISOString(),
  };
}

function findPhotoForNumber(office: string, n: number): string | undefined {
  const padded = String(n).padStart(2, "0");
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const file = path.join(PHOTOS_ROOT, office, `${padded}.${ext}`);
    if (fs.existsSync(file)) return `/photos/dongjak/${office}/${padded}.${ext}`;
  }
  return undefined;
}

// ---------- head / council-pr candidate builder ----------

/**
 * Build a head-office candidate (구청장 or 의원비례).
 *
 * - For 구청장, header is `# 기호 N번 류삼영 (柳三榮) — 더불어민주당` (mayor-shape).
 * - For 의원비례, header is `# 기호 N번 더불어민주당 — 동작구의원 비례대표`. The "name"
 *   slot already holds the party, so we promote it and keep the office label as
 *   the entity name as well.
 */
function buildHeadCandidate(filePath: string, filename: string, isPr: boolean): GwanakHeadCandidate | null {
  const { raw, mtime } = readFile(filePath);
  const parsed = parseSections(raw);
  const header = parseCandidateHeader(parsed.headerLine);

  const ballotNumber = header.기호 ? parseInt(header.기호, 10) : null;
  if (ballotNumber == null) {
    console.warn(`[skip] ${filename}: no leading 기호`);
    return null;
  }

  // For 의원비례 the "name" slot is the party name itself.
  let name = header.이름;
  let party = header.정당 || "무소속";
  if (isPr && PARTY_NAMES.has(header.이름)) {
    party = header.이름;
    name = header.이름;
  }

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

  const rawSections: GwanakHeadCandidate["rawSections"] = {};
  for (const s of parsed.sections) {
    const key = s.no != null ? `${String(s.no).padStart(2, "0")}-${s.title}` : s.title;
    rawSections[key] = { title: s.title, body: s.body, no: s.no };
  }

  return {
    number: ballotNumber,
    name,
    hanja: header.한자,
    party,
    partyColor: partyColor.bg,
    filename,
    lastModified: mtime,
    meta: {
      election: isPr
        ? "2026 제9회 지방선거 · 서울특별시 동작구의원 비례대표"
        : "2026 제9회 지방선거 · 서울특별시 동작구청장 후보",
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

// ---------- 구청장 (head) ----------

const HEAD_BALLOT_ORDER = [1, 2, 3, 4]; // 3번 결번 (조국혁신당 미출마)

function buildHeadIndex(
  filePath: string,
  candidates: GwanakHeadCandidate[]
): GwanakHeadIndex {
  const { raw, mtime } = readFile(filePath);
  const parsed = parseSections(raw);
  const rosterRaw = raw.split(/^##\s/m)[0].trim();

  const byNumber: Record<number, GwanakHeadCandidate> = {};
  for (const c of candidates) byNumber[c.number] = c;

  const entries: GwanakHeadIndexEntry[] = HEAD_BALLOT_ORDER.map((n) => {
    const c = byNumber[n];
    if (!c) {
      // 3번 결번 (통일기호 3번 = 조국혁신당)
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
      href: `/seoul/dongjak/head/${String(c.number).padStart(2, "0")}`,
      running: true,
      photo: findPhotoForNumber("head", c.number),
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
    office: "동작구청장",
    electionDate: "2026-06-03",
    lastModified: mtime,
    primarySource: "중앙선거관리위원회 선거통계시스템 (info.nec.go.kr, 구·시·군의 장선거)",
    rosterRaw,
    rawSections: parsed.sections.map((s) => ({ title: s.title, body: s.body })),
    candidates: entries,
    sources: parsed.sources,
  };
}

// ---------- 의원비례 (council-pr) ----------

const COUNCIL_PR_BALLOT_ORDER = [1, 2, 3, 4]; // 1 민주 · 2 국힘 · 4 개혁 출마, 3번 결번

function buildCouncilPrIndex(
  filePath: string,
  parties: GwanakCouncilPrCandidate[]
): GwanakCouncilPrIndex {
  const { raw, mtime } = readFile(filePath);
  const parsed = parseSections(raw);
  const rosterRaw = raw.split(/^##\s/m)[0].trim();

  const byNumber: Record<number, GwanakCouncilPrCandidate> = {};
  for (const p of parties) byNumber[p.number] = p;

  // Council-pr in 동작구: 1·2·4 filed. 3 is 결번 (통일기호 미출마).
  const entries = COUNCIL_PR_BALLOT_ORDER.map((n) => {
    const p = byNumber[n];
    if (!p) {
      const partyByNumber: Record<number, string> = { 3: "조국혁신당" };
      const partyName = partyByNumber[n] || "—";
      return {
        number: null,
        name: "결번",
        party: `(${partyName})`,
        partyColor: getPartyColor(partyName).bg,
        href: "",
        running: false,
      };
    }
    return {
      number: p.number,
      name: p.name,
      party: p.party,
      partyColor: p.partyColor,
      href: `/seoul/dongjak/council-pr/${String(p.number).padStart(2, "0")}`,
      running: true,
      photo: findPhotoForNumber("council-pr", p.number),
      // declaration/criminal/military aren't applicable for party-entity entries,
      // but we keep the shape parity so the card component renders without specials.
    };
  });

  return {
    office: "동작구의원비례",
    electionDate: "2026-06-03",
    lastModified: mtime,
    primarySource: "중앙선거관리위원회 선거통계시스템 (info.nec.go.kr, 기초의원비례)",
    rosterRaw,
    rawSections: parsed.sections.map((s) => ({ title: s.title, body: s.body })),
    candidates: entries,
    sources: parsed.sources,
  };
}

// ---------- matrix passthrough ----------

function buildMatrixJson(filePath: string, office: string): GwanakMatrix {
  const { raw, mtime } = readFile(filePath);
  return { office, raw, lastModified: mtime };
}

// ---------- per-office runner ----------

function runOffice(officeDirName: string, outSubdir: string, isPr: boolean): {
  office: string;
  candidates: GwanakHeadCandidate[];
} {
  const srcDir = path.join(SRC_ROOT, officeDirName);
  const outDir = path.join(OUT_ROOT, outSubdir);
  fs.mkdirSync(outDir, { recursive: true });

  const entries = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.normalize("NFC"));

  const candidates: GwanakHeadCandidate[] = [];
  let indexFile: string | null = null;
  let matrixFile: string | null = null;

  for (const f of entries) {
    if (/^00.*인덱스/.test(f)) indexFile = f;
    else if (/^00.*(비교매트릭스|매트릭스)/.test(f)) matrixFile = f;
    else if (/^\d{2}/.test(f)) {
      const c = buildHeadCandidate(path.join(srcDir, f), f, isPr);
      if (c) candidates.push(c);
    }
  }

  for (const c of candidates) {
    fs.writeFileSync(path.join(outDir, `${c.number}.json`), JSON.stringify(c, null, 2));
  }

  if (indexFile) {
    const idx = isPr
      ? buildCouncilPrIndex(path.join(srcDir, indexFile), candidates)
      : buildHeadIndex(path.join(srcDir, indexFile), candidates);
    fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(idx, null, 2));
  }
  if (matrixFile) {
    const mx = buildMatrixJson(path.join(srcDir, matrixFile), officeDirName);
    fs.writeFileSync(path.join(outDir, "matrix.json"), JSON.stringify(mx, null, 2));
  }

  return { office: officeDirName, candidates };
}

// ---------- 동작구의원 (council, district-scoped) ----------

const COUNCIL_DISTRICTS = [
  "가선거구",
  "나선거구",
  "다선거구",
  "라선거구",
  "마선거구",
  "바선거구",
  "사선거구",
];

/**
 * 구의원·시의원 file shape varies — some lead with YAML front-matter, some with an
 * H1+blockquote. This builder normalizes both into a typed candidate.
 *
 * Inputs:
 *   - district: "가선거구" / "제3선거구" (for log + entry)
 *   - source filename for ordering + raw fallback
 */
function buildDistrictCandidate(
  filePath: string,
  filename: string,
  district: string,
  officeLabel: string
): GwanakCouncilCandidate | null {
  const { raw, mtime } = readFile(filePath);
  const { meta: frontmatter, body } = parseFrontmatter(raw);

  // Filename order: "01-이영수.md" → 1.
  const orderMatch = filename.match(/^(\d+)/);
  const number = orderMatch ? parseInt(orderMatch[1], 10) : 0;

  // Try to recover name / hanja / party / ballotMark in this order:
  //   1. YAML front-matter (성명/한자/정당/기호)
  //   2. H1 header + blockquote meta from the markdown
  let name = frontmatter["성명"] || "";
  let hanja = frontmatter["한자"] || undefined;
  let party = frontmatter["정당"] || "";
  let ballotMark = frontmatter["기호"] || undefined;

  if (!name || !party) {
    const parsed = parseSections(body);
    const header = parseCandidateHeader(parsed.headerLine);
    if (!name) name = header.이름 || "";
    if (!hanja && header.한자) hanja = header.한자;
    if (!party && header.정당) party = header.정당;

    // Some council files put 기호·정당 in a bold blockquote line.
    const bq = extractBlockquoteMeta(body);
    if (!ballotMark && bq.ballotMark) ballotMark = bq.ballotMark;
    if (!party && bq.party) party = bq.party;
  }

  // Metro 시의원 H1: "# 김정환 — 서울특별시의원 동작구 제1선거구 (기호 1, 더불어민주당)"
  // Pull party + ballot out of the parenthetical.
  if (!party || !ballotMark) {
    const h1 = (body.match(/^#\s+([^\n]+)/) || [])[1] || "";
    const paren = h1.match(/\(\s*기호\s*([^,)\s]+)\s*,\s*([^)]+?)\s*\)/);
    if (paren) {
      if (!ballotMark) ballotMark = paren[1].trim();
      if (!party) party = paren[2].trim();
    }
    if (!name) {
      const nameMatch = h1.match(/^([^\s—|(]+)/);
      if (nameMatch) name = nameMatch[1].trim();
    }
  }

  if (!name) {
    console.warn(`[skip] ${filename}: no name`);
    return null;
  }
  if (!party) party = "무소속";

  const partyColor = getPartyColor(party);

  // Sections — parse from body (after YAML strip). Some council files use "## §1." instead
  // of "## 1." — parseSections handles both via parsers.makeSection.
  const parsed = parseSections(body);
  const sec = (no: number) => parsed.sections.find((s) => s.no === no);
  const personalInfo = sec(1) ? parsePersonalInfo(parseKeyValueTable(sec(1)!.body)) : { other: {} };
  const education = sec(2) ? parseTopLevelList(sec(2)!.body) : [];
  const career = sec(3) ? parseTopLevelList(sec(3)!.body) : [];
  const declaration = sec(4)
    ? parseDeclaration(parseKeyValueTable(sec(4)!.body))
    : { criminalRecord: { count: 0 }, military: { status: "unknown" as MilitaryStatus }, other: {} };
  const pledges = sec(5) ? parseOrderedPledges(sec(5)!.body) : [];

  const truth = summarizeTruth(raw);

  const rawSections: GwanakCouncilCandidate["rawSections"] = {};
  for (const s of parsed.sections) {
    const key = s.no != null ? `${String(s.no).padStart(2, "0")}-${s.title}` : s.title;
    rawSections[key] = { title: s.title, body: s.body, no: s.no };
  }

  return {
    number,
    ballotMark,
    name,
    hanja,
    party,
    partyColor: partyColor.bg,
    district,
    filename,
    lastModified: mtime,
    meta: {
      election: `2026 제9회 지방선거 · 서울특별시 ${officeLabel}`,
      primarySource: parsed.metaLines.find((l) => /선관위|info\.nec\.go\.kr/.test(l)),
      notes: parsed.metaLines,
    },
    frontmatter,
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

function runCouncil(): {
  candidates: { district: string; entries: GwanakCouncilCandidate[] }[];
} {
  const officeDir = path.join(SRC_ROOT, "동작구의원");
  const outDir = path.join(OUT_ROOT, "council");
  fs.mkdirSync(outDir, { recursive: true });

  const byDistrict: { district: string; entries: GwanakCouncilCandidate[] }[] = [];
  let indexFile: string | null = null;
  let matrixFile: string | null = null;

  for (const f of fs.readdirSync(officeDir)) {
    if (/^00.*인덱스/.test(f)) indexFile = f;
    else if (/^00.*(비교매트릭스|매트릭스)/.test(f)) matrixFile = f;
  }

  for (const district of COUNCIL_DISTRICTS) {
    const districtDir = path.join(officeDir, district);
    if (!fs.existsSync(districtDir)) continue;

    const districtCandidates: GwanakCouncilCandidate[] = [];
    const files = fs
      .readdirSync(districtDir)
      .filter((f) => /^\d{2}.*\.md$/.test(f))
      .map((f) => f.normalize("NFC"))
      .sort();

    for (const f of files) {
      const c = buildDistrictCandidate(
        path.join(districtDir, f),
        f,
        district,
        "동작구의원"
      );
      if (c) districtCandidates.push(c);
    }

    if (districtCandidates.length > 0) {
      const districtSlug = district.replace("선거구", ""); // "가선거구" → "가"
      const districtOutDir = path.join(outDir, districtSlug);
      fs.mkdirSync(districtOutDir, { recursive: true });
      for (const c of districtCandidates) {
        fs.writeFileSync(
          path.join(districtOutDir, `${c.number}.json`),
          JSON.stringify(c, null, 2)
        );
      }
      byDistrict.push({ district, entries: districtCandidates });
    }
  }

  // Build the office-level index
  const indexPath = indexFile
    ? path.join(officeDir, indexFile)
    : null;
  const { raw: indexRaw, mtime: indexMtime } = indexPath
    ? readFile(indexPath)
    : { raw: "", mtime: new Date().toISOString() };
  const indexParsed = indexPath ? parseSections(indexRaw) : { sections: [], sources: [] };

  const idx: GwanakCouncilIndex = {
    office: "동작구의원",
    electionDate: "2026-06-03",
    lastModified: indexMtime,
    primarySource: "중앙선거관리위원회 선거통계시스템 (info.nec.go.kr, 구·시·군의회의원선거)",
    rosterRaw: indexRaw ? indexRaw.split(/^##\s/m)[0].trim() : "",
    districts: byDistrict.map(({ district, entries }) => ({
      name: district,
      candidates: entries.map((c) => ({
        number: c.number,
        ballotMark: c.ballotMark,
        name: c.name,
        party: c.party,
        partyColor: c.partyColor,
        district: c.district,
        href: `/seoul/dongjak/council/${district.replace("선거구", "")}/${String(c.number).padStart(2, "0")}`,
        running: true,
        wealth: c.declaration.wealth,
        criminalCount: c.declaration.criminalRecord.count,
        militaryStatus: c.declaration.military.status,
        photo: findPhotoForNumber(`council/${district.replace("선거구", "")}`, c.number),
      })) as GwanakCouncilIndexEntry[],
    })),
    sources: indexParsed.sources || [],
  };
  fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(idx, null, 2));

  if (matrixFile) {
    const mx = buildMatrixJson(path.join(officeDir, matrixFile), "동작구의원");
    fs.writeFileSync(path.join(outDir, "matrix.json"), JSON.stringify(mx, null, 2));
  }

  return { candidates: byDistrict };
}

// ---------- 동작구시의원 (metro, flat dir with filename-encoded district) ----------

function districtFromMetroFilename(filename: string): string | null {
  // "03-제2-김경우.md" → "제2선거구"
  const m = filename.match(/^\d+-(제\d+)-/);
  return m ? `${m[1]}선거구` : null;
}

function runMetro(): { groups: { district: string; entries: GwanakMetroCandidate[] }[] } {
  const officeDir = path.join(SRC_ROOT, "동작구시의원");
  const outDir = path.join(OUT_ROOT, "metro");
  fs.mkdirSync(outDir, { recursive: true });

  let indexFile: string | null = null;
  let matrixFile: string | null = null;
  const groups: Record<string, GwanakMetroCandidate[]> = {};

  for (const f of fs.readdirSync(officeDir).map((s) => s.normalize("NFC"))) {
    if (/^00.*인덱스/.test(f)) {
      indexFile = f;
      continue;
    }
    if (/^00.*(비교매트릭스|매트릭스)/.test(f)) {
      matrixFile = f;
      continue;
    }
    if (!/^\d{2}-제\d+/.test(f)) continue;
    const district = districtFromMetroFilename(f);
    if (!district) continue;
    const c = buildDistrictCandidate(
      path.join(officeDir, f),
      f,
      district,
      "동작구 서울시의원"
    );
    if (!c) continue;
    (groups[district] ??= []).push(c);
  }

  // Per-district output dirs ("제1선거구" → "1" via the existing slug mapping)
  for (const [district, entries] of Object.entries(groups)) {
    const districtSlug = district.replace("선거구", "").replace("제", "");
    const districtOutDir = path.join(outDir, districtSlug);
    fs.mkdirSync(districtOutDir, { recursive: true });
    for (const c of entries) {
      fs.writeFileSync(
        path.join(districtOutDir, `${c.number}.json`),
        JSON.stringify(c, null, 2)
      );
    }
  }

  const indexPath = indexFile ? path.join(officeDir, indexFile) : null;
  const { raw: indexRaw, mtime: indexMtime } = indexPath
    ? readFile(indexPath)
    : { raw: "", mtime: new Date().toISOString() };
  const indexParsed = indexPath ? parseSections(indexRaw) : { sections: [], sources: [] };

  // Sort districts by 제N number
  const sortedDistricts = Object.keys(groups).sort((a, b) => {
    const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
    const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
    return na - nb;
  });

  const idx: GwanakMetroIndex = {
    office: "동작구시의원",
    electionDate: "2026-06-03",
    lastModified: indexMtime,
    primarySource: "중앙선거관리위원회 선거통계시스템 (info.nec.go.kr, 시·도의회의원선거)",
    rosterRaw: indexRaw ? indexRaw.split(/^##\s/m)[0].trim() : "",
    districts: sortedDistricts.map((district) => ({
      name: district,
      candidates: groups[district].map((c) => ({
        number: c.number,
        ballotMark: c.ballotMark,
        name: c.name,
        party: c.party,
        partyColor: c.partyColor,
        district: c.district,
        href: `/seoul/dongjak/metro/${district.replace("선거구", "").replace("제", "")}/${String(c.number).padStart(2, "0")}`,
        running: true,
        wealth: c.declaration.wealth,
        criminalCount: c.declaration.criminalRecord.count,
        militaryStatus: c.declaration.military.status,
        photo: findPhotoForNumber(
          `metro/${district.replace("선거구", "").replace("제", "")}`,
          c.number
        ),
      })) as GwanakCouncilIndexEntry[],
    })),
    sources: indexParsed.sources || [],
  };
  fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(idx, null, 2));

  if (matrixFile) {
    const mx = buildMatrixJson(path.join(officeDir, matrixFile), "동작구시의원");
    fs.writeFileSync(path.join(outDir, "matrix.json"), JSON.stringify(mx, null, 2));
  }

  return {
    groups: sortedDistricts.map((d) => ({ district: d, entries: groups[d] })),
  };
}

function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error("Source not found:", SRC_ROOT);
    process.exit(1);
  }

  const head = runOffice("동작구청장", "head", false);
  console.log(`\n동작구청장 → ${head.candidates.length} candidates`);
  for (const c of head.candidates) {
    console.log(
      `  ${c.number}. ${c.name} (${c.party}) · wealth=${c.declaration.wealthKrw ?? "?"} · criminal=${c.declaration.criminalRecord.count} · pledges=${c.pledges.length}`
    );
  }

  const pr = runOffice("동작구의원비례", "council-pr", true);
  console.log(`\n동작구의원비례 → ${pr.candidates.length} parties`);
  for (const c of pr.candidates) {
    console.log(`  ${c.number}. ${c.name} (party=${c.party}) · pledges=${c.pledges.length}`);
  }

  const council = runCouncil();
  console.log(`\n동작구의원 → ${council.candidates.reduce((a, d) => a + d.entries.length, 0)} candidates across ${council.candidates.length} districts`);
  for (const d of council.candidates) {
    console.log(`  ${d.district}:`);
    for (const c of d.entries) {
      console.log(
        `    ${c.number}. ${c.name} (${c.party}, ballot=${c.ballotMark ?? "?"}) · wealth=${c.declaration.wealthKrw ?? "?"} · pledges=${c.pledges.length}`
      );
    }
  }

  const metro = runMetro();
  console.log(`\n동작구시의원 → ${metro.groups.reduce((a, g) => a + g.entries.length, 0)} candidates across ${metro.groups.length} districts`);
  for (const g of metro.groups) {
    console.log(`  ${g.district}:`);
    for (const c of g.entries) {
      console.log(
        `    ${c.number}. ${c.name} (${c.party}, ballot=${c.ballotMark ?? "?"}) · wealth=${c.declaration.wealthKrw ?? "?"}`
      );
    }
  }
}

main();
