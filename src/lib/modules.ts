// Partes opcionales de la app: cada quien activa solo lo que usa (en la bienvenida o en Configuración).
export const MODULES = ["investments", "credit_cards", "usd"] as const;
export type Module = (typeof MODULES)[number];

export const moduleInfo: Record<Module, { label: string; description: string }> = {
  credit_cards: {
    label: "Tarjetas de crédito",
    description: "Cupo, lo que debes y la fecha de pago de cada tarjeta.",
  },
  investments: {
    label: "Inversiones",
    description: "Bróker, pensión o cripto con su valor actual.",
  },
  usd: {
    label: "Dólares (USD)",
    description: "Cuentas en dólares y transferencias de pesos a dólares.",
  },
};
