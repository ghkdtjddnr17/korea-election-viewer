export const PARTY_COLORS: Record<string, { bg: string; text: string }> = {
  "더불어민주당": { bg: "#152484", text: "#ffffff" },
  "국민의힘": { bg: "#E61E2B", text: "#ffffff" },
  "조국혁신당": { bg: "#06275E", text: "#ffffff" },
  "개혁신당": { bg: "#FF7920", text: "#ffffff" },
  "진보당": { bg: "#D6001C", text: "#ffffff" },
  "기본소득당": { bg: "#00D2C3", text: "#0a0a0a" },
  "사회민주당": { bg: "#43B02A", text: "#ffffff" },
  "정의당": { bg: "#FFCC00", text: "#0a0a0a" },
  "여성의당": { bg: "#A5006D", text: "#ffffff" },
  "자유통일당": { bg: "#1F4E8C", text: "#ffffff" },
  "공화당": { bg: "#3E2723", text: "#ffffff" },
  "국민대통합당": { bg: "#1A237E", text: "#ffffff" },
  "국민연합": { bg: "#1565C0", text: "#ffffff" },
  "대한국민당": { bg: "#0D47A1", text: "#ffffff" },
  "자유와혁신": { bg: "#558B2F", text: "#ffffff" },
  "친미연합": { bg: "#1E40AF", text: "#ffffff" },
  "한국독립당": { bg: "#0F172A", text: "#ffffff" },
  "한나라당": { bg: "#0033A0", text: "#ffffff" },
  "거지당": { bg: "#78350F", text: "#ffffff" },
  "노동당": { bg: "#E5007D", text: "#ffffff" },
  "기독당": { bg: "#2D5BA0", text: "#ffffff" },
  "새미래민주당": { bg: "#00A99D", text: "#ffffff" },
  "국민당": { bg: "#E67E22", text: "#ffffff" },
  "미래연대": { bg: "#6B4E9E", text: "#ffffff" },
  "무소속": { bg: "#52525B", text: "#ffffff" },
  "기타": { bg: "#52525B", text: "#ffffff" },
};

export function getPartyColor(party?: string): { bg: string; text: string } {
  if (!party) return PARTY_COLORS["무소속"];
  if (PARTY_COLORS[party]) return PARTY_COLORS[party];
  for (const key of Object.keys(PARTY_COLORS)) {
    if (party.includes(key)) return PARTY_COLORS[key];
  }
  return PARTY_COLORS["기타"];
}
