import type { NextRequest } from "next/server";
import { parseMonth } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { transactionTypeLabels, type TransactionType } from "@/lib/types";

type Row = {
  occurred_on: string;
  amount: string;
  type: TransactionType;
  description: string | null;
  merchant: string | null;
  source: string;
  account: { name: string; currency: string };
  to_account: { name: string } | null;
  category: { name: string } | null;
  debt: { creditor: string } | null;
};

const PAGE = 1000;

// GET /api/export?desde=2026-04&hasta=2026-09 -> CSV de movimientos (requiere sesión; RLS
// garantiza que solo salen los del usuario). Formato para Excel en español: ";" y coma decimal.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = parseMonth(params.get("desde") ?? undefined);
  const to = parseMonth(params.get("hasta") ?? params.get("desde") ?? undefined);
  const [start, end] = from.start <= to.start ? [from.start, to.end] : [to.start, from.end];

  const supabase = await createClient();
  const rows: Row[] = [];
  // PostgREST devuelve máximo 1000 filas por consulta: se pagina.
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `occurred_on, amount, type, description, merchant, source,
         account:accounts!transactions_account_id_user_id_fkey(name, currency),
         to_account:accounts!transactions_to_account_id_user_id_fkey(name),
         category:categories(name),
         debt:debts(creditor)`,
      )
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on")
      .order("created_at")
      .range(offset, offset + PAGE - 1)
      .returns<Row[]>();
    if (error) return new Response(`Error exportando: ${error.message}`, { status: 500 });
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  const header = ["Fecha", "Tipo", "Monto", "Moneda", "Cuenta", "Hacia", "Categoría", "Deuda", "Descripción", "Comercio", "Origen"];
  const lines = rows.map((r) =>
    [
      r.occurred_on,
      transactionTypeLabels[r.type],
      r.amount.replace(".", ","),
      r.account.currency,
      r.account.name,
      r.to_account?.name,
      r.category?.name,
      r.debt?.creditor,
      r.description,
      r.merchant,
      r.source === "apple_pay" ? "Apple Pay" : "Manual",
    ]
      .map(csvField)
      .join(";"),
  );

  // BOM para que Excel reconozca UTF-8 (tildes y ñ).
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
  const filename = `finanzas_${start.slice(0, 7)}_${end.slice(0, 7)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function csvField(value: string | null | undefined) {
  if (value == null) return "";
  // Evita que Excel interprete textos como fórmulas (=, +, -, @).
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
