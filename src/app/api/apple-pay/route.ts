import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { formatMoney, parseWalletAmount } from "@/lib/format";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

// Recibe los pagos del Atajo de iOS (automatización "Transacción" de Wallet).
//   POST /api/apple-pay
//   Authorization: Bearer fp_...
//   { "amount": "$45.000,00", "merchant": "Crepes & Waffles", "card": "Mastercard Bancolombia" }
// Responde { ok, message } para que el Atajo pueda mostrar una notificación.
export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const token = bearerToken(request) ?? stringField(body.token);
  if (!token) return reply(401, "Falta el token. Revisa el encabezado Authorization del Atajo.");

  const amount = parseWalletAmount(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return reply(400, `Monto inválido: ${JSON.stringify(body.amount ?? null)}`);
  }

  const merchant = stringField(body.merchant);
  const card = stringField(body.card);

  // Cliente sin sesión: la función de la base valida el token y registra como su dueño.
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("ingest_apple_pay", {
    p_token: token,
    p_amount: amount,
    p_merchant: merchant,
    p_card: card,
  });

  if (error) {
    if (error.code === "28000") return reply(401, "Token inválido o revocado.");
    if (error.code === "22023") return reply(400, "Monto inválido.");
    console.error("ingest_apple_pay", error);
    return reply(500, "No se pudo registrar el pago.");
  }

  return reply(200, `Registrado ${formatMoney(amount, "COP")}${merchant ? ` en ${merchant}` : ""}`);
}

function reply(status: number, message: string) {
  return NextResponse.json({ ok: status === 200, message }, { status });
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  return header?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
}

// Acepta JSON o formulario, según cómo se configure "Obtener contenido de URL" en el Atajo.
async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.includes("application/json")) return await request.json();
    if (type.includes("form")) return Object.fromEntries(await request.formData());
  } catch {
    // Cuerpo mal formado: se trata como vacío y el monto fallará con un mensaje claro.
  }
  return {};
}
