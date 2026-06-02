export type ElectionData = {
  meta: { electionDate: string; lastBuilt: string; rootPath: string };
  playbook: MetaFile | null;
  memo: MetaFile | null;
  regions: Region[];
};

export type MetaFile = {
  filename: string;
  raw: string;
  lastModified: string;
};

export type Region = {
  slug: string;
  urlSlug: string;
  name: string;
  href: string;
  offices: Office[];
  subregions: SubRegion[];
};

export type SubRegion = {
  slug: string;
  urlSlug: string;
  name: string;
  href: string;
  offices: Office[];
};

export type OfficeKind =
  | "광역단체장"
  | "교육감"
  | "광역의원비례"
  | "기초단체장"
  | "기초의원지역구"
  | "기초의원비례"
  | "광역의원지역구"
  | "기타";

export type Office = {
  slug: string;
  urlSlug: string;
  name: string;
  kind: OfficeKind;
  hierarchy: string[];
  href: string;
  index: MetaFile | null;
  matrix: MetaFile | null;
  candidates: Candidate[];
  districts: District[];
  extras: MetaFile[];
};

export type District = {
  slug: string;
  urlSlug: string;
  name: string;
  href: string;
  index: MetaFile | null;
  matrix: MetaFile | null;
  candidates: Candidate[];
  extras: MetaFile[];
};

export type Candidate = {
  slug: string;
  urlSlug: string;
  filename: string;
  href: string;
  hierarchy: string[];
  header: CandidateHeader;
  metaLines: string[];
  sections: Section[];
  sources: SourceLink[];
  sourcesRaw: string;
  raw: string;
  lastModified: string;
  truthSummary: TruthSummary;
  photo?: string;
};

export type CandidateHeader = {
  raw: string;
  기호?: string;
  이름: string;
  한자?: string;
  정당?: string;
  부제?: string;
};

export type Section = {
  no: number | null;
  marker: string;
  heading: string;
  title: string;
  body: string;
};

export type SourceLink = {
  label: string;
  url: string;
  prefix?: string;
};

export type TruthSummary = {
  counts: Record<string, number>;
  total: number;
};

export const TRUTH_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  red: { emoji: "🔴", label: "사실 확인", color: "#dc2626" },
  yellow: { emoji: "🟡", label: "의혹(미해명)", color: "#ca8a04" },
  orange: { emoji: "🟠", label: "양측 충돌", color: "#ea580c" },
  black: { emoji: "⚫", label: "허위·해명 완료", color: "#404040" },
  white: { emoji: "⚪", label: "판단 보류", color: "#a3a3a3" },
  blue: { emoji: "🔵", label: "검증결과", color: "#2563eb" },
};

export const TRUTH_EMOJI_MAP: Record<string, keyof typeof TRUTH_LABELS> = {
  "🔴": "red",
  "🟡": "yellow",
  "🟠": "orange",
  "⚫": "black",
  "⚪": "white",
  "🔵": "blue",
};
