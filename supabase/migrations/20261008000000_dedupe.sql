-- Evita duplicados al sincronizar: los movimientos de Bancolombia registrados antes de la huella
-- (external_ref) y los anotados a mano no se reconocían cuando llegaba el correo del mismo movimiento.

-- 1) Huella para los movimientos de Bancolombia anteriores, sin hora (coincide con cualquier hora).
--    Mismo formato que movementRef en src/lib/bancolombia.ts: fecha|monto con 2 decimales|in/out|hora
update public.transactions
   set external_ref = to_char(occurred_on, 'YYYY-MM-DD') || '|' || to_char(amount, 'FM999999999990.00') || '|'
                      || (case when type = 'income' then 'in' else 'out' end) || '|'
 where source = 'bancolombia'
   and external_ref is null;

-- 2) La función de registro también compara contra movimientos manuales del mismo día, monto y cuenta.
create or replace function public.bank_movement_insert(
  p_user uuid,
  p_default_account uuid,
  p_type text,
  p_amount numeric,
  p_counterparty text,
  p_description text,
  p_card_key text,
  p_occurred_on date,
  p_external_ref text,
  p_dest_hint text,
  p_fx_rate numeric
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_counterparty text := nullif(lower(trim(p_counterparty)), '');
  v_card text := nullif(lower(trim(p_card_key)), '');
  v_occurred_on date := coalesce(p_occurred_on, (now() at time zone 'America/Bogota')::date);
  v_ref text := nullif(trim(p_external_ref), '');
  v_type public.transaction_type;
  v_account_id uuid;
  v_category_id uuid;
  v_rule_account_id uuid;
  v_to_account_id uuid;
  v_to_amount numeric;
  v_src_currency text;
  v_dst_currency text;
  v_id uuid;
begin
  if p_type not in ('expense', 'income') then
    raise exception 'tipo inválido' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1e13 then
    raise exception 'monto inválido' using errcode = '22023';
  end if;

  -- Duplicado: mismo día, monto y dirección; misma hora, o sin hora en alguno de los dos
  -- (el correo y el SMS del mismo movimiento, o una sincronización posterior).
  if v_ref is not null then
    select t.id into v_id
      from public.transactions t
     where t.user_id = p_user
       and t.source = 'bancolombia'
       and t.external_ref like split_part(v_ref, '|', 1) || '|' || split_part(v_ref, '|', 2) || '|'
                               || split_part(v_ref, '|', 3) || '|%'
       and (split_part(v_ref, '|', 4) = ''
            or split_part(t.external_ref, '|', 4) in ('', split_part(v_ref, '|', 4)))
     limit 1;
  else
    select t.id into v_id
      from public.transactions t
     where t.user_id = p_user
       and t.source = 'bancolombia'
       and t.amount = round(p_amount, 2)
       and t.occurred_on = v_occurred_on
       and (case when p_type = 'income' then t.type = 'income' else t.type in ('expense', 'transfer') end)
       and t.created_at > now() - interval '30 minutes'
     limit 1;
  end if;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;

  if v_counterparty is not null then
    select r.category_id, r.account_id, r.to_account_id
      into v_category_id, v_rule_account_id, v_to_account_id
      from public.merchant_rules r
     where r.user_id = p_user
       and strpos(v_counterparty, r.pattern) > 0
     order by length(r.pattern) desc
     limit 1;
  end if;

  if v_category_id is not null and not exists (
    select 1 from public.categories c where c.id = v_category_id and c.kind::text = p_type
  ) then
    v_category_id := null;
  end if;

  if v_card is not null then
    select c.account_id into v_account_id
      from public.payment_cards c
     where c.user_id = p_user and c.card_key = v_card;
  end if;
  v_account_id := coalesce(v_account_id, v_rule_account_id, p_default_account);

  -- También es duplicado si ya hay un movimiento manual (o automático anterior a la huella) del
  -- mismo día, monto y cuenta: el usuario lo anotó a mano antes de que llegara el correo.
  select t.id into v_id
    from public.transactions t
   where t.user_id = p_user
     and t.account_id = v_account_id
     and t.occurred_on = v_occurred_on
     and t.amount = round(p_amount, 2)
     and (case when p_type = 'income' then t.type = 'income' else t.type in ('expense', 'transfer') end)
     and (t.source <> 'bancolombia' or t.external_ref is null)
   limit 1;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;

  -- Destino probable si ninguna regla lo define: Wenia (compra de USDW) o efectivo (retiro).
  if v_to_account_id is null and p_type = 'expense' then
    if p_dest_hint = 'wenia' then
      select a.id into v_to_account_id from public.accounts a
       where a.user_id = p_user and not a.archived and lower(a.name) like '%wenia%'
       order by a.created_at limit 1;
    elsif p_dest_hint = 'cash' then
      select a.id into v_to_account_id from public.accounts a
       where a.user_id = p_user and not a.archived and a.type = 'cash'
       order by a.created_at limit 1;
    end if;
  end if;

  v_type := p_type::public.transaction_type;
  if p_type = 'expense' and v_to_account_id is not null and v_to_account_id <> v_account_id then
    v_type := 'transfer';
    v_category_id := null;
    select currency into v_src_currency from public.accounts where id = v_account_id;
    select currency into v_dst_currency from public.accounts where id = v_to_account_id;
    -- Entre monedas: se estima con la TRM del día; se corrige al revisar.
    if v_src_currency <> v_dst_currency and p_fx_rate > 0 then
      v_to_amount := case when v_src_currency = 'COP' then round(p_amount / p_fx_rate, 2)
                          else round(p_amount * p_fx_rate, 2) end;
    end if;
  else
    v_to_account_id := null;
  end if;

  insert into public.transactions
    (user_id, occurred_on, amount, type, account_id, to_account_id, to_amount, category_id,
     merchant, description, card_name, source, needs_review, external_ref)
  values
    (p_user, v_occurred_on, round(p_amount, 2), v_type, v_account_id, v_to_account_id, v_to_amount,
     v_category_id, left(v_counterparty, 200), left(nullif(trim(p_description), ''), 200),
     left(v_card, 100), 'bancolombia', true, left(v_ref, 120))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'duplicate', false, 'type', v_type);
end;
$$;

revoke all on function public.bank_movement_insert(uuid, uuid, text, numeric, text, text, text, date, text, text, numeric)
  from public, anon, authenticated;
