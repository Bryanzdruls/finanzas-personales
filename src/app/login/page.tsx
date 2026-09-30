"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

// Se usa código de 6 dígitos (no magic link) porque en iPhone la app instalada
// y Safari no comparten sesión: un link abriría Safari, no la app.
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (error) return setError(error.message);
    setStep("code");
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) return setError("Código inválido o vencido. Intenta de nuevo.");
    router.replace("/");
    router.refresh();
  }

  const input =
    "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent";
  const button =
    "w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground disabled:opacity-50";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-3xl text-accent-foreground">
          $
        </div>
        <h1 className="text-2xl font-bold">Mis Finanzas</h1>
        <p className="mt-1 text-muted">
          {step === "email"
            ? "Ingresa tu correo y te enviamos un código."
            : `Escribe el código que enviamos a ${email}.`}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
          <button type="submit" disabled={loading} className={button}>
            {loading ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <input
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6,10}"
            maxLength={10}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${input} text-center text-2xl tracking-[0.4em]`}
          />
          <button type="submit" disabled={loading} className={button}>
            {loading ? "Verificando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="py-2 text-sm text-muted"
          >
            Usar otro correo
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-negative">
          {error}
        </p>
      )}
    </main>
  );
}
