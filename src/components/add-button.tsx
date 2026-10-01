import Link from "next/link";
import { Icon } from "./icons";

// Botón flotante "+" encima de la barra de navegación.
export function AddButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="tap fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30"
    >
      <Icon name="plus" className="h-7 w-7" />
    </Link>
  );
}
