-- Registro automático de pagos con Apple Pay desde un Atajo de iOS (automatización "Transacción").

-- Token personal que usa el Atajo. Solo se guarda su hash SHA-256; el token se muestra una vez.
create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  token_hash text not null unique,
  default_account_id uuid not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (default_account_id, user_id) references public.accounts (id, user_id) on delete cascade
);

-- Tarjeta de Wallet -> cuenta de la app (se aprende al revisar un pago).
create table public.payment_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  card_key text not null check (card_key = lower(trim(card_key)) and card_key <> ''),
  account_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, card_key),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade
);

-- Los patrones de comercio se guardan normalizados para compararlos sin mayúsculas.
alter table public.merchant_rules
  add constraint merchant_rules_pattern_normalized check (pattern = lower(trim(pattern)));

alter table public.transactions add column card_name text;

alter table public.api_tokens enable row level security;
alter table public.payment_cards enable row level security;

create policy "tokens propios" on public.api_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tarjetas propias" on public.payment_cards
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Recibe un pago del Atajo. Es security definer porque quien llama no tiene sesión:
-- la identidad la da el token. Devuelve el gasto creado.
create function public.ingest_apple_pay(
  p_token text,
  p_amount numeric,
  p_merchant text,
  p_card text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.api_tokens;
  v_merchant text := nullif(trim(p_merchant), '');
  v_card text := nullif(trim(p_card), '');
  v_account_id uuid;
  v_category_id uuid;
  v_rule_account_id uuid;
  v_id uuid;
begin
  select * into v_token
    from public.api_tokens
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if not found then
    raise exception 'token inválido' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 1e13 then
    raise exception 'monto inválido' using errcode = '22023';
  end if;

  update public.api_tokens set last_used_at = now() where id = v_token.id;

  -- Regla del comercio más específica (patrón más largo contenido en el nombre).
  if v_merchant is not null then
    select r.category_id, r.account_id into v_category_id, v_rule_account_id
      from public.merchant_rules r
     where r.user_id = v_token.user_id
       and strpos(lower(v_merchant), r.pattern) > 0
     order by length(r.pattern) desc
     limit 1;
  end if;

  -- Cuenta: la de la tarjeta si ya se conoce; si no, la de la regla; si no, la por defecto.
  if v_card is not null then
    select c.account_id into v_account_id
      from public.payment_cards c
     where c.user_id = v_token.user_id and c.card_key = lower(v_card);
  end if;
  v_account_id := coalesce(v_account_id, v_rule_account_id, v_token.default_account_id);

  insert into public.transactions
    (user_id, occurred_on, amount, type, account_id, category_id, merchant, card_name, source, needs_review)
  values
    (v_token.user_id, (now() at time zone 'America/Bogota')::date, round(p_amount, 2), 'expense',
     v_account_id, v_category_id, left(v_merchant, 200), left(v_card, 100), 'apple_pay', true)
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'account_id', v_account_id,
    'category_id', v_category_id
  );
end;
$$;

revoke all on function public.ingest_apple_pay(text, numeric, text, text) from public;
grant execute on function public.ingest_apple_pay(text, numeric, text, text) to anon, authenticated;
