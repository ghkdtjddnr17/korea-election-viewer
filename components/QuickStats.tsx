import type { Candidate } from "@/lib/types";

type Stat = { label: string; value: string };

/** Strip inline markdown + emoji so a raw table cell renders as clean text. */
function cleanInline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold** -> bold
    .replace(/[*_`]/g, "") // stray emphasis / code marks
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}]/gu, "") // emoji/symbols
    .replace(/\s+/g, " ")
    .trim();
}

/** Dashboard wants a concise value: drop em-dash side-notes and long trailing "(…)" notes. */
function compactStat(s: string): string {
  const v = cleanInline(s).split(/\s+[—–]\s+/)[0].trim(); // text before " — annotation"
  return v.replace(/\s*\([^)]{13,}\)\s*$/, "").trim(); // drop long trailing "(…)", keep short ones
}

function extractFromTable(body: string, key: string): string | null {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 3) continue;
    if (cells[1].includes(key) || cells[1].replace(/\s/g, "").includes(key.replace(/\s/g, ""))) {
      return compactStat(cells[2] || "") || null;
    }
  }
  return null;
}

export default function QuickStats({ candidate }: { candidate: Candidate }) {
  const personal = candidate.sections.find((s) => s.no === 1);
  const decl = candidate.sections.find((s) => s.no === 4);

  const stats: Stat[] = [];
  if (personal) {
    const dob = extractFromTable(personal.body, "생년월일");
    if (dob) stats.push({ label: "생년월일·나이", value: dob });
    const job = extractFromTable(personal.body, "직업");
    if (job) stats.push({ label: "직업", value: job });
  }
  if (decl) {
    const wealth = extractFromTable(decl.body, "재산");
    if (wealth) stats.push({ label: "재산", value: wealth });
    const crim = extractFromTable(decl.body, "전과");
    if (crim) stats.push({ label: "전과", value: crim });
    const mil = extractFromTable(decl.body, "병역");
    if (mil) stats.push({ label: "병역", value: mil });
    const runs = extractFromTable(decl.body, "입후보");
    if (runs) stats.push({ label: "입후보", value: runs });
  }

  if (stats.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
      {stats.map((s, i) => (
        <div
          key={i}
          className="bg-paper border border-border rounded-sm p-3"
        >
          <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            {s.label}
          </dt>
          <dd className="text-sm font-bold tracking-tight mt-1 leading-snug line-clamp-2">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
