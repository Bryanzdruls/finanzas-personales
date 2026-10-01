-- Historial de intentos de registro automático (Apple Pay, Google Wallet, Bancolombia).
-- iOS no muestra qué envió una automatización; esto permite verlo en la app y diagnosticar.
create table public.ingest_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_id uuid references public.api_tokens (id) on delete set null,
  source text not null,
  status smallint not null,
  message text not null,
  payload text,
  created_at timestamptz not null default now()
);

create index ingest_events_user_created_idx on public.ingest_events (user_id, created_at desc);

alter table public.ingest_events enable row level security;

-- Solo lectura y borrado: los eventos los escribe la función, nunca el cliente.
create policy "eventos propios: leer" on public.ingest_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "eventos propios: borrar" on public.ingest_events
  for delete to authenticated using (user_id = (select auth.uid()));

-- Registra un intento para el dueño del token. Con token inválido no se guarda nada (no hay
-- a quién mostrárselo). Conserva los últimos 100 eventos por usuario.
create function public.log_ingest_event(
  p_token text,
  p_source text,
  p_status integer,
  p_message text,
  p_payload text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.api_tokens;
begin
  select * into v_token
    from public.api_tokens
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if not found then
    return;
  end if;

  insert into public.ingest_events (user_id, token_id, source, status, message, payload)
  values (v_token.user_id, v_token.id, left(coalesce(p_source, '?'), 30), p_status,
          left(coalesce(p_message, ''), 300), left(p_payload, 2000));

  delete from public.ingest_events
   where user_id = v_token.user_id
     and id in (
       select id from public.ingest_events
        where user_id = v_token.user_id
        order by created_at desc
        offset 100
     );
end;
$$;

revoke all on function public.log_ingest_event(text, text, integer, text, text) from public;
grant execute on function public.log_ingest_event(text, text, integer, text, text) to anon, authenticated;
