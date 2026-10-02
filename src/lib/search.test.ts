import { describe, expect, it } from "vitest";
import { parseSearch } from "./search";

describe("parseSearch", () => {
  it("vacío no busca", () => {
    expect(parseSearch("")).toBeNull();
    expect(parseSearch("   ")).toBeNull();
    expect(parseSearch(undefined)).toBeNull();
    expect(parseSearch(["a", "b"])).toBeNull();
  });

  it("texto", () => {
    expect(parseSearch(" Rappi ")).toEqual({ text: "Rappi", amount: null });
  });

  it.each([
    ["45000", 45000],
    ["45.000", 45000],
    ["$ 45.000", 45000],
    ["12,50", 12.5],
  ])("monto %s", (q, amount) => {
    expect(parseSearch(q)?.amount).toBe(amount);
  });

  it("quita lo que rompe el filtro", () => {
    expect(parseSearch("pago (nu), 50%*")?.text).toBe("pago nu 50");
  });

  it("texto con números no es un monto", () => {
    expect(parseSearch("llave 0090000001")?.amount).toBeNull();
  });
});
