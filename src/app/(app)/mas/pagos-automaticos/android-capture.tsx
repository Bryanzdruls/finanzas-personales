"use client";

import { useCallback, useEffect, useState } from "react";
import { FormError } from "@/components/form-error";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { PaymentCapture, type PaymentCaptureStatus } from "@/lib/native";
import type { Account } from "@/lib/types";
import { createToken } from "./actions";

// Configura la captura de pagos de Google Wallet en la app Android: crea un token, se lo pasa
// al servicio nativo y guía para dar el permiso de "Acceso a notificaciones".
export function AndroidCapture({ accounts }: { accounts: Account[] }) {
  const [status, setStatus] = useState<PaymentCaptureStatus | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    PaymentCapture.getStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  // Al volver de Ajustes se vuelve a leer el estado del permiso.
  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  async function connect() {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("name", "Android · Google Wallet");
    form.set("default_account_id", accountId);
    const result = await createToken(undefined, form);
    if (!result?.token) {
      setBusy(false);
      return setError(result?.error ?? "No se pudo crear el token.");
    }
    try {
      setStatus(
        await PaymentCapture.configure({
          token: result.token,
          endpoint: `${window.location.origin}/api/ingest`,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo configurar la app.");
    }
    setBusy(false);
  }

  async function disconnect() {
    if (!confirm("¿Dejar de registrar los pagos de Google Wallet en este teléfono?")) return;
    setStatus(await PaymentCapture.clear());
  }

  if (!status) return <p className="text-sm text-muted">Cargando…</p>;

  const step = "flex items-start gap-3";
  const check = (done: boolean) => (
    <span
      aria-hidden
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
        done ? "bg-accent text-accent-foreground" : "bg-background text-muted"
      }`}
    >
      {done ? "✓" : "•"}
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className={step}>
        {check(status.configured)}
        <div className="flex-1">
          <p className="font-medium">Conectar este teléfono</p>
          {status.configured ? (
            <button type="button" onClick={disconnect} className="text-sm text-negative">
              Desconectar
            </button>
          ) : (
            <div className="mt-2 flex flex-col gap-3">
              <div>
                <label htmlFor="android_account" className={labelClass}>
                  Cuenta por defecto
                </label>
                <select
                  id="android_account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={inputClass}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={connect} disabled={busy} className={primaryButtonClass}>
                {busy ? "Conectando…" : "Conectar"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={step}>
        {check(status.listenerEnabled)}
        <div className="flex-1">
          <p className="font-medium">Permitir leer las notificaciones de Google Wallet</p>
          <p className="text-sm text-muted">
            En Ajustes activa <strong>Mis Finanzas</strong>. Solo se leen las notificaciones de Google Wallet.
          </p>
          {!status.listenerEnabled && (
            <button
              type="button"
              onClick={() => PaymentCapture.openListenerSettings()}
              className="mt-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent"
            >
              Abrir Ajustes
            </button>
          )}
        </div>
      </div>

      <div className={step}>
        {check(status.resultNotifications)}
        <div className="flex-1">
          <p className="font-medium">Avisarme cuando registre un pago (opcional)</p>
          {!status.resultNotifications && (
            <button
              type="button"
              onClick={async () => setStatus(await PaymentCapture.requestResultNotifications())}
              className="mt-2 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent"
            >
              Permitir avisos
            </button>
          )}
        </div>
      </div>

      <FormError message={error ?? undefined} />

      {status.configured && status.listenerEnabled && (
        <p className="rounded-xl bg-background p-3 text-sm">
          ✅ Listo. Cada pago con Google Wallet aparecerá en <strong>Por revisar</strong>. Si tu teléfono
          ahorra batería de forma agresiva (Xiaomi, Samsung, Huawei), excluye a Mis Finanzas de la
          optimización de batería para que no se detenga.
        </p>
      )}
    </div>
  );
}
