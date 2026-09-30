"use client";

import { useSyncExternalStore } from "react";
import { isNativeAndroid } from "@/lib/native";

const subscribe = () => () => {};

// Muestra `android` dentro de la app Android y `web` en el navegador / PWA del iPhone.
// En el servidor no se sabe la plataforma, así que se renderiza `web` y se corrige al hidratar.
export function PlatformSwitch({ web, android }: { web: React.ReactNode; android: React.ReactNode }) {
  const native = useSyncExternalStore(subscribe, isNativeAndroid, () => false);
  return <>{native ? android : web}</>;
}
