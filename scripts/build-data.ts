import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import {
  parseCandidateHeader,
  parseSections,
  summarizeTruth,
  slugFromFilename,
  countH2,
  extractInlineLinks,
} from "../lib/parsers";
import {
  candidateSlug,
  districtSlug,
  officeSlug,
  regionSlug,
  subregionSlug,
} from "../lib/slug-map";
import { necPhoto } from "./nec-photos";
import type {
  Candidate,
  CandidateHeader,
  District,
  ElectionData,
  MetaFile,
  Office,
  OfficeKind,
  Region,
  SubRegion,
} from "../lib/types";

const SOURCE_ROOT =
  process.env.ELECTION_SRC ||
  path.resolve(
    process.env.HOME || "",
    "Documents/markdown_manager/files/markdown/2026-지방선거"
  );
const OUTPUT_FILE = path.resolve(__dirname, "..", "data/elections.json");
const VERIFY_LOG = path.resolve(__dirname, "..", "data/verify.json");

const SUBREGION_RE = /(시|군|구)$/;
const DISTRICT_RE = /선거구$/;

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
function listDir(p: string): string[] {
  if (!isDir(p)) return [];
  return fs
    .readdirSync(p)
    .filter((f) => !f.startsWith("."))
    .map((f) => f.normalize("NFC"));
}
function readFile(p: string): { raw: string; mtime: string } {
  const stat = fs.statSync(p);
  return {
    raw: fs.readFileSync(p, "utf8").normalize("NFC"),
    mtime: stat.mtime.toISOString(),
  };
}

/**
 * Office kind is tier-sensitive: the same word means different levels depending on
 * whether the region is a 광역시 or a 도, and whether the office sits under a 기초 subregion.
 *   - 도(province): 도지사=광역단체장, 도의원=광역의원, 시의원/군의원=기초의원
 *   - 광역시: 시장=광역단체장, 시의원=광역의원; 자치구 아래 구의원=기초의원
 */
function inferOfficeKind(
  name: string,
  regionName: string,
  underSubregion: boolean
): OfficeKind {
  const province = /도$/.test(regionName);
  if (name.endsWith("교육감")) return "교육감";
  if (name.includes("비례")) {
    if (name.includes("도의원")) return "광역의원비례";
    if (name.includes("시의원") || name.includes("구의원") || name.includes("군의원"))
      return underSubregion ? "기초의원비례" : "광역의원비례";
    return "광역의원비례";
  }
  if (name.endsWith("구청장") || name.endsWith("군수")) return "기초단체장";
  if (name.endsWith("도지사")) return "광역단체장";
  if (name.endsWith("시장")) return underSubregion ? "기초단체장" : "광역단체장";
  if (name.includes("도의원")) return "광역의원지역구";
  if (name.includes("시의원")) return province ? "기초의원지역구" : "광역의원지역구";
  if (name.endsWith("구의원") || name.endsWith("군의원")) return "기초의원지역구";
  return "기타";
}

function isCandidateFile(name: string): boolean {
  if (!name.endsWith(".md")) return false;
  if (name.startsWith("00")) return false;
  if (name.startsWith("_")) return false;
  return /^\d{2}/.test(name);
}
function isIndexFile(name: string): boolean {
  return /^00.*인덱스.*\.md$/.test(name);
}
function isMatrixFile(name: string): boolean {
  return /^00.*(비교매트릭스|매트릭스).*\.md$/.test(name);
}

/**
 * Some candidate files (e.g. 양주시의원) carry a YAML frontmatter block whose fields
 * are the authoritative identity — the H1 may omit 기호/정당. When present, frontmatter
 * overrides the positional H1 parse. Files without frontmatter (서울/인천 등) are
 * unaffected: gray-matter returns an empty data object.
 */
