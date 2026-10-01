import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ENABLED_KINDS, parseBancolombiaMessage } from "@/lib/bancolombia";
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
// Responde { ok, message } para mostrarlo como notificación. Cada intento con token válido
// queda en ingest_events (Más → Pagos automáticos → Últimos intentos) con lo que llegó.
export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const token = bearerToken(request) ?? stringField(body.token);
  if (!token) return reply(401, "Falta el token. Revisa el encabezado Authorization.");

  const source = typeof body.source === "string" ? body.source : "apple_pay";
  const result = source === "bancolombia" ? await ingestBancolombia(token, body) : await ingestPayment(token, body);

  // Sin el token en el registro: es una credencial y no aporta para diagnosticar.
  const payload = { ...body };
  delete payload.token;
  const { error } = await anonClient().rpc("log_ingest_event", {
    p_token: token,
    p_source: source,
    p_status: result.status,
    p_message: result.message,
    p_payload: JSON.stringify(payload).slice(0, 2000),
  });
  if (error) console.error("log_ingest_event", error.message);

  return reply(result.status, result.message);
}

type Result = { status: number; message: string };

// Cliente sin sesión: las funciones de la base validan el token y actúan como su dueño.
function anonClient() {
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

async function ingestPayment(token: string, body: Record<string, unknown>): Promise<Result> {
  const source = body.source === "google_pay" ? "google_pay" : "apple_pay";
  const payment = source === "google_pay" ? fromGoogleWallet(body) : fromFields(body);
  if (!payment) {
    // El texto crudo queda en los logs para ajustar el parser si Google cambia el formato.
    console.warn("ingest: pago no reconocido", source, JSON.stringify(body).slice(0, 500));
    return { status: 422, message: `No se reconoció el monto (llegó: ${describe(body.amount ?? body.text)})` };
  }

  const { error } = await anonClient().rpc("ingest_payment", {
    p_token: token,
    p_amount: payment.amount,
    p_merchant: payment.merchant,
    p_card: payment.card,
    p_source: source,
  });

  if (error) {
    if (error.code === "28000") return { status: 401, message: "Token inválido o revocado." };
    if (error.code === "22023") {
      return { status: 400, message: `Monto inválido: ${payment.amount} (llegó: ${describe(body.amount)})` };
    }
    console.error("ingest_payment", error);
    return { status: 500, message: "No se pudo registrar el pago." };
  }

  const where = payment.merchant ? ` en ${payment.merchant}` : "";
  return { status: 200, message: `Registrado ${formatMoney(payment.amount, "COP")}${where}` };
}

// Valor recibido, recortado, para mostrarlo en mensajes de error.
function describe(value: unknown) {
  return JSON.stringify(value ?? null).slice(0, 80);
}

// SMS (Atajo "Mensaje") o correo (Gmail + Apps Script) de alertas de Bancolombia:
//   { "source": "bancolombia", "channel": "sms" | "email", "text": "Bancolombia: Transferiste ..." }
async function ingestBancolombia(token: string, body: Record<string, unknown>): Promise<Result> {
  const text = typeof body.text === "string" ? body.text.slice(0, 4000) : "";
  const movement = parseBancolombiaMessage(text);
  if (!movement || movement.kind === "unknown") {
    console.warn("ingest: mensaje de Bancolombia no reconocido", body.channel, text.slice(0, 500));
    return { status: 422, message: "No se reconoció el mensaje de Bancolombia." };
  }
  if (!ENABLED_KINDS.includes(movement.kind)) {
    return { status: 200, message: `Ignorado (${movement.description.toLowerCase()})` };
  }

  const { data, error } = await anonClient().rpc("ingest_bank_movement", {
    p_token: token,
    p_type: movement.kind === "income" ? "income" : "expense",
    p_amount: movement.amount,
    p_counterparty: movement.counterparty,
    p_description: movement.description,
    p_card_key: movement.cardKey,
    p_occurred_on: movement.date,
  });

  if (error) {
    if (error.code === "28000") return { status: 401, message: "Token inválido o revocado." };
    if (error.code === "22023") return { status: 400, message: `Monto inválido: ${movement.amount}` };
    console.error("ingest_bank_movement", error);
    return { status: 500, message: "No se pudo registrar el movimiento." };
  }

  const amount = formatMoney(movement.amount, "COP");
  if ((data as { duplicate?: boolean })?.duplicate) {
    return { status: 200, message: `Ya estaba registrado: ${amount}` };
  }
  return { status: 200, message: `Registrado ${amount} · ${movement.description}` };
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
