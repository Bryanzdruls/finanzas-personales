# Mis Finanzas

App personal (PWA para iPhone) para llevar gastos, ingresos, deudas, abonos y saldos de cuentas mes a mes.

Stack: Next.js 16 + TypeScript + Tailwind · Supabase (Postgres, Auth, RLS) · Vercel.

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto gratis en <https://supabase.com> (región: `South America (São Paulo)`).
2. Aplica el esquema. Hay dos opciones:
   - **Desde el dashboard:** en *SQL Editor*, pega y ejecuta, en orden, cada archivo de `supabase/migrations/`.
   - **Con la CLI:**
     ```bash
     npx supabase login
     npx supabase link --project-ref TU_PROJECT_REF
     npx supabase db push
     ```
3. Configura el login con Google (ver abajo).
4. En *Authentication → URL Configuration*:
   - **Site URL:** tu dominio de Vercel (o `http://localhost:3000` mientras desarrollas).
   - **Redirect URLs:** `http://localhost:*/auth/callback` y, cuando despliegues, `https://TU-APP.vercel.app/auth/callback`.

#### Login con Google
1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto.
2. Ve a *Google Auth Platform → Branding / Audience*. Elige tipo **External** y déjalo en modo **Testing**. En *Test users* agrega tu correo de Google: solo esas cuentas podrán entrar.
3. Ve a *Clients → Create client → Web application*:
   - **Authorized redirect URIs:** `https://TU-PROYECTO.supabase.co/auth/v1/callback`
4. Copia el **Client ID** y el **Client secret**. Pégalos en Supabase en *Authentication → Sign In / Providers → Google* y actívalo.

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
Entra con **Continuar con Google**. Al crearse tu usuario se generan automáticamente tus cuentas (Bancolombia, Protección, Interactive Brokers, Wenia, Efectivo) y las categorías base.
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
| `debts` | Deudas: acreedor, monto total, lo abonado antes de la app, tasa, cuotas, día de pago, estado |
| `account_snapshots` | Saldo real reportado en una fecha (para inversiones) |
| `merchant_rules` | Comercio → categoría/cuenta (autocategorizar Apple Pay) |
| `payment_cards` | Tarjeta de Wallet → cuenta (se aprende al revisar pagos) |
| `api_tokens` | Tokens del Atajo de iOS (solo se guarda su hash) |
| `account_balances` | Vista: saldo actual por cuenta |
| `monthly_summary` | Vista: ingresos, gastos, abonos y neto por mes y moneda |
| `debt_balances` | Vista: abonado, pendiente y % de cada deuda |
| `net_worth` | Vista: activos − deudas por moneda |

Cada tabla tiene Row Level Security, así que cada usuario solo ve lo suyo.

## Apple Pay
Un Atajo de iOS (automatización *Transacción*) envía cada pago a `POST /api/apple-pay` con
`Authorization: Bearer <token>` y un JSON `{ amount, merchant, card }`. La función
`ingest_apple_pay` valida el token y crea el gasto marcado *por revisar*. Las instrucciones
paso a paso están en la app, en **Más → Apple Pay**.

## Roadmap
- [x] Fase 1: proyecto, PWA, esquema + RLS, login con Google
- [x] Fase 2: CRUD de cuentas, categorías, movimientos y dashboard mensual
- [x] Fase 3: deudas y abonos
- [x] Fase 4: Apple Pay vía Atajos (automatización "Transacción") + reglas por comercio
- [ ] Fase 5: gráficos, COP/USD, exportar CSV
