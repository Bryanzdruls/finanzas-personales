import { z } from "zod";
import { parseAmount } from "./format";

export const uuid = z.uuid("Selección inválida.");
// Un campo que no se envió (p. ej. "cuenta destino" en un gasto) o que quedó vacío es null.
export const optionalUuid = z.preprocess((v) => (v === "" || v === undefined ? null : v), uuid.nullable());
export const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
  z.string().max(200, "Máximo 200 caracteres.").nullable(),
);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.");
export const money = z.preprocess(
  (v) => (typeof v === "string" ? parseAmount(v) : v),
  z.number({ error: "Monto inválido." }).finite("Monto inválido."),
);
export const positiveMoney = money.pipe(z.number().positive("El monto debe ser mayor que 0."));

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

// Mensajes legibles para los errores de Postgres más comunes.
export function dbErrorMessage(error: { code?: string; message: string }) {
  switch (error.code) {
    case "23505":
      return "Ya existe un registro con ese nombre.";
    case "23503":
      return "No se puede eliminar porque tiene movimientos asociados.";
    case "23514":
      return "Los datos no cumplen las reglas (revisa monto y cuentas).";
    default:
      return `Error guardando: ${error.message}`;
  }
}
