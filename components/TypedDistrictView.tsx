import CompareMatrix, { entriesFor } from "./CompareMatrix";
import type { TypedOfficeBundle } from "@/lib/typed-data";
import type { District } from "@/lib/types";

type Crumb = { label: string; href?: string };

/** One 선거구 page — its candidates as a comparison matrix. */
export default function TypedDistrictView({
  district,
  typed,
  breadcrumbs,
}: {
  district: District;
  typed: TypedOfficeBundle;
  breadcrumbs: Crumb[];
}) {
  const entries = entriesFor(district.candidates, typed, district);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <nav className="text-xs text-muted mb-4 flex flex-wrap items-center gap-1.5">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {b.href ? <a href={b.href} className="hover:text-foreground">{b.label}</a> : <span>{b.label}</span>}
            {i < breadcrumbs.length - 1 && <span aria-hidden>›</span>}
          </span>
        ))}
      </nav>

      <header className="mb-7 pb-5 border-b border-border">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          {district.name} <span className="text-muted font-bold">— 비교</span>
        </h1>
        <div className="mt-2 text-sm text-muted">후보 {district.candidates.length}명</div>
      </header>

      <CompareMatrix entries={entries} />
    </div>
  );
}
