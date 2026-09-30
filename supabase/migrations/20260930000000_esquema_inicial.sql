-- Esquema inicial: cuentas, categorías, deudas, movimientos, saldos y reglas por comercio.
-- Todo se filtra por usuario con Row Level Security.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.account_type as enum ('bank', 'pension', 'broker', 'crypto', 'cash', 'other');
create type public.category_kind as enum ('expense', 'income', 'debt');
create type public.debt_status as enum ('active', 'paid', 'cancelled');
create type public.transaction_type as enum ('expense', 'income', 'transfer', 'debt_payment');
create type public.transaction_source as enum ('manual', 'apple_pay');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  base_currency text not null default 'COP' check (base_currency in ('COP', 'USD')),
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type public.account_type not null default 'bank',
  currency text not null default 'COP' check (currency in ('COP', 'USD')),
  initial_balance numeric(16, 2) not null default 0,
  color text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind public.category_kind not null,
  parent_id uuid,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique nulls not distinct (user_id, kind, parent_id, name),
  foreign key (parent_id, user_id) references public.categories (id, user_id) on delete set null (parent_id)
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  creditor text not null check (length(trim(creditor)) > 0),
  description text,
  category_id uuid,
  total_amount numeric(16, 2) not null check (total_amount > 0),
  currency text not null default 'COP' check (currency in ('COP', 'USD')),
  interest_rate numeric(7, 3) check (interest_rate >= 0), -- % efectivo anual
  start_date date not null default current_date,
  installments integer check (installments > 0),
  due_day smallint check (due_day between 1 and 31),
  status public.debt_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occurred_on date not null default current_date,
  amount numeric(16, 2) not null check (amount > 0),
  type public.transaction_type not null,
  account_id uuid not null,
  to_account_id uuid,
  category_id uuid,
  debt_id uuid,
  description text,
  merchant text,
  source public.transaction_source not null default 'manual',
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict,
  foreign key (to_account_id, user_id) references public.accounts (id, user_id) on delete restrict,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  foreign key (debt_id, user_id) references public.debts (id, user_id) on delete restrict,
  -- Una transferencia necesita cuenta destino distinta; un abono necesita deuda.
  check ((type = 'transfer') = (to_account_id is not null)),
  check (to_account_id is null or to_account_id <> account_id),
  check ((type = 'debt_payment') = (debt_id is not null))
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;
create index transactions_debt_idx on public.transactions (debt_id) where debt_id is not null;
create index transactions_review_idx on public.transactions (user_id) where needs_review;

-- Saldo real reportado de una cuenta en una fecha (útil para inversiones: IBKR, Protección, Wenia).
create table public.account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null,
  as_of date not null default current_date,
  balance numeric(16, 2) not null,
  created_at timestamptz not null default now(),
  unique (account_id, as_of),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade
);

-- Comercio -> categoría/cuenta, para autocategorizar pagos que llegan por Apple Pay.
create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern text not null check (length(trim(pattern)) > 0),
  category_id uuid,
  account_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, pattern),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade,
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Row Level Security: cada usuario solo ve y modifica lo suyo
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.debts enable row level security;
alter table public.transactions enable row level security;
alter table public.account_snapshots enable row level security;
alter table public.merchant_rules enable row level security;

create policy "perfil propio" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "cuentas propias" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categorias propias" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "deudas propias" on public.debts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "movimientos propios" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "saldos propios" on public.account_snapshots
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "reglas propias" on public.merchant_rules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Vistas (security_invoker: respetan el RLS de quien consulta)
-- ---------------------------------------------------------------------------

-- Efecto de cada movimiento sobre cada cuenta (+ entra, - sale).
create view public.account_movements with (security_invoker = true) as
  select t.user_id, t.account_id, t.occurred_on,
         case when t.type = 'income' then t.amount else -t.amount end as delta
    from public.transactions t
  union all
  select t.user_id, t.to_account_id, t.occurred_on, t.amount
    from public.transactions t
   where t.type = 'transfer';

-- Saldo actual: último saldo reportado + movimientos posteriores; si no hay, saldo inicial + todo.
create view public.account_balances with (security_invoker = true) as
  select a.id as account_id, a.user_id, a.name, a.type, a.currency, a.archived,
         s.as_of as last_snapshot_on,
         coalesce(s.balance, a.initial_balance)
           + coalesce((select sum(m.delta)
                         from public.account_movements m
                        where m.account_id = a.id
                          and (s.as_of is null or m.occurred_on > s.as_of)), 0) as balance
    from public.accounts a
    left join lateral (
      select sn.as_of, sn.balance
        from public.account_snapshots sn
       where sn.account_id = a.id
       order by sn.as_of desc
       limit 1
    ) s on true;

