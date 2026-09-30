import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en la carpeta de usuario; fijamos la raíz aquí.
  turbopack: { root: __dirname },
};

export default nextConfig;
