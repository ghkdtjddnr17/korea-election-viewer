/**
 * Typed schema for 서울시장 candidate data.
 *
 * Keys are English (standard JS/TS convention). Korean labels live in the UI layer —
 * see `MAYOR_FIELD_LABELS` below for a central display-name map.
 */

/** Military service status. Korean labels are looked up via `MILITARY_LABELS`. */
export type MilitaryStatus = "served" | "exempt" | "not_applicable" | "unknown";

export const MILITARY_LABELS: Record<MilitaryStatus, string> = {
  served: "필",
  exempt: "미필",
  not_applicable: "해당없음",
  unknown: "미상",
};

export type MayorCandidate = {
  /** Ballot number (선거 기호). 결번 candidates are not represented here. */
  number: number;
  name: string;
  hanja?: string;
  party: string;
  /** Mirrored from lib/party-colors so consumers receive color without a second lookup. */
  partyColor: string;
  filename: string;
  lastModified: string; // ISO

  meta: {
    election: string; // "2026 제9회 지방선거 · 서울특별시장 후보"
    primarySource?: string;
    notes: string[]; // > blockquote lines
  };

  /** §1. 인적 사항 (선관위 공식 명부) */
  personalInfo: {
    birthDate?: string;
    age?: number;
    gender?: string;
    address?: string;
    occupation?: string;
    birthplace?: string;
    family?: string;
    /** Catch-all for table rows the typed parser didn't claim (e.g. "기호 / 정당"). */
    other: Record<string, string>;
  };

  /** §2. 학력 */
  education: string[];

  /** §3. 주요 경력 (연도 prefix 보존) */
  career: string[];

  /** §4. 신고 사항 (재산·납세·전과·병역·입후보) */
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

  /** §5. 핵심 공약 (5대) */
  pledges: { number: number; title: string; description: string }[];

  /** §14. 의혹·검증 — Truth-status emoji counts over the full document. */
  truthSummary: {
    red: number;
    yellow: number;
    orange: number;
    black: number;
    white: number;
    blue: number;
    total: number;
  };

  /**
   * Sections kept as raw markdown for lossless render via react-markdown.
   * Key shape: "06-지지율", "07-전체공약" ... (zero-padded section number + Korean title).
   */
  rawSections: Record<string, { title: string; body: string; no: number | null }>;

  sources: { label: string; url: string; prefix?: string }[];
  sourcesRaw: string;
};

/**
 * Lightweight index for the office page (인덱스 파일).
 * Holds just enough to render candidate cards + index-level prose
 * (지지율 마지막 등록조사, 판세 요약) without loading any candidate JSON.
 */
export type MayorIndex = {
  office: "서울특별시장";
  electionDate: string;
  lastModified: string;
  primarySource: string;
  /** Roster table + prelude at the top of the index file, before any ## heading. */
  rosterRaw: string;
  /** Each ## section in the index file, preserved as raw markdown. */
  rawSections: { title: string; body: string }[];
  candidates: MayorIndexEntry[];
  sources: { label: string; url: string; prefix?: string }[];
};

export type MayorIndexEntry = {
  /**
   * Ballot number. `null` means the slot is registered (e.g. 통일기호 결번 3번) but
   * no candidate was filed. Use `running` to distinguish.
   */
  number: number | null;
  name: string;
  party: string;
  partyColor: string;
  href: string; // e.g. /seoul/mayor/1 — falsy when !running
  running: boolean;
  /** Path under /public when a portrait was downloaded (see scripts/fetch-photos.ts). */
  photo?: string;
  /** Mirror of MayorCandidate.declaration for card-level QuickStats. */
  wealth?: string;
  criminalCount?: number;
  militaryStatus?: MilitaryStatus;
  truthSummary?: {
    red: number;
    yellow: number;
    orange: number;
    black: number;
    white: number;
    blue: number;
  };
};

/** 비교매트릭스 — raw passthrough; deeper structuring will land in a follow-up. */
export type MayorMatrix = {
  office: "서울특별시장";
  raw: string;
  lastModified: string;
};

/**
 * Display-name map. Keep UI-facing Korean labels here so components can pull a single
 * source of truth instead of hard-coding labels per page.
 */
export const MAYOR_FIELD_LABELS = {
  number: "기호",
  name: "이름",
  hanja: "한자",
  party: "정당",

  // personalInfo
  birthDate: "생년월일",
  age: "나이",
  gender: "성별",
  address: "신고 주소",
  occupation: "직업",
  birthplace: "출생지",
  family: "가족",

  // declaration
  wealth: "재산",
  taxPaid: "납세",
  taxArrears: "체납액",
  criminalRecord: "전과",
  military: "병역",
  candidacyCount: "입후보 횟수",

  // sections
  personalInfo: "인적 사항",
  education: "학력",
  career: "주요 경력",
  declaration: "신고 사항",
  pledges: "핵심 공약",
  truthSummary: "의혹·검증",
} as const;
