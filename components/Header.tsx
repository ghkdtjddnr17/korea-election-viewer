"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import RegionSwitcher from "./RegionSwitcher";
import type { RegionLite } from "@/lib/locality-index";

/**
 * Sticky site header. Always renders the global brand, primary nav, the 지역 스위처,
 * and the Cmd+K search trigger. Pages can inject contextual chips (e.g. Truth-status
 * summary on candidate detail) via `centerSlot`, and a right-side accent via `rightSlot`.
 */
export default function Header({
  centerSlot,
  rightSlot,
  regions = [],
}: {
  centerSlot?: ReactNode;
  rightSlot?: ReactNode;
  regions?: RegionLite[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <header className="bg-paper border-b border-border sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-3 flex items-center gap-2 sm:gap-3 lg:gap-4">
        {pathname !== "/" && (
          <button
            type="button"
            onClick={goBack}
            aria-label="뒤로 가기"
            className="shrink-0 -ml-1 grid place-items-center w-9 h-9 rounded-lg text-muted hover:text-foreground hover:bg-background cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <Link href="/" className="font-bold text-[17px] flex items-center gap-1.5 shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          <span className="hidden sm:inline">2026 지방선거</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link href="/playbook" className="px-2.5 py-1 rounded text-muted hover:text-foreground hover:bg-background">
            방법론
          </Link>
          <Link href="/schedule" className="px-2.5 py-1 rounded text-muted hover:text-foreground hover:bg-background">
            일정
          </Link>
        </nav>

        {/* Page-supplied chips (e.g. Truth-status summary). Hidden on small screens to avoid crowding. */}
        {centerSlot ? <div className="hidden xl:flex items-center gap-1.5 ml-2">{centerSlot}</div> : null}

        <div className="ml-auto flex items-center gap-2">
          {rightSlot}
          <RegionSwitcher regions={regions} />
        </div>
      </div>
    </header>
  );
}
