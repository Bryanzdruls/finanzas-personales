import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

// Corre todas las migraciones en un Postgres en memoria (PGlite) con un esquema auth simulado,
// como se prueban antes de ejecutarlas en el SQL Editor de Supabase.
const MIGRATIONS = path.resolve(import.meta.dirname, "../migrations");
const USER = "11111111-1111-1111-1111-111111111111";

let db: PGlite;
let bancolombia: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  for (const file of fs.readdirSync(MIGRATIONS).sort()) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, file), "utf8"));
  }
  await db.query("insert into auth.users (id) values ($1)", [USER]);
  bancolombia = (
    await db.query<{ id: string }>(
      "insert into public.accounts (user_id, name, type) values ($1, 'Bancolombia', 'bank') returning id",
      [USER],
    )
  ).rows[0].id;
});

async function sync(date: string, ref: string, amount = 50000) {
  const { rows } = await db.query<{ r: { id: string; duplicate: boolean } }>(
    `select public.bank_movement_insert($1, $2, 'expense', $3, 'tienda', null, null, $4::date, $5, null, null) as r`,
    [USER, bancolombia, amount, date, ref],
  );
  return rows[0].r;
}

async function addManual(date: string, amount: number, description: string) {
  await db.query(
    `insert into public.transactions (user_id, occurred_on, amount, type, account_id, description)
     values ($1, $2, $3, 'expense', $4, $5)`,
    [USER, date, amount, bancolombia, description],
  );
}

describe("registro de usuario nuevo", () => {
  it("crea perfil sin configurar, categorías y ninguna cuenta", async () => {
    const other = "22222222-2222-2222-2222-222222222222";
    await db.query("insert into auth.users (id) values ($1)", [other]);
    const { rows } = await db.query<{ onboarded: boolean; modules: string[]; accounts: number; categories: number }>(
      `select p.onboarded_at is not null as onboarded, p.modules,
              (select count(*)::int from public.accounts a where a.user_id = p.id) as accounts,
              (select count(*)::int from public.categories c where c.user_id = p.id) as categories
         from public.profiles p where p.id = $1`,
      [other],
    );
    expect(rows[0]).toEqual({ onboarded: false, modules: [], accounts: 0, categories: 24 });
  });

  it("solo acepta módulos conocidos", async () => {
    await expect(db.query("update public.profiles set modules = array['otro'] where id = $1", [USER])).rejects.toThrow(
      /profiles_modules_check/,
    );
  });
});

describe("bank_movement_insert: duplicados", () => {
  it("el mismo movimiento por SMS y luego por correo se registra una sola vez", async () => {
    const sms = await sync("2026-09-01", "2026-09-01|50000.00|out|10:00");
    const mail = await sync("2026-09-01", "2026-09-01|50000.00|out|");
    expect(sms.duplicate).toBe(false);
    expect(mail).toEqual({ id: sms.id, duplicate: true });
  });

  it("dos movimientos iguales con distinta hora son distintos", async () => {
    const a = await sync("2026-09-02", "2026-09-02|50000.00|out|08:00");
    const b = await sync("2026-09-02", "2026-09-02|50000.00|out|09:00");
    expect(b.duplicate).toBe(false);
    expect(b.id).not.toBe(a.id);
  });

  it("si ya lo anotaste a mano el mismo día, no se crea", async () => {
    await addManual("2026-09-03", 30000, "almuerzo");
    expect((await sync("2026-09-03", "2026-09-03|30000.00|out|12:00", 30000)).duplicate).toBe(true);
  });

  it("con un día de diferencia sí se crea, para revisarlo y fusionarlo", async () => {
    await addManual("2026-09-04", 40000, "mercado");
    expect((await sync("2026-09-05", "2026-09-05|40000.00|out|", 40000)).duplicate).toBe(false);
  });

  it("un manual fusionado (con la huella del banco) no vuelve a duplicarse", async () => {
    await db.query(
      `insert into public.transactions (user_id, occurred_on, amount, type, account_id, description, external_ref)
       values ($1, '2026-09-06', 20000, 'expense', $2, 'taxi', '2026-09-07|20000.00|out|')`,
      [USER, bancolombia],
    );
    expect((await sync("2026-09-07", "2026-09-07|20000.00|out|18:30", 20000)).duplicate).toBe(true);
  });
});
