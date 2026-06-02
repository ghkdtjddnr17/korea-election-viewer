"use client";

import { useState } from "react";

export type TabDef = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export default function OfficeTabs({
  tabs,
  initial,
}: {
  tabs: TabDef[];
  initial?: string;
}) {
  const validInitial = tabs.find((t) => t.id === initial)?.id ?? tabs[0]?.id;
  const [active, setActive] = useState<string>(validInitial ?? "");
  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap gap-0 border-b border-border mb-6"
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2.5 -mb-px text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-foreground text-foreground"
                  : "border-b-2 border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div>
        {tabs.map((t) => (
          <div
            key={t.id}
            role="tabpanel"
            hidden={active !== t.id}
            className={active === t.id ? "" : "hidden"}
          >
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
