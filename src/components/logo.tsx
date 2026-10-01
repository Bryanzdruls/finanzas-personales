// Marca de Mis Finanzas: tres barras que suben, la última coronada por una moneda.
// Las mismas formas se usan en el ícono del iPhone (src/lib/app-icon.tsx).
export const LOGO_BARS = [
  { x: 9, y: 30, h: 13 },
  { x: 21, y: 23, h: 20 },
  { x: 33, y: 17, h: 26 },
];
export const LOGO_COIN = { cx: 37, cy: 10, r: 4.5 };

export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" aria-hidden className={className}>
      <rect width="52" height="52" rx="14" className="fill-accent" />
      {LOGO_BARS.map((b) => (
        <rect key={b.x} x={b.x} y={b.y} width="8" height={b.h} rx="4" className="fill-accent-foreground" />
      ))}
      <circle {...LOGO_COIN} className="fill-accent-foreground" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      Mis <span className="text-accent">Finanzas</span>
    </span>
  );
}
