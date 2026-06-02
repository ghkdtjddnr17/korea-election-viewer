/**
 * Maps Korean folder/file names to URL-safe Latin slugs.
 * Next.js 16 (Turbopack) has issues matching non-ASCII catch-all params, so
 * URLs use these aliases. UI still displays the original Korean names from the
 * JSON data.
 */

import type { OfficeKind } from "./types";

export const REGION_URL: Record<string, string> = {
  서울특별시: "seoul",
  부산광역시: "busan",
  대구광역시: "daegu",
  인천광역시: "incheon",
  광주광역시: "gwangju",
  대전광역시: "daejeon",
  울산광역시: "ulsan",
  세종특별자치시: "sejong",
  경기도: "gyeonggi",
  강원특별자치도: "gangwon",
  충청북도: "chungbuk",
  충청남도: "chungnam",
  전북특별자치도: "jeonbuk",
  전라남도: "jeonnam",
  경상북도: "gyeongbuk",
  경상남도: "gyeongnam",
  제주특별자치도: "jeju",
};

export const SUBREGION_URL: Record<string, string> = {
  관악구: "gwanak",
  동작구: "dongjak",
  양주시: "yangju",
  강남구: "gangnam",
  강동구: "gangdong",
  강북구: "gangbuk",
  강서구: "gangseo",
  광진구: "gwangjin",
  구로구: "guro",
  금천구: "geumcheon",
  노원구: "nowon",
  도봉구: "dobong",
  동대문구: "dongdaemun",
  마포구: "mapo",
  서대문구: "seodaemun",
  서초구: "seocho",
  성동구: "seongdong",
  성북구: "seongbuk",
  송파구: "songpa",
  양천구: "yangcheon",
  영등포구: "yeongdeungpo",
  용산구: "yongsan",
  은평구: "eunpyeong",
  종로구: "jongno",
  중구: "junggu",
  중랑구: "jungnang",
};

// District slugs (선거구 names use Korean alphabet)
const DISTRICT_ALPHABET: Record<string, string> = {
  가: "1-ga", 나: "2-na", 다: "3-da", 라: "4-ra",
  마: "5-ma", 바: "6-ba", 사: "7-sa", 아: "8-a",
  자: "9-ja", 차: "10-cha",
};

// Some offices nest 자치구·군 as their districts (e.g. 인천시의원지역구 → 검단구).
// These names aren't 선거구 nor 제N — map them to ASCII to avoid Korean URL segments.
const GU_DISTRICT: Record<string, string> = {
  강화군: "ganghwa", 검단구: "geomdan", 계양구: "gyeyang", 남동구: "namdong",
  미추홀구: "michuhol", 부평구: "bupyeong", 서구: "seo", 연수구: "yeonsu",
  영종구: "yeongjong", 옹진군: "ongjin", 제물포구: "jemulpo",
};

/**
 * "가선거구" → "1-ga", "제3-공우석" → "3"
 * Falls back to lowercased original or numeric prefix.
 */
export function districtSlug(name: string): string {
  if (name.endsWith("선거구") && name.length === 4) {
    const head = name[0];
    return DISTRICT_ALPHABET[head] ?? `d-${head.charCodeAt(0)}`;
  }
  // "제N-이름" or "제N선거구"
  const m = name.match(/^제(\d+)/);
  if (m) return m[1];
  if (GU_DISTRICT[name]) return GU_DISTRICT[name];
  return name.toLowerCase();
}

/**
 * Office slug, derived from the resolved OfficeKind so the same race always gets the
 * same token regardless of naming:
 *   서울시장 · 인천시장 · 경기도지사   → mayor   (광역단체장)
 *   관악구청장 · 양주시장              → head    (기초단체장)
 *   관악구시의원 · 양주도의원          → metro   (광역의원지역구)
 *   관악구의원 · 양주시의원            → council (기초의원지역구)
 * 비례 shares "council-pr" — only one 비례 exists per scope, so no collision.
 */
export function officeSlug(officeName: string, kind: OfficeKind): string {
  switch (kind) {
    case "광역단체장":
      return "mayor";
    case "기초단체장":
      return "head";
    case "교육감":
      return "edu";
    case "광역의원지역구":
      return "metro";
    case "기초의원지역구":
      return "council";
    case "광역의원비례":
    case "기초의원비례":
      return "council-pr";
    default:
      return slugify(officeName);
  }
}

/**
 * Candidate slug: "01-정원오" → "01-jeong-won-oh"? Or just "01"?
 * We keep the numeric prefix for sort and unique-ness, drop the name.
 * "01-정원오" → "01"
 * "03-제3-임만균" → "03"
 */
export function candidateSlug(filename: string): string {
  const base = filename.replace(/\.md$/, "");
  const m = base.match(/^(\d+)/);
  return m ? m[1] : slugify(base);
}

export function regionSlug(name: string): string {
  return REGION_URL[name] ?? slugify(name);
}

export function subregionSlug(name: string): string {
  return SUBREGION_URL[name] ?? slugify(name);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
