"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CandidateMark from "./CandidateMark";
import type { RegionLite, OfficeLite } from "@/lib/locality-index";

/**
 * Home as a *locality picker*, not a region dump. Pick a 광역(시·도) → see its
 * headline races (ballot order, 시장 first) + a grid of its 기초(자치구) that each
 * opens a "투표용지" page. Remembers the last locality (localStorage) and surfaces
 * it as a one-tap banner on return. Scales to N regions because only one region's
 * worth is ever on screen.
 */

const REMEMBER_KEY = "ev:locality";
type Remembered = { label: string; href: string };

function remember(label: string, href: string) {
  try {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({ label, href }));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

export default function LocalitySelector({ regions }: { regions: RegionLite[] }) {
  const [active, setActive] = useState(0);
  const [saved, setSaved] = useState<Remembered | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (raw) setSaved(JSON.parse(raw) as Remembered);
    } catch {
      /* ignore */
    }
  }, []);

  const region = regions[active] ?? regions[0];
  if (!region) return null;

  return (
    <div>
      {saved && (
        <Link
          href={saved.href}
          className="surface-card flex items-center gap-3 px-4 py-3 mb-8 border-l-4 border-l-foreground hover:border-foreground transition-colors group"
        >
          <span className="num text-[10px] uppercase tracking-widest text-muted font-bold">내 투표용지</span>
          <strong className="font-black tracking-tight">{saved.label}</strong>
          <span className="ml-auto num text-sm text-muted group-hover:text-foreground transition-colors">바로가기 →</span>
        </Link>
      )}

      <h2 className="text-xl lg:text-2xl font-black tracking-tight mb-1">어디서 투표하세요?</h2>
      <p className="text-sm text-muted mb-5">시·도를 고르면 그 지역 후보가 펼쳐집니다.</p>

      {/* 광역(시·도) 타일 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-12">
        {regions.map((r, i) => {
          const on = i === active;
          return (
            <button
              key={r.slug}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={on}
              className={`text-left p-3.5 rounded-sm border transition-all cursor-pointer ${
                on
                  ? "bg-foreground text-paper border-foreground"
                  : "surface-card hover:border-foreground hover:-translate-y-0.5"
              }`}
            >
              <div className={`num text-[10px] uppercase tracking-widest font-bold ${on ? "text-paper/60" : "text-muted"}`}>
                {r.localities.length > 0 ? `자치구 ${r.localities.length}` : `선거 ${r.offices.length}`}
              </div>
              <div className="font-black text-lg tracking-tight mt-0.5">{r.name}</div>
              <div className={`num text-[11px] mt-0.5 ${on ? "text-paper/60" : "text-muted"}`}>
                후보 {r.candidateTotal}명
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 광역 상세 */}
      <section>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b-2 border-foreground">
          <h3 className="text-lg lg:text-xl font-black tracking-tight">{region.name} 주요 선거</h3>
          <Link href={region.href} className="text-sm text-muted hover:text-foreground">전체 보기 →</Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {region.offices.map((o) => (
            <OfficeEntry key={o.href} office={o} />
          ))}
        </div>

        {region.localities.length > 0 && (
          <>
            <div className="flex items-baseline gap-2 mt-12 mb-4">
              <h3 className="text-lg lg:text-xl font-black tracking-tight">자치구</h3>
              <span className="text-sm text-muted">— 내 동네 투표용지</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {region.localities.map((loc) => {
                const races = loc.offices.filter((o) => !o.empty).length;
                return (
                  <Link
                    key={loc.slug}
                    href={loc.href}
                    onClick={() => remember(`${region.name} ${loc.name}`, loc.href)}
                    className={`surface-card p-3.5 transition-all ${
                      loc.empty ? "opacity-40 pointer-events-none" : "hover:border-foreground hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="font-bold text-base tracking-tight">{loc.name}</div>
                    <div className="num text-[11px] text-muted mt-0.5">
                      {loc.empty ? "자료 준비 중" : `투표 ${races}건`}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function OfficeEntry({ office }: { office: OfficeLite }) {
  const meta =
    office.districts > 0 ? `${office.districts}개 선거구` : `후보 ${office.candidates}명`;

  if (office.empty) {
    return (
      <div className="surface-card p-4 opacity-40">
        <div className="num text-[10px] uppercase tracking-widest text-muted font-bold">{office.kind}</div>
        <div className="font-black text-lg tracking-tight mt-0.5">{office.name}</div>
        <div className="num text-xs text-muted mt-1">자료 준비 중</div>
      </div>
    );
  }

  return (
    <Link
      href={office.href}
      className="surface-card p-4 block hover:border-foreground hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="num text-[10px] uppercase tracking-widest text-muted font-bold">{office.kind}</span>
        <span className="num text-[11px] text-muted">{meta}</span>
      </div>
      <div className="font-black text-lg tracking-tight mt-0.5">{office.name}</div>

      {office.marks.length > 0 ? (
        <div className="flex items-center gap-1.5 mt-3">
          {office.marks.map((m, i) => (
            <CandidateMark
              key={i}
              number={m.number}
              name={m.name}
              partyColor={m.partyColor}
              photo={m.photo}
              size={34}
            />
          ))}
          {office.candidates > office.marks.length && (
            <span className="num text-xs text-muted ml-0.5">+{office.candidates - office.marks.length}</span>
          )}
        </div>
      ) : (
        <div className="num text-xs text-muted mt-3">선거구별 후보 →</div>
      )}
    </Link>
  );
}
