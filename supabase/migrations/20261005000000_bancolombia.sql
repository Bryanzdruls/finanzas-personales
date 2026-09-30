-- Movimientos de Bancolombia leídos de sus SMS (Atajo de iOS) y correos (Gmail + Apps Script).
alter type public.transaction_source add value if not exists 'bancolombia';

-- Una regla también puede convertir el movimiento en transferencia a una cuenta propia
-- (p. ej. "cuenta *123456789" -> transferencia a Nu). Se aprende al revisar.
alter table public.merchant_rules
  add column to_account_id uuid,
  add foreign key (to_account_id, user_id) references public.accounts (id, user_id) on delete cascade;

-- Registra un movimiento bancario. p_type: 'expense' (transferencia enviada, PSE) o 'income'.
-- p_card_key: la cuenta de origen/destino tal como la nombra el banco ("bancolombia *134"), para
-- aprender a qué cuenta de la app corresponde. Evita duplicados: el mismo movimiento llega
-- por SMS y por correo con minutos de diferencia.
create function public.ingest_bank_movement(
  p_token text,
  p_type text,
  p_amount numeric,
  p_counterparty text,
  p_description text,
  p_card_key text,
  p_occurred_on date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.api_tokens;
  v_counterparty text := nullif(lower(trim(p_counterparty)), '');
  v_card text := nullif(lower(trim(p_card_key)), '');
  v_occurred_on date := coalesce(p_occurred_on, (now() at time zone 'America/Bogota')::date);
  v_type public.transaction_type;
  v_account_id uuid;
  v_category_id uuid;
  v_rule_account_id uuid;
  v_to_account_id uuid;
  v_id uuid;
begin
  if p_type not in ('expense', 'income') then
    raise exception 'tipo inválido' using errcode = '22023';
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

  -- Mismo movimiento por el otro canal (SMS vs correo) en los últimos 30 minutos.
  -- Se compara con el tipo original: una regla puede haberlo convertido en transferencia.
  select t.id into v_id
    from public.transactions t
   where t.user_id = v_token.user_id
     and t.source = 'bancolombia'
     and t.amount = round(p_amount, 2)
     and t.occurred_on = v_occurred_on
     and (case when p_type = 'income' then t.type = 'income' else t.type in ('expense', 'transfer') end)
     and t.created_at > now() - interval '30 minutes'
   limit 1;
  if found then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;

  if v_counterparty is not null then
    select r.category_id, r.account_id, r.to_account_id
      into v_category_id, v_rule_account_id, v_to_account_id
      from public.merchant_rules r
     where r.user_id = v_token.user_id
       and strpos(v_counterparty, r.pattern) > 0
     order by length(r.pattern) desc
     limit 1;
  end if;

  -- Una misma contraparte puede aparecer en gastos e ingresos: la categoría debe ser del tipo.
  if v_category_id is not null and not exists (
    select 1 from public.categories c where c.id = v_category_id and c.kind::text = p_type
  ) then
    v_category_id := null;
  end if;

  if v_card is not null then
    select c.account_id into v_account_id
      from public.payment_cards c
     where c.user_id = v_token.user_id and c.card_key = v_card;
  end if;
  v_account_id := coalesce(v_account_id, v_rule_account_id, v_token.default_account_id);

  v_type := p_type::public.transaction_type;
  if p_type = 'expense' and v_to_account_id is not null and v_to_account_id <> v_account_id then
    v_type := 'transfer';
    v_category_id := null;
  else
    v_to_account_id := null;
  end if;

  insert into public.transactions
    (user_id, occurred_on, amount, type, account_id, to_account_id, category_id,
     merchant, description, card_name, source, needs_review)
  values
    (v_token.user_id, v_occurred_on, round(p_amount, 2), v_type, v_account_id, v_to_account_id,
     v_category_id, left(v_counterparty, 200), left(nullif(trim(p_description), ''), 200),
     left(v_card, 100), 'bancolombia', true)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'duplicate', false, 'type', v_type);
end;
$$;

revoke all on function public.ingest_bank_movement(text, text, numeric, text, text, text, date) from public;
grant execute on function public.ingest_bank_movement(text, text, numeric, text, text, text, date)
  to anon, authenticated;
