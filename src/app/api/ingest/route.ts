import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { formatMoney, parseWalletAmount } from "@/lib/format";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { parseGoogleWalletNotification, type ParsedPayment } from "@/lib/wallet-notification";

// Recibe pagos automáticos. Autenticación: `Authorization: Bearer fp_...` (token personal).
//
// Apple Pay (Atajo de iOS, también en /api/apple-pay):
//   { "amount": "$45.000,00", "merchant": "Crepes & Waffles", "card": "Mastercard Bancolombia" }
// Google Wallet (app Android, notificación cruda; se interpreta aquí para poder ajustar el
// formato con un deploy sin reinstalar la app):
//   { "source": "google_pay", "title": "Crepes & Waffles", "text": "$45.000,00 con Visa ••1234" }
//
// Responde { ok, message } para mostrarlo como notificación.
export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const token = bearerToken(request) ?? stringField(body.token);
  if (!token) return reply(401, "Falta el token. Revisa el encabezado Authorization.");

  const source = body.source === "google_pay" ? "google_pay" : "apple_pay";
  const payment = source === "google_pay" ? fromGoogleWallet(body) : fromFields(body);
  if (!payment) {
    // El texto crudo queda en los logs para ajustar el parser si Google cambia el formato.
    console.warn("ingest: pago no reconocido", source, JSON.stringify(body).slice(0, 500));
    return reply(422, "No se reconoció el monto del pago.");
  }

  // Cliente sin sesión: la función de la base valida el token y registra como su dueño.
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("ingest_payment", {
    p_token: token,
    p_amount: payment.amount,
    p_merchant: payment.merchant,
    p_card: payment.card,
    p_source: source,
  });

  if (error) {
    if (error.code === "28000") return reply(401, "Token inválido o revocado.");
    if (error.code === "22023") return reply(400, "Monto inválido.");
    console.error("ingest_payment", error);
    return reply(500, "No se pudo registrar el pago.");
  }

  const where = payment.merchant ? ` en ${payment.merchant}` : "";
  return reply(200, `Registrado ${formatMoney(payment.amount, "COP")}${where}`);
}

function fromFields(body: Record<string, unknown>): ParsedPayment | null {
  const amount = parseWalletAmount(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, merchant: stringField(body.merchant), card: stringField(body.card) };
}

function fromGoogleWallet(body: Record<string, unknown>): ParsedPayment | null {
  // Si la app ya manda los campos separados, se usan; si no, se interpreta la notificación.
  return (
    fromFields(body) ??
    parseGoogleWalletNotification({ title: stringField(body.title), text: stringField(body.text) })
  );
}

function reply(status: number, message: string) {
  return NextResponse.json({ ok: status === 200, message }, { status });
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  return header?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null;
}

// Acepta JSON o formulario, según cómo lo envíe el Atajo o la app.
async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) return await request.json();
    if (type.includes("form")) return Object.fromEntries(await request.formData());
  } catch {
    // Cuerpo mal formado: se trata como vacío y fallará con un mensaje claro.
  }
  return {};
}
