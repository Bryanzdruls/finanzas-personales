# Mis Finanzas

App personal (PWA para iPhone) para llevar gastos, ingresos, deudas, abonos y saldos de cuentas mes a mes.

Stack: Next.js 16 + TypeScript + Tailwind · Supabase (Postgres, Auth, RLS) · Vercel.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto gratis en <https://supabase.com> (región: `South America (São Paulo)`).
2. Aplica el esquema. Hay dos opciones:
   - **Desde el dashboard:** en *SQL Editor*, pega y ejecuta `supabase/migrations/20260930000000_esquema_inicial.sql`.
   - **Con la CLI:**
     ```bash
     npx supabase login
     npx supabase link --project-ref TU_PROJECT_REF
     npx supabase db push
     ```
3. Cambia las plantillas de correo para que envíen **código** en vez de link. En *Authentication → Emails*, edita **Magic Link** y **Confirm signup** y pega el contenido de `supabase/templates/codigo.html` (usa `{{ .Token }}`).
   > La app usa código de 6 dígitos porque en iPhone la app instalada y Safari no comparten sesión, así que un magic link abriría Safari y no la app.
4. En *Authentication → URL Configuration*, pon como Site URL tu dominio de Vercel (o `http://localhost:3000` mientras desarrollas).

### 2. Variables de entorno
Copia `.env.example` a `.env.local` y rellena los valores de *Project Settings → API Keys*:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

### 3. Correr en local
```bash
npm install
npm run dev
```

### 4. Primer ingreso y cierre del registro
Entra con tu correo. Al crearse tu usuario se generan automáticamente tus cuentas (Bancolombia, Protección, Interactive Brokers, Wenia, Efectivo) y las categorías base.
Como la app es personal, después ve a *Authentication → Sign In / Providers* y desactiva **Allow new users to sign up**.

### 5. Desplegar e instalar en el iPhone
1. Sube el repo a GitHub e impórtalo en <https://vercel.com>. Agrega las mismas dos variables de entorno.
2. En el iPhone, abre la URL en **Safari**, toca **Compartir → Agregar a inicio**.

## Modelo de datos
| Tabla / vista | Qué guarda |
|---|---|
| `accounts` | Cuentas (banco, pensión, bróker, cripto, efectivo) con moneda COP/USD y saldo inicial |
| `categories` | Categorías de gasto, ingreso y deuda (con subcategorías) |
| `transactions` | Gastos, ingresos, transferencias y abonos a deudas |
| `debts` | Deudas: acreedor, monto total, tasa, cuotas, estado |
| `account_snapshots` | Saldo real reportado en una fecha (para inversiones) |
| `merchant_rules` | Comercio → categoría/cuenta (autocategorizar Apple Pay) |
| `account_balances` | Vista: saldo actual por cuenta |
| `monthly_summary` | Vista: ingresos, gastos, abonos y neto por mes y moneda |
| `debt_balances` | Vista: abonado, pendiente y % de cada deuda |
| `net_worth` | Vista: activos − deudas por moneda |

Cada tabla tiene Row Level Security, así que cada usuario solo ve lo suyo.

## Roadmap
- [x] Fase 1: proyecto, PWA, esquema + RLS, login con código
- [ ] Fase 2: CRUD de cuentas, categorías, movimientos y dashboard mensual
- [ ] Fase 3: deudas y abonos
- [ ] Fase 4: Apple Pay vía Atajos (automatización "Transacción") + reglas por comercio
- [ ] Fase 5: gráficos, COP/USD, exportar CSV
