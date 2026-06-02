/**
 * Candidate identity mark — the avatar primitive for the whole site (Compare × Mark).
 *
 * - With `photo` → the portrait, cropped into the rounded tile.
 * - Without    → a clean party-color tile carrying just the ballot numeral.
 *
 * The number stays centered and unobstructed; its ink flips to dark on light party
 * colors (e.g. 정의당 yellow, 기본소득당 teal) so it always reads.
 */

/** White on dark party colors, near-black on light ones (per-channel luminance). */
function contrastInk(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return "#ffffff";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#18181b" : "#ffffff";
}

export default function CandidateMark({
  number,
  name,
  partyColor,
  photo,
  size = 48,
  radius,
}: {
  number: number;
  name?: string;
  partyColor: string;
  photo?: string;
  size?: number;
  /** Override border-radius in px (defaults to ~26% of size). */
  radius?: number;
}) {
  const label = name ? `${number}번 ${name}` : `기호 ${number}`;
  const borderRadius = radius ?? Math.round(size * 0.26);
  const style: React.CSSProperties = {
    width: size,
    height: size,
    background: partyColor,
    borderRadius,
  };

  if (photo) {
    return (
      <span className="id-mark" style={style} aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={label} loading="lazy" />
      </span>
    );
  }

  // Shrink the numeral for 2+ digits so it never overflows the tile.
  const digits = String(Math.max(0, number)).length;
  const fontSize = Math.round(size * (digits >= 2 ? 0.4 : 0.52));

  return (
    <span
      className="id-mark"
      style={{ ...style, color: contrastInk(partyColor), fontSize }}
      role="img"
      aria-label={`${label} (사진 없음)`}
    >
      <span className="num">{number}</span>
    </span>
  );
}
