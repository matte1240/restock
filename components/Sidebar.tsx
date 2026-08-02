"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePianoBadge } from "./PianoBadgeContext";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Piano Ordini",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l9-4 9 4-9 4-9-4z" />
        <path d="M3 8v8l9 4 9-4V8" />
        <path d="M12 12v8" />
      </svg>
    ),
  },
  {
    href: "/articoli",
    label: "Articoli",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </svg>
    ),
  },
  {
    href: "/produttori",
    label: "Produttori",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V10l5 3V10l5 3V6l7 4v11H3z" />
      </svg>
    ),
  },
  {
    href: "/storico",
    label: "Storico",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { count: sottoScortaCount } = usePianoBadge();

  return (
    <div
      style={{
        width: 236,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-4) var(--space-3)",
        borderRight: "1px solid var(--color-divider)",
        gap: "var(--space-6)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 var(--space-2)" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--radius-md)",
            background: "var(--color-accent-900)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)" as unknown as number, fontSize: 15, lineHeight: 1.1 }}>
            OrdinaAI
          </div>
          <div style={{ fontSize: 11, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
            Gestione ordini
          </div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="nav-link"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                textDecoration: "none",
                color: active ? "var(--color-accent)" : "var(--color-text)",
                background: active ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.href === "/" && sottoScortaCount > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    background: "var(--color-accent-800)",
                    color: "var(--color-accent-100)",
                    borderRadius: 10,
                    padding: "1px 7px",
                  }}
                >
                  {sottoScortaCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
