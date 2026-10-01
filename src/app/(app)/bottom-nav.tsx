"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/movimientos", label: "Movimientos", icon: "↕️" },
  { href: "/cuentas", label: "Cuentas", icon: "🏦" },
  { href: "/deudas", label: "Deudas", icon: "📉" },
  { href: "/mas", label: "Más", icon: "⋯" },
];

const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function BottomNav() {
  const pathname = usePathname();
  // La pestaña tocada se marca de inmediato, sin esperar a que cargue la página.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  const current = tapped && tapped.from === pathname ? tapped.href : pathname;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const active = isActive(item.href, current);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                onClick={() => setTapped({ href: item.href, from: pathname })}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] active:scale-95 ${
                  active ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
