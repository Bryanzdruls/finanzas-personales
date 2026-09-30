"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

// Solo dentro de la app Android (Capacitor). En el navegador y en la PWA del iPhone es false.
export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export type PaymentCaptureStatus = {
  configured: boolean;
  listenerEnabled: boolean;
  resultNotifications: boolean;
};

// Plugin nativo propio: android/app/src/main/java/co/misfinanzas/app/PaymentCapturePlugin.java
type PaymentCapturePlugin = {
  configure(options: { token: string; endpoint: string }): Promise<PaymentCaptureStatus>;
  getStatus(): Promise<PaymentCaptureStatus>;
  clear(): Promise<PaymentCaptureStatus>;
  openListenerSettings(): Promise<void>;
  requestResultNotifications(): Promise<PaymentCaptureStatus>;
};

export const PaymentCapture = registerPlugin<PaymentCapturePlugin>("PaymentCapture");
