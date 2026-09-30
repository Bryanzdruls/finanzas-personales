import type { Currency } from "./format";

export type AccountType = "bank" | "pension" | "broker" | "crypto" | "cash" | "other";
export type CategoryKind = "expense" | "income" | "debt";
export type TransactionType = "expense" | "income" | "transfer" | "debt_payment";

export const accountTypeLabels: Record<AccountType, string> = {
  bank: "Banco",
  pension: "Pensión",
  broker: "Bróker",
  crypto: "Cripto",
  cash: "Efectivo",
  other: "Otro",
};

export const categoryKindLabels: Record<CategoryKind, string> = {
  expense: "Gastos",
  income: "Ingresos",
  debt: "Deudas",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  expense: "Gasto",
  income: "Ingreso",
  transfer: "Transferencia",
  debt_payment: "Abono",
};

export const currencies: Currency[] = ["COP", "USD"];

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: string;
  color: string | null;
  archived: boolean;
};

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
};

export type Transaction = {
  id: string;
  occurred_on: string;
  amount: string;
  type: TransactionType;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  debt_id: string | null;
  description: string | null;
  merchant: string | null;
  needs_review: boolean;
};

// Resultado de un Server Action que se muestra en el formulario.
export type FormState = { error?: string } | undefined;
