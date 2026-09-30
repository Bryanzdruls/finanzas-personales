-- Pagos automáticos desde Google Wallet (app Android nativa que lee sus notificaciones).
alter type public.transaction_source add value if not exists 'google_pay';

-- Misma lógica que ingest_apple_pay, con el origen como parámetro.
create function public.ingest_payment(
  p_token text,
  p_amount numeric,
  p_merchant text,
  p_card text default null,
  p_source text default 'apple_pay'
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
  if p_source not in ('apple_pay', 'google_pay') then
    raise exception 'origen inválido' using errcode = '22023';
  end if;

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

  if v_merchant is not null then
    select r.category_id, r.account_id into v_category_id, v_rule_account_id
      from public.merchant_rules r
     where r.user_id = v_token.user_id
       and strpos(lower(v_merchant), r.pattern) > 0
     order by length(r.pattern) desc
     limit 1;
  end if;

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
     v_account_id, v_category_id, left(v_merchant, 200), left(v_card, 100),
     p_source::public.transaction_source, true)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'account_id', v_account_id, 'category_id', v_category_id);
end;
$$;

revoke all on function public.ingest_payment(text, numeric, text, text, text) from public;
grant execute on function public.ingest_payment(text, numeric, text, text, text) to anon, authenticated;

-- La firma anterior se mantiene para no romper nada que la llame.
create or replace function public.ingest_apple_pay(
  p_token text,
  p_amount numeric,
  p_merchant text,
  p_card text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.ingest_payment(p_token, p_amount, p_merchant, p_card, 'apple_pay');
$$;