function applyFrontmatter(header: CandidateHeader, raw: string): void {
  let data: Record<string, unknown>;
  try {
    data = matter(raw).data as Record<string, unknown>;
  } catch {
    return; // malformed YAML — keep the H1 parse
  }
  const str = (v: unknown): string | undefined =>
    typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : undefined;
  const name = str(data["성명"]);
  // 정당 can be verbose ("무소속 (전 국민의힘 — 탈당)") — keep only the bare party name,
  // else getPartyColor's substring match would paint a 무소속 candidate with 국민의힘 red.
  const party = str(data["정당"])?.split(/\s*\(/)[0].trim();
  const hanja = str(data["한자"]);
  const sym = str(data["기호"]);
  if (name) header.이름 = name;
  if (party) header.정당 = party;
  if (hanja) header.한자 = hanja;
  if (sym) header.기호 = sym;
}

function buildCandidate(
  filePath: string,
  hierarchy: string[],
  hrefBase: string
): Candidate {
  const filename = path.basename(filePath);
  const { raw, mtime } = readFile(filePath);
  const { headerLine, metaLines, sections, sources, sourcesRaw } =
    parseSections(raw);
  const header = parseCandidateHeader(headerLine);
  applyFrontmatter(header, raw);
  const slug = slugFromFilename(filename);
  const urlSlug = candidateSlug(filename);
  const signNum = parseInt((header.기호 ?? "").replace(/[^\d]/g, "") || "0", 10);
  const photo = necPhoto(regionSlug(hierarchy[0] ?? ""), header.이름, signNum);
  return {
    slug,
    urlSlug,
    filename,
    href: `${hrefBase}/${urlSlug}`,
    hierarchy,
    header,
    metaLines,
    sections,
    sources,
    sourcesRaw,
    raw,
    lastModified: mtime,
    truthSummary: summarizeTruth(raw),
    photo,
  };
}

function buildOfficeFromDir(
  officeDir: string,
  officeName: string,
  hierarchy: string[],
  hrefBase: string
): Office {
  const entries = listDir(officeDir);
  const regionName = hierarchy[0] ?? "";
  const underSubregion = hierarchy.length >= 2;
  const kind = inferOfficeKind(officeName, regionName, underSubregion);
  const urlSlug = officeSlug(officeName, kind);
  const href = `${hrefBase}/${urlSlug}`;

  let index: MetaFile | null = null;
  let matrix: MetaFile | null = null;
  const extras: MetaFile[] = [];
  const candidates: Candidate[] = [];
  const districts: District[] = [];

  for (const entry of entries) {
    const entryPath = path.join(officeDir, entry);
    if (isDir(entryPath)) {
      const dCandidates: Candidate[] = [];
      const dExtras: MetaFile[] = [];
      let dIndex: MetaFile | null = null;
      let dMatrix: MetaFile | null = null;
      const dUrlSlug = districtSlug(entry);
      const dHref = `${href}/${dUrlSlug}`;

      for (const dEntry of listDir(entryPath)) {
        const dPath = path.join(entryPath, dEntry);
        if (isDir(dPath)) continue;
        if (isCandidateFile(dEntry)) {
          dCandidates.push(
            buildCandidate(dPath, [...hierarchy, officeName, entry], dHref)
          );
        } else if (isIndexFile(dEntry)) {
          const { raw, mtime } = readFile(dPath);
          dIndex = { filename: dEntry, raw, lastModified: mtime };
        } else if (isMatrixFile(dEntry)) {
          const { raw, mtime } = readFile(dPath);
          dMatrix = { filename: dEntry, raw, lastModified: mtime };
        } else if (dEntry.endsWith(".md")) {
          const { raw, mtime } = readFile(dPath);
          dExtras.push({ filename: dEntry, raw, lastModified: mtime });
        }
      }
      districts.push({
        slug: entry,
        urlSlug: dUrlSlug,
        name: entry,
        href: dHref,
        index: dIndex,
        matrix: dMatrix,
        candidates: dCandidates.sort((a, b) =>
          a.filename.localeCompare(b.filename)
        ),
        extras: dExtras,
      });
      continue;
    }
    if (isCandidateFile(entry)) {
      candidates.push(
        buildCandidate(entryPath, [...hierarchy, officeName], href)
      );
    } else if (isIndexFile(entry)) {
      const { raw, mtime } = readFile(entryPath);
      index = { filename: entry, raw, lastModified: mtime };
    } else if (isMatrixFile(entry)) {
      const { raw, mtime } = readFile(entryPath);
      matrix = { filename: entry, raw, lastModified: mtime };
    } else if (entry.endsWith(".md")) {
      const { raw, mtime } = readFile(entryPath);
      extras.push({ filename: entry, raw, lastModified: mtime });
    }
  }

  candidates.sort((a, b) => a.filename.localeCompare(b.filename));
  districts.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return {
    slug: officeName,
    urlSlug,
    name: officeName,
    kind,
    hierarchy: [...hierarchy, officeName],
    href,
    index,
    matrix,
    candidates,
    districts,
    extras,
  };
}

function build(): ElectionData {
  const playbook = ((): MetaFile | null => {
    const p = path.join(SOURCE_ROOT, "_플레이북.md");
    if (!fs.existsSync(p)) return null;
    const { raw, mtime } = readFile(p);
    return { filename: "_플레이북.md", raw, lastModified: mtime };
  })();
  const memo = ((): MetaFile | null => {
    const p = path.join(SOURCE_ROOT, "2026-지방선거-메모.md");
    if (!fs.existsSync(p)) return null;
    const { raw, mtime } = readFile(p);
    return { filename: "2026-지방선거-메모.md", raw, lastModified: mtime };
  })();

  // Optional allowlist: ELECTION_REGIONS="서울특별시,인천광역시" restricts the scan.
  // Unset → all regions (default). Lets us ship one region at a time while another
  // region's folder structure (e.g. 인천 지역구) isn't slug-mapped yet.
  const regionFilter = process.env.ELECTION_REGIONS
    ? new Set(
        process.env.ELECTION_REGIONS.split(",")
          .map((s) => s.trim().normalize("NFC"))
          .filter(Boolean)
      )
    : null;

  const regions: Region[] = [];
  for (const regionName of listDir(SOURCE_ROOT)) {
    if (regionFilter && !regionFilter.has(regionName)) continue;
    const regionDir = path.join(SOURCE_ROOT, regionName);
    if (!isDir(regionDir)) continue;
    const regionUrlSlug = regionSlug(regionName);
    const regionHref = `/${regionUrlSlug}`;

    const offices: Office[] = [];
    const subregions: SubRegion[] = [];

    for (const entry of listDir(regionDir)) {
      const entryPath = path.join(regionDir, entry);
      if (!isDir(entryPath)) continue;
      const inner = listDir(entryPath);
      const hasMdCandidates = inner.some(
        (i) => isCandidateFile(i) || isIndexFile(i) || isMatrixFile(i)
      );
      const innerDirs = inner.filter((i) => isDir(path.join(entryPath, i)));
      const innerDirsAllDistricts =
        innerDirs.length > 0 && innerDirs.every((i) => DISTRICT_RE.test(i));
      const looksLikeSubregion =
        SUBREGION_RE.test(entry) &&
        !hasMdCandidates &&
        !innerDirsAllDistricts &&
        innerDirs.length > 0;

      if (looksLikeSubregion) {
        const srUrlSlug = subregionSlug(entry);
        const subHref = `${regionHref}/${srUrlSlug}`;
        const subOffices: Office[] = [];
        for (const sub of listDir(entryPath)) {
          const subPath = path.join(entryPath, sub);
          if (!isDir(subPath)) continue;
          subOffices.push(
            buildOfficeFromDir(subPath, sub, [regionName, entry], subHref)
          );
        }
        subregions.push({
          slug: entry,
          urlSlug: srUrlSlug,
          name: entry,
          href: subHref,
          offices: subOffices,
        });
      } else {
        offices.push(
          buildOfficeFromDir(entryPath, entry, [regionName], regionHref)
        );
      }
    }

    regions.push({
      slug: regionName,
      urlSlug: regionUrlSlug,
      name: regionName,
      href: regionHref,
      offices,
      subregions,
    });
  }

  return {
    meta: {
      electionDate: "2026-06-03",
      lastBuilt: new Date().toISOString(),
      rootPath: SOURCE_ROOT,
    },
    playbook,
    memo,
    regions,
  };
}

function verify(data: ElectionData) {
  let totalCandidates = 0;
  let totalH2Source = 0;
  let totalSectionsCaptured = 0;
  let totalLinksSource = 0;
  let totalLinksCaptured = 0;
  const issues: string[] = [];

  const visit = (c: Candidate) => {
    totalCandidates++;
    const srcH2 = countH2(c.raw);
    const capturedH2 = c.sections.length + (c.sourcesRaw ? 1 : 0);
    totalH2Source += srcH2;
    totalSectionsCaptured += capturedH2;
    if (capturedH2 < srcH2) {
      issues.push(
        `${c.hierarchy.join("/")}/${c.filename}: captured ${capturedH2}/${srcH2} ## sections`
      );
    }
    const srcLinks = extractInlineLinks(c.raw).length;
    const capturedLinks =
      c.sources.length +
      c.sections.reduce(
        (acc, s) => acc + extractInlineLinks(s.body).length,
        0
      ) +
      extractInlineLinks(c.metaLines.join("\n")).length;
    totalLinksSource += srcLinks;
    totalLinksCaptured += capturedLinks;
  };
  for (const r of data.regions) {
    for (const o of r.offices) {
      for (const c of o.candidates) visit(c);
      for (const d of o.districts) for (const c of d.candidates) visit(c);
    }
    for (const sr of r.subregions) {
      for (const o of sr.offices) {
        for (const c of o.candidates) visit(c);
        for (const d of o.districts) for (const c of d.candidates) visit(c);
      }
    }
  }

  return {
    totalCandidates,
    totalH2Source,
    totalSectionsCaptured,
    sectionLoss: totalH2Source - totalSectionsCaptured,
    totalLinksSource,
    totalLinksCaptured,
    linkLoss: totalLinksSource - totalLinksCaptured,
    issues,
  };
}

function main() {
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error("Source root not found:", SOURCE_ROOT);
    process.exit(1);
  }
  console.log("Building from:", SOURCE_ROOT);
  const data = build();
  const verifyReport = verify(data);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 0));
  fs.writeFileSync(VERIFY_LOG, JSON.stringify(verifyReport, null, 2));

  const officeCount = data.regions.reduce(
    (a, r) =>
      a + r.offices.length + r.subregions.reduce((b, sr) => b + sr.offices.length, 0),
    0
  );
  console.log(
    `\nWrote ${OUTPUT_FILE}\n  regions: ${data.regions.length}\n  offices: ${officeCount}\n  candidates: ${verifyReport.totalCandidates}\n  ## sections captured: ${verifyReport.totalSectionsCaptured}/${verifyReport.totalH2Source}\n  inline links captured: ${verifyReport.totalLinksCaptured}/${verifyReport.totalLinksSource}\n  issues: ${verifyReport.issues.length}`
  );
  if (verifyReport.issues.length > 0) {
    console.log("\nFirst 10 issues:");
    for (const i of verifyReport.issues.slice(0, 10)) console.log("  -", i);
  }
}

main();
