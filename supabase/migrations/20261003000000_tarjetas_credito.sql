-- Tarjetas de crédito como cuentas: su saldo es negativo (lo que se debe).
-- Una compra es un gasto desde la tarjeta; pagarla es una transferencia banco -> tarjeta,
-- así la compra cuenta una sola vez como gasto.
alter type public.account_type add value if not exists 'credit_card';

alter table public.accounts
  add column credit_limit numeric(16, 2) check (credit_limit > 0),
  add column due_day smallint check (due_day between 1 and 31);

-- Mismas columnas de antes (net_worth depende de esta vista) más cupo y día de pago al final.
create or replace view public.account_balances with (security_invoker = true) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency, a.archived,
         s.as_of as last_snapshot_on,
         coalesce(s.balance, a.initial_balance)
           + coalesce((select sum(m.delta)
                         from public.account_movements m
                        where m.account_id = a.id
                          and (s.as_of is null or m.occurred_on > s.as_of)), 0) as balance,
         a.credit_limit,
         a.due_day
    from public.accounts a
    left join lateral (
      select sn.as_of, sn.balance
        from public.account_snapshots sn
       where sn.account_id = a.id
       order by sn.as_of desc
       limit 1
    ) s on true;
