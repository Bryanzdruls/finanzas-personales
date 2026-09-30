"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/movimientos", label: "Movimientos", icon: "↕️" },
  { href: "/cuentas", label: "Cuentas", icon: "🏦" },
  { href: "/deudas", label: "Deudas", icon: "📉" },
  { href: "/mas", label: "Más", icon: "⋯" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-accent" : "text-muted"}`}
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
