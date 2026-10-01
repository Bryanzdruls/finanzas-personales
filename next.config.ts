import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en la carpeta de usuario; fijamos la raíz aquí.
  turbopack: { root: __dirname },
  experimental: {
    // Volver a una pestaña ya visitada es instantáneo durante 30 s; guardar o borrar algo
    // (revalidatePath) invalida esta caché, así que no se ven datos viejos tras un cambio.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
