"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatMoney, type Currency } from "@/lib/format";

export type TrendPoint = {
  month: string; // 2026-09
  label: string; // "sept"
  income: number;
  expenses: number;
};

const series = [
  { key: "income", label: "Ingresos", color: "var(--series-1)" },
  { key: "expenses", label: "Gastos", color: "var(--series-2)" },
] as const;

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

// Ingresos vs gastos por mes: barras agrupadas, un solo eje, colores de la paleta validada.
export function TrendChart({ data, currency }: { data: TrendPoint[]; currency: Currency }) {
  return (
    <figure>
      <ul className="mb-3 flex gap-4 text-sm text-muted" aria-label="Leyenda">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="20%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickFormatter={(v: number) => compact.format(v)}
            />
            <Tooltip
              cursor={{ fill: "var(--grid)", opacity: 0.5 }}
              content={(props) => <TrendTooltip {...props} currency={currency} />}
            />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function TrendTooltip({
  active,
  payload,
  currency,
}: Pick<TooltipContentProps, "active" | "payload"> & { currency: Currency }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  const net = point.income - point.expenses;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium capitalize">{point.label} {point.month.slice(0, 4)}</p>
      {series.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="flex items-center gap-1.5 text-muted">
            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
          {formatMoney(point[s.key], currency)}
        </p>
      ))}
      <p className="mt-1 flex justify-between gap-4 border-t border-border pt-1 tabular-nums">
        <span className="text-muted">Diferencia</span>
        {formatMoney(net, currency)}
      </p>
    </div>
  );
}
