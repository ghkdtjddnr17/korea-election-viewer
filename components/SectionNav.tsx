"use client";

import { useEffect, useState } from "react";
import type { Section } from "@/lib/types";
import { sectionId } from "@/lib/section-id";

export default function SectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => {
    const opts: IntersectionObserverInit = {
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    };
    const seen = new Map<string, IntersectionObserverEntry>();
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e);
      let chosen: string | null = null;
      for (const [id, e] of seen) {
        if (e.isIntersecting) {
          chosen = id;
          break;
        }
      }
      if (chosen) setActive(chosen);
    }, opts);
    sections.forEach((s, i) => {
      const el = document.getElementById(sectionId(s, i));
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  return (
    <>
      <nav className="hidden lg:block sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto w-56 pr-4 text-sm">
        <div className="text-[11px] uppercase tracking-wider text-[color:var(--muted)] mb-2 font-semibold">
          섹션
        </div>
        <ol className="space-y-0.5">
          {sections.map((s, i) => {
            const id = sectionId(s, i);
            const isActive = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`block py-1 pl-3 border-l-2 ${
                    isActive
                      ? "border-foreground text-foreground font-semibold"
                      : "border-transparent text-[color:var(--muted)] hover:text-foreground hover:border-[color:var(--border)]"
                  }`}
                >
                  <span className="text-[11px] tabular-nums mr-1">
                    {s.marker || s.no || ""}
                  </span>
                  <span>{s.title}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="lg:hidden sticky top-[57px] z-20 bg-paper border border-[color:var(--border)] rounded-lg mb-4">
        <button
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          className="w-full px-4 py-3 text-left text-sm font-semibold flex justify-between items-center"
          aria-expanded={openMobile}
        >
          <span>섹션 메뉴 ({sections.length})</span>
          <span aria-hidden>{openMobile ? "▴" : "▾"}</span>
        </button>
        {openMobile && (
          <ol className="max-h-[60vh] overflow-y-auto px-4 pb-4 text-sm space-y-1">
            {sections.map((s, i) => (
              <li key={sectionId(s, i)}>
                <a
                  href={`#${sectionId(s, i)}`}
                  onClick={() => setOpenMobile(false)}
                  className="block py-1.5 text-foreground"
                >
                  <span className="text-[11px] tabular-nums mr-2 text-[color:var(--muted)]">
                    {s.marker || s.no || ""}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
