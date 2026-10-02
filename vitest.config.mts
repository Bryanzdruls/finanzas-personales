import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts", "supabase/tests/**/*.test.ts"],
    // Las pruebas de la base levantan Postgres (PGlite) y corren todas las migraciones.
    testTimeout: 60_000,
  },
});
