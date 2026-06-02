"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RegionLite } from "@/lib/locality-index";

/**
 * Header "내 지역" switcher — hop to any region or locality without going home, and
 * remember the choice (localStorage) so the home banner can offer one-tap return.
 * The button label reflects the remembered locality once mounted.
 */

const REMEMBER_KEY = "ev:locality";
type Remembered = { label: string; href: string };

export default function RegionSwitcher({ regions }: { regions: RegionLite[] }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Remembered | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (raw) setSaved(JSON.parse(raw) as Remembered);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (label: string, href: string) => {
    try {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ label, href }));
    } catch {
      /* ignore */
    }
    setSaved({ label, href });
    setOpen(false);
  };

  if (regions.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-background cursor-pointer max-w-[44vw] sm:max-w-none"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0 text-muted">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="font-bold truncate">{saved ? saved.label : "내 지역 선택"}</span>
        <span className="text-muted shrink-0" aria-hidden>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 max-h-[70vh] overflow-auto bg-paper border border-border rounded-xl shadow-pop p-2 z-40"
        >
          {regions.map((r) => (
            <div key={r.slug} className="py-0.5">
              <Link
                href={r.href}
                onClick={() => pick(r.name, r.href)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg font-black tracking-tight hover:bg-background"
              >
                {r.name}
                <span className="num text-[11px] text-muted font-normal">후보 {r.candidateTotal}</span>
              </Link>
              {r.localities.length > 0 && (
                <div className="mt-0.5 mb-1 grid grid-cols-2 gap-0.5">
                  {r.localities.map((loc) => (
                    <Link
                      key={loc.slug}
                      href={loc.href}
                      onClick={() => pick(`${r.name} ${loc.name}`, loc.href)}
                      aria-disabled={loc.empty}
                      className={`px-2.5 py-1 text-sm rounded-lg ${
                        loc.empty
                          ? "text-muted/40 pointer-events-none"
                          : "text-muted hover:text-foreground hover:bg-background"
                      }`}
                    >
                      {loc.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
