// Íconos de línea de la app (24×24, trazo de 1.8). Heredan el color del texto.
type IconProps = { className?: string };

const paths = {
  home: "M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9",
  movements: "M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5M17 20V4m0 16-3.5-3.5M17 20l3.5-3.5",
  wallet:
    "M4 7.5A2.5 2.5 0 0 1 6.5 5H18v2.5M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5ZM16 13.5h.01",
  debt: "M4 6h16M4 6v12h16V6M8 14l3-3 2 2 3-3",
  more: "M6.2 12a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Zm7 0a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Zm7 0a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H3",
  tag: "M3 12V4h8l10 10-8 8L3 12Zm5-4h.01",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6l2-8Z",
  clipboard: "M9 4h6v3H9V4Zm-3 1H5v16h14V5h-1M8.5 12h7m-7 4h4",
  card: "M3 6h18v12H3V6Zm0 4h18M7 15h3",
  rules: "M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  settings: "M4 7h10m4 0h2M4 17h4m4 0h8M14 5v4m-6 6v4",
  logout: "M14 4h5v16h-5M10 8l-4 4 4 4m-4-4h11",
  plus: "M12 5v14M5 12h14",
  chevronRight: "m9 5 7 7-7 7",
  chevronLeft: "m15 5-7 7 7 7",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-6 w-6" }: IconProps & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
