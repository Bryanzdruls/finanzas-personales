import Link from "next/link";
import { Icon } from "./icons";

export function PageHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {backHref && (
        <Link href={backHref} className="-ml-1 mb-2 inline-flex items-center gap-0.5 py-1 font-medium text-accent">
          <Icon name="chevronLeft" className="h-5 w-5" />
          Volver
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {action}
      </div>
    </header>
  );
}
