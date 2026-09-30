import type { CapacitorConfig } from "@capacitor/cli";

// La app Android carga la versión desplegada en Vercel: se reutilizan tal cual las páginas,
// los Server Actions y la sesión por cookies, y cada deploy la actualiza sin reinstalar.
// Solo hay que reinstalar el APK cuando cambie código nativo (android/).
const PRODUCTION_URL = "https://finanzas-personales-tawny-sigma.vercel.app";

const config: CapacitorConfig = {
  appId: "co.misfinanzas.app",
  appName: "Mis Finanzas",
  // Página de respaldo si no hay conexión al abrir.
  webDir: "native/www",
  server: {
    url: process.env.CAP_SERVER_URL ?? PRODUCTION_URL,
    androidScheme: "https",
    // Todo lo demás (p. ej. enlaces externos) se abre fuera de la app.
    allowNavigation: ["finanzas-personales-tawny-sigma.vercel.app", "*.supabase.co"],
    cleartext: Boolean(process.env.CAP_SERVER_URL?.startsWith("http://")),
  },
  plugins: {
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
