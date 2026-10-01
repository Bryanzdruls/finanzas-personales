"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/movimientos", label: "Movimientos", icon: "movements" },
  { href: "/cuentas", label: "Cuentas", icon: "wallet" },
  { href: "/deudas", label: "Deudas", icon: "debt" },
  { href: "/mas", label: "Más", icon: "more" },
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
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col items-center gap-1 pt-2 pb-1.5 text-[11px] font-medium active:scale-95 ${
                  active ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-accent/12" : "group-hover:bg-foreground/5"
                  }`}
                >
                  <Icon name={item.icon} className="h-[22px] w-[22px]" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
