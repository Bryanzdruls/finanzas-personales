import { ImageResponse } from "next/og";
import { LOGO_BARS, LOGO_COIN } from "@/components/logo";

// Ícono de la app generado en código: la marca (barras y moneda) en blanco sobre el color de acento.
export function renderAppIcon(size: number, { rounded = false } = {}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a7c66",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={size} height={size} viewBox="0 0 52 52">
          {LOGO_BARS.map((b) => (
            <rect key={b.x} x={b.x} y={b.y} width="8" height={b.h} rx="4" fill="#ffffff" />
          ))}
          <circle cx={LOGO_COIN.cx} cy={LOGO_COIN.cy} r={LOGO_COIN.r} fill="#ffffff" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
