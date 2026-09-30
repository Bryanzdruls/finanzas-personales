-- Lo abonado a una deuda antes de empezar a usar la app (p. ej. un crédito que ya lleva cuotas pagas).
alter table public.debts
  add column paid_before numeric(16, 2) not null default 0 check (paid_before >= 0);

-- Mismas columnas que antes (net_worth depende de esta vista); "paid" ahora incluye lo previo.
create or replace view public.debt_balances with (security_invoker = true) as
  select d.id as debt_id, d.user_id, d.creditor, d.currency, d.status, d.total_amount,
         d.paid_before + coalesce(p.paid, 0) as paid,
         greatest(d.total_amount - d.paid_before - coalesce(p.paid, 0), 0) as remaining,
         round(least((d.paid_before + coalesce(p.paid, 0)) / d.total_amount, 1) * 100, 1) as progress_pct
    from public.debts d
    left join lateral (
      select sum(t.amount) as paid
        from public.transactions t
       where t.debt_id = d.id
    ) p on true;
