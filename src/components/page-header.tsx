import Link from "next/link";

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
        <Link href={backHref} className="mb-2 inline-block py-1 text-accent">
          ‹ Volver
        </Link>
      )}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        {action}
      </div>
    </header>
  );
}