-- Resumen mensual por moneda (las transferencias no cuentan como gasto ni ingreso).
create view public.monthly_summary with (security_invoker = true) as
  select t.user_id,
         date_trunc('month', t.occurred_on)::date as month,
         a.currency,
         coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
         coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expenses,
         coalesce(sum(t.amount) filter (where t.type = 'debt_payment'), 0) as debt_payments,
         coalesce(sum(t.amount) filter (where t.type = 'income'), 0)
           - coalesce(sum(t.amount) filter (where t.type in ('expense', 'debt_payment')), 0) as net
    from public.transactions t
    join public.accounts a on a.id = t.account_id
   where t.type <> 'transfer'
   group by t.user_id, date_trunc('month', t.occurred_on), a.currency;

-- Cuánto se ha abonado y cuánto falta de cada deuda.
create view public.debt_balances with (security_invoker = true) as
  select d.id as debt_id, d.user_id, d.creditor, d.currency, d.status, d.total_amount,
         coalesce(p.paid, 0) as paid,
         greatest(d.total_amount - coalesce(p.paid, 0), 0) as remaining,
         round(least(coalesce(p.paid, 0) / d.total_amount, 1) * 100, 1) as progress_pct
    from public.debts d
    left join lateral (
      select sum(t.amount) as paid
        from public.transactions t
       where t.debt_id = d.id
    ) p on true;

-- Patrimonio neto por moneda: saldos de cuentas activas menos deudas activas pendientes.
create view public.net_worth with (security_invoker = true) as
  select user_id, currency,
         sum(assets) as assets,
         sum(liabilities) as liabilities,
         sum(assets) - sum(liabilities) as net_worth
    from (
      select user_id, currency, balance as assets, 0::numeric as liabilities
        from public.account_balances
       where not archived
      union all
      select user_id, currency, 0, remaining
        from public.debt_balances
       where status = 'active'
    ) x
   group by user_id, currency;

revoke all on public.account_movements, public.account_balances, public.monthly_summary,
  public.debt_balances, public.net_worth from anon;
grant select on public.account_movements, public.account_balances, public.monthly_summary,
  public.debt_balances, public.net_worth to authenticated;

-- ---------------------------------------------------------------------------
-- Datos iniciales para cada usuario nuevo: perfil, cuentas y categorías
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.accounts (user_id, name, type, currency) values
    (new.id, 'Bancolombia', 'bank', 'COP'),
    (new.id, 'Protección', 'pension', 'COP'),
    (new.id, 'Interactive Brokers', 'broker', 'USD'),
    (new.id, 'Wenia', 'crypto', 'COP'),
    (new.id, 'Efectivo', 'cash', 'COP');

  insert into public.categories (user_id, kind, name, icon) values
    (new.id, 'expense', 'Vivienda', '🏠'),
    (new.id, 'expense', 'Mercado', '🛒'),
    (new.id, 'expense', 'Restaurantes', '🍽️'),
    (new.id, 'expense', 'Transporte', '🚗'),
    (new.id, 'expense', 'Servicios públicos', '💡'),
    (new.id, 'expense', 'Salud', '🩺'),
    (new.id, 'expense', 'Educación', '📚'),
    (new.id, 'expense', 'Entretenimiento', '🎬'),
    (new.id, 'expense', 'Compras', '🛍️'),
    (new.id, 'expense', 'Suscripciones', '🔁'),
    (new.id, 'expense', 'Viajes', '✈️'),
    (new.id, 'expense', 'Impuestos', '🧾'),
    (new.id, 'expense', 'Otros gastos', '📦'),
    (new.id, 'income', 'Salario', '💼'),
    (new.id, 'income', 'Freelance', '🧑‍💻'),
    (new.id, 'income', 'Inversiones', '📈'),
    (new.id, 'income', 'Intereses', '🏦'),
    (new.id, 'income', 'Reembolsos', '↩️'),
    (new.id, 'income', 'Otros ingresos', '💰'),
    (new.id, 'debt', 'Tarjeta de crédito', '💳'),
    (new.id, 'debt', 'Crédito hipotecario', '🏡'),
    (new.id, 'debt', 'Crédito de vehículo', '🚙'),
    (new.id, 'debt', 'Préstamo personal', '🤝'),
    (new.id, 'debt', 'Otras deudas', '📄');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
