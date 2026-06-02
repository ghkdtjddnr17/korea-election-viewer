import type {
  CandidateHeader,
  Section,
  SourceLink,
  TruthSummary,
} from "./types";
import { TRUTH_EMOJI_MAP } from "./types";
import { PARTY_COLORS } from "./party-colors";

const PARTY_NAMES = new Set(Object.keys(PARTY_COLORS));

/**
 * Parse a candidate file's H1 header.
 *
 * Patterns seen in the data:
 *   # 기호 1번 정원오 (鄭愿伍) — 더불어민주당
 *   # 기호 1번 더불어민주당 — 서울시의원 비례대표
 *   # 김영배 — 서울시교육감 후보
 *   # 박준희 (朴俊熙) — 더불어민주당
 *   # 거지당 비례 명부
 */
export function parseCandidateHeader(line: string): CandidateHeader {
  const raw = line.replace(/^#\s*/, "").trim();
  const result: CandidateHeader = { raw, 이름: raw };

  // Split by em-dash variants, plus the pipe some 시의원 H1s use:
  //   "유용 | 동작구 제4선거구 서울시의원 후보"
  const parts = raw.split(/\s*[—–|-]\s*/);
  const main = parts[0];
  const tail = parts.slice(1).join(" — ").trim();

  // "기호 N번" (대부분 직책) OR "명부순 N번" (교육감 — no party-affiliated ballot number).
  const sym = main.match(/^(?:기호|명부순)\s*(\d+)번\s*(.+)$/);
  let rest = main;
  if (sym) {
    result.기호 = sym[1];
    rest = sym[2].trim();
  }

  // 한자 in parens — Hanja only
  const hanja = rest.match(/^(.+?)\s*\(([㐀-鿿　-〿]+)\)\s*$/);
  if (hanja) {
    result.이름 = hanja[1].trim();
    result.한자 = hanja[2].trim();
  } else {
    // Trailing parens that aren't pure Hanja. May carry "한자, 정당"
    // (e.g. "이민수 (李敏秀, 개혁신당)") — split into 한자 + 정당 when so.
    const stripped = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (stripped) {
      result.이름 = stripped[1].trim();
      const inner = stripped[2].trim();
      const combo = inner.match(/^([㐀-鿿　-〿]+)\s*,\s*(.+)$/);
      if (combo) {
        result.한자 = combo[1].trim();
        const maybeParty = combo[2].trim();
        if (
          PARTY_NAMES.has(maybeParty) ||
          (/(당|연합|혁신|힘|신당)$/.test(maybeParty) && !maybeParty.includes(" "))
        ) {
          result.정당 = maybeParty;
        } else {
          result.부제 = maybeParty;
        }
      } else {
        result.부제 = inner;
      }
    } else {
      result.이름 = rest.trim();
    }
  }

  if (tail) {
    // tail might be 정당명 or 부제 (e.g., "서울시교육감 후보")
    // First try ground truth from party-colors.ts (handles "국민의힘", "기본소득당" etc that don't
    // match the suffix heuristic). Then fall back to a generic Korean party-name suffix check.
    if (PARTY_NAMES.has(tail)) {
      result.정당 = tail;
    } else if (/(당|연합|혁신|힘|신당)$/.test(tail) && !tail.includes(" ") && tail.length <= 12) {
      result.정당 = tail;
    } else {
      result.부제 = result.부제 ? `${result.부제} · ${tail}` : tail;
    }
  }

  // ── Fallback extraction (경기 data) ──────────────────────────────────
  // 경기 headers embed 기호/정당 inside parens rather than a leading "기호 N번":
  //   "추미애 (기호 1, 더불어민주당) — 경기도지사"
  //   "채정선 — 경기도의원 양주시 제1선거구 (기호 1, 더불어민주당)"
  //   "경기도의원 비례대표 — 더불어민주당 (기호 1)"
  // Only fills fields the positional parse left empty, so existing patterns are untouched.
  if (!result.기호) {
    const m = raw.match(/기호\s*(\d+)/);
    if (m) result.기호 = m[1];
  }
  if (!result.정당) {
    // "이름 (기호 N, 정당)" or "정당 (기호 N)" — pull the party token by position/shape,
    // so off-palette minor parties (기독당·새미래민주당 등) are still recovered.
    const tagged = raw.match(/기호\s*\d+\s*[,·]\s*([가-힣A-Za-z]+)/);
    const leading = raw.match(/([가-힣]{2,}(?:당|연합|혁신|힘|신당))\s*\(\s*기호/);
    const cand = (tagged?.[1] || leading?.[1])?.trim();
    if (cand && (PARTY_NAMES.has(cand) || /(당|연합|혁신|힘|신당)$/.test(cand))) {
      result.정당 = cand;
    } else {
      // Fallback: any known party name appearing anywhere in the line.
      for (const p of PARTY_NAMES) {
        if (p !== "무소속" && p !== "기타" && raw.includes(p)) {
          result.정당 = p;
          break;
        }
      }
    }
  }
  // 비례 party files sometimes lead with the office label ("경기도의원 비례대표 — 정당");
  // the party is the real identity there, so prefer it as the display name.
  if (result.정당 && /비례/.test(result.이름)) {
    result.이름 = result.정당;
  }

  return result;
}

/**
 * Split a candidate file into sections.
 *
 * Section markers found in the data:
 *   ## 1. 인적 사항 (선관위 공식 명부 기준)
 *   ## §1. 정당 개요
 *   ## 출처
 *   ## 9-1. 표지 슬로건 (subsection, treated as part of parent)
 *
 * We split only on top-level ## headings. The first heading or higher level (###)
 * stays embedded in section.body.
 */
export function parseSections(raw: string): {
  headerLine: string;
  metaLines: string[];
  sections: Section[];
  sources: SourceLink[];
  sourcesRaw: string;
} {
  const lines = raw.split(/\r?\n/);
  let headerLine = "";
  let i = 0;
  // Find # heading
  while (i < lines.length && !/^#\s/.test(lines[i])) i++;
  if (i < lines.length) {
    headerLine = lines[i];
    i++;
  }

  // Capture meta lines (blockquotes etc) until first ## heading or non-blank non-quote
  const metaLines: string[] = [];
  while (i < lines.length && !/^##\s/.test(lines[i])) {
    const l = lines[i].trim();
    if (l.startsWith(">") || l.startsWith("---")) {
      metaLines.push(l.replace(/^>\s?/, ""));
    }
    i++;
  }

  // Now split remaining content by ## headings
  type RawSection = { heading: string; bodyLines: string[] };
  const rawSections: RawSection[] = [];
  let current: RawSection | null = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) {
      if (current) rawSections.push(current);
      current = { heading: line, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) rawSections.push(current);

  // Convert to Section[], extract sources section separately
  const sections: Section[] = [];
  let sourcesRaw = "";
  for (const s of rawSections) {
    const headingText = s.heading.replace(/^##\s*/, "").trim();
    if (/^출처$/.test(headingText) || /^Sources?$/i.test(headingText)) {
      sourcesRaw = s.bodyLines.join("\n").trim();
      continue;
    }
    sections.push(makeSection(s.heading, s.bodyLines.join("\n").trim()));
  }

  const sources = parseSources(sourcesRaw);

  return { headerLine, metaLines, sections, sources, sourcesRaw };
}

function makeSection(heading: string, body: string): Section {
  const headingText = heading.replace(/^##\s*/, "").trim();
  // Markers: "1.", "§1.", "끝" etc
  const numMatch = headingText.match(/^(?:§)?(\d+)\.\s*(.+)$/);
  if (numMatch) {
    return {
      no: parseInt(numMatch[1], 10),
      marker: numMatch[1],
      heading,
      title: numMatch[2].trim(),
      body,
    };
  }
  // "§1", "§2" form with no trailing period
  const symMatch = headingText.match(/^§(\d+)\s*\.?\s*(.*)$/);
  if (symMatch) {
    return {
      no: parseInt(symMatch[1], 10),
      marker: symMatch[1],
      heading,
      title: (symMatch[2] || "").trim() || headingText,
      body,
    };
  }
  return { no: null, marker: "", heading, title: headingText, body };
}

/**
 * Parse the "## 출처" section into structured source links.
 *
 * Format: `- [label] url` or `- label: url` or `- [label](url)`.
 */
export function parseSources(raw: string): SourceLink[] {
  if (!raw) return [];
  const links: SourceLink[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("-") && !trimmed.startsWith("*")) continue;
    const item = trimmed.replace(/^[-*]\s*/, "");

    // [text](url) style first
    const mdLink = item.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (mdLink) {
      const before = item.slice(0, item.indexOf("[")).trim();
      links.push({
        label: mdLink[1],
        url: mdLink[2],
        prefix: before ? before.replace(/[:\s]+$/, "") : undefined,
      });
      continue;
    }
    // "label: url" style
    const colon = item.match(/^(.+?):\s*(https?:\/\/\S+)/);
    if (colon) {
      links.push({ label: colon[1].trim(), url: colon[2].trim() });
      continue;
    }
    // Raw URL only
    const urlOnly = item.match(/^(https?:\/\/\S+)/);
    if (urlOnly) {
      links.push({ label: urlOnly[1], url: urlOnly[1] });
    }
  }
  return links;
}

/**
 * Count Truth-status emojis across a candidate's content.
 */
export function summarizeTruth(raw: string): TruthSummary {
  const counts: Record<string, number> = {
    red: 0,
    yellow: 0,
    orange: 0,
    black: 0,
    white: 0,
    blue: 0,
  };
  for (const ch of raw) {
    const key = TRUTH_EMOJI_MAP[ch];
    if (key) counts[key]++;
  }
  return {
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

/**
 * Extract all inline markdown links from a string, returning their URLs.
 * Used for data-completeness verification.
 */
export function extractInlineLinks(raw: string): string[] {
  const out: string[] = [];
  const re = /\[[^\]]+\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * Count number of `## ` top-level headings in raw markdown.
 */
export function countH2(raw: string): number {
  return (raw.match(/^##\s/gm) || []).length;
}

/**
 * Slugify a candidate filename: "01-정원오.md" → "01-정원오"
 */
export function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}
