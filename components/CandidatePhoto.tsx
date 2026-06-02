/**
 * Candidate portrait with party-color placeholder fallback.
 *
 * - `photo` (relative path under /public, e.g. "/photos/01.jpg") → render <img>.
 * - missing → render a circle filled with `partyColor` showing the ballot number.
 *
 * The Korean local election ballot relies on number + name recognition, so the
 * placeholder preserves the same visual primitive (party color + number) the user
 * sees on the official ballot sheet.
 */

type Size = "sm" | "md" | "lg";

const DIM_PX: Record<Size, number> = { sm: 32, md: 64, lg: 160 };
const NUM_FONT: Record<Size, string> = {
  sm: "text-xs",
  md: "text-xl",
  lg: "text-6xl",
};

export default function CandidatePhoto({
  number,
  name,
  partyColor,
  photo,
  size = "sm",
}: {
  number: number;
  name: string;
  partyColor: string;
  photo?: string;
  size?: Size;
}) {
  const px = DIM_PX[size];

  if (photo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={photo}
        alt={`${number}번 ${name}`}
        width={px}
        height={px}
        loading="lazy"
        className="rounded-full object-cover shrink-0"
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      className={`rounded-full text-white font-black inline-flex items-center justify-center tabular-nums shrink-0 ${NUM_FONT[size]}`}
      style={{ background: partyColor, width: px, height: px }}
      aria-label={`${number}번 ${name} (사진 없음)`}
    >
      {number}
    </span>
  );
}
