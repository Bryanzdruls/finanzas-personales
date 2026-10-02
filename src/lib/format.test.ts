import { describe, expect, it } from "vitest";
import { formatAmountInput, parseAmount, parseWalletAmount } from "./format";

describe("parseAmount (lo que escribe el usuario)", () => {
  it.each([
    ["1.250.000", 1250000],
    ["12,50", 12.5],
    ["12.50", 12.5],
    ["$ 45.000", 45000],
    ["-200.000", -200000],
  ])("%s → %d", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it("vacío no es un número", () => {
    expect(parseAmount("")).toBeNaN();
  });
});

describe("parseWalletAmount (Atajo de Apple Pay y SMS)", () => {
  it.each([
    ["$45.000,00", 45000],
    ["COP 45.000", 45000],
    ["45,000.00", 45000],
    ["US$12.99", 12.99],
    ["$6,200,000", 6200000],
    ["Tarjeta 9006 $45.000", 45000],
  ])("%s → %d", (input, expected) => {
    expect(parseWalletAmount(input)).toBe(expected);
  });
});

describe("formatAmountInput", () => {
  it("separa miles en pesos y deja centavos en dólares", () => {
    expect(formatAmountInput(1250000, "COP")).toBe("1.250.000");
    expect(formatAmountInput(12.5, "USD")).toBe("12,5");
  });
});
