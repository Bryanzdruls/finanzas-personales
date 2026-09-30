import Link from "next/link";
import type { Month } from "@/lib/dates";

export function MonthPicker({ month, basePath }: { month: Month; basePath: string }) {
  const link = "flex h-10 w-10 items-center justify-center rounded-full bg-surface text-xl";
  return (
    <div className="flex items-center justify-between">
      <Link href={`${basePath}?mes=${month.prev}`} className={link} aria-label="Mes anterior">
        ‹
      </Link>
      <div className="text-center">
        <p className="font-semibold capitalize">{month.label}</p>
        {!month.isCurrent && (
          <Link href={basePath} className="text-xs text-accent">
            Ir al mes actual
          </Link>
        )}
      </div>
      <Link href={`${basePath}?mes=${month.next}`} className={link} aria-label="Mes siguiente">
        ›
      </Link>
    </div>
  );
}
