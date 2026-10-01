import Link from "next/link";
import type { Month } from "@/lib/dates";

export function MonthPicker({
  month,
  basePath,
  params = {},
}: {
  month: Month;
  basePath: string;
  params?: Record<string, string>;
}) {
  const href = (mes?: string) => {
    const query = new URLSearchParams({ ...params, ...(mes ? { mes } : {}) }).toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  const link =
    "flex h-10 w-10 items-center justify-center rounded-full bg-surface text-xl hover:bg-border active:scale-95";

  return (
    <div className="flex items-center justify-between">
      <Link href={href(month.prev)} className={link} aria-label="Mes anterior">
        ‹
      </Link>
      <div className="text-center">
        <p className="font-semibold capitalize">{month.label}</p>
        {!month.isCurrent && (
          <Link href={href()} className="text-xs text-accent">
            Ir al mes actual
          </Link>
        )}
      </div>
      <Link href={href(month.next)} className={link} aria-label="Mes siguiente">
        ›
      </Link>
    </div>
  );
}
