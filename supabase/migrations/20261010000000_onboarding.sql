-- Configuración paso a paso: cada usuario nuevo arma sus cuentas en el asistente de bienvenida en vez de
-- recibir cuentas predefinidas, y activa solo los módulos que usa (inversiones, tarjetas, dólares).

alter table public.profiles
  add column onboarded_at timestamptz,
  add column modules text[] not null default '{}'
    check (modules <@ array['investments', 'credit_cards', 'usd']);

-- Quienes ya usan la app quedan configurados con todos los módulos.
update public.profiles
   set onboarded_at = now(),
       modules = array['investments', 'credit_cards', 'usd'];

-- Al registrarse: perfil y categorías; las cuentas se crean en el asistente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);

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
