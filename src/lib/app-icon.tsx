import { ImageResponse } from "next/og";

// Ícono de la app generado en código: signo $ blanco sobre el color de acento.
export function renderAppIcon(size: number, { rounded = false } = {}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a7c66",
          color: "#ffffff",
          fontSize: size * 0.6,
          fontWeight: 700,
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        $
      </div>
    ),
    { width: size, height: size },
  );
}
