import { describe, expect, it } from "vitest";
import { movementParams, movementRef, parseBancolombiaMessage, splitMessages } from "./bancolombia";

// Formatos tomados de SMS y correos reales, con nombre, cuentas y llaves cambiados.
const REAL = {
  transfer:
    "Bancolombia: Transferiste $70,000 desde tu cuenta *1234 a la cuenta *93500000001 el 01/10/2026 a las 08:03. ¿Dudas? Llamanos al 018000931987. Estamos cerca.",
  qr: "Bancolombia: JUAN PEREZ GOMEZ pagaste $7,000.00 por codigo QR desde tu cuenta *1234 a la llave 0090000001 el 18/09/2026 a las 19:18. Con codigo QR es facil y de una. Dudas al 018000912345",
  qrEmail: `Bancolombia: JUAN PEREZ GOMEZ pagaste $8,400.00 por codigo QR desde tu cuenta *1234 a la llave 0090000002 el 30/09/2026 a las 17:27. Con codigo QR es facil y de una. Dudas al 018000912345.

Icon 1 Para que enviar plata siempre sea un éxito, estos consejos de seguridad:
• Revisa que la llave de la persona a quién le transfieras plata, coincida con el nombre que aparece en la pantalla de verificación de nuestra app.
• ¿Debes digitar el valor? Confirma que esté bien.
• Verifica que la persona a quien le transfieras plata sí la reciba. Comparte la pantalla de transferencia exitosa y revisa tus movimientos.
La seguridad la logramos entre todos.`,
  nuPayment:
    "Bancolombia: Pagaste $60,750.00 a NU Compania de Financiamiento desde tu producto 1234 el 22/09/2026 13:05:31. ¿Dudas? Llamanos al 6045109095. Estamos cerca",
  wenia:
    "Bancolombia: compraste $500,000.00 pesos en USDW con tu cuenta *1234 el 01/10/26 a las 06:59. Revisalos en tu Cuenta Global Wenia. Dudas al 018000931987",
};

describe("parseBancolombiaMessage: formatos reales", () => {
  it("transferencia a otra cuenta", () => {
    expect(parseBancolombiaMessage(REAL.transfer)).toMatchObject({
      kind: "transfer_out",
      direction: "out",
      amount: 70000,
      counterparty: "cuenta *93500000001",
      cardKey: "bancolombia *1234",
      date: "2026-10-01",
      time: "08:03",
    });
  });

  it("pago QR por SMS, aunque el mensaje empiece con el nombre", () => {
    expect(parseBancolombiaMessage(REAL.qr)).toMatchObject({
      kind: "qr",
      amount: 7000,
      counterparty: "llave 0090000001",
      description: "Pago QR a llave 0090000001",
      date: "2026-09-18",
      time: "19:18",
    });
  });

  it("pago QR por correo: ignora los consejos de seguridad del final", () => {
    expect(parseBancolombiaMessage(REAL.qrEmail)).toMatchObject({
      kind: "qr",
      amount: 8400,
      counterparty: "llave 0090000002",
      date: "2026-09-30",
      time: "17:27",
    });
    expect(splitMessages(REAL.qrEmail)).toHaveLength(1);
  });

  it("pago a Nu desde el producto (hora con segundos, sin 'a las')", () => {
    expect(parseBancolombiaMessage(REAL.nuPayment)).toMatchObject({
      kind: "payment",
      amount: 60750,
      counterparty: "nu compania de financiamiento",
      cardKey: "bancolombia *1234",
      date: "2026-09-22",
      time: "13:05",
    });
  });

  it("compra de USDW en Wenia (año de dos dígitos)", () => {
    expect(parseBancolombiaMessage(REAL.wenia)).toMatchObject({
      kind: "crypto_buy",
      amount: 500000,
      counterparty: "wenia",
      destHint: "wenia",
      date: "2026-10-01",
      time: "06:59",
    });
  });
});

describe("parseBancolombiaMessage: formatos deducidos", () => {
  it("ingreso", () => {
    expect(
      parseBancolombiaMessage(
        "Bancolombia: Recibiste una transferencia por $6,200,000 de ACME SAS en tu cuenta *1234 el 30/09/2026 a las 09:00.",
      ),
    ).toMatchObject({ kind: "income", direction: "in", amount: 6200000, counterparty: "acme sas" });
  });

  it("pago PSE", () => {
    expect(
      parseBancolombiaMessage("Bancolombia: Pagaste $85,000 por PSE a EPM desde tu cuenta *1234 el 30/09/2026 a las 11:00."),
    ).toMatchObject({ kind: "pse", amount: 85000 });
  });

  it("compra con débito", () => {
    expect(
      parseBancolombiaMessage(
        "Bancolombia: Compraste $45,000 en CREPES Y WAFFLES con tu tarjeta *1234 el 30/09/2026 a las 12:10.",
      ),
    ).toMatchObject({ kind: "purchase", amount: 45000, counterparty: "crepes y waffles" });
  });

  it("retiro en cajero va a efectivo", () => {
    expect(
      parseBancolombiaMessage("Bancolombia: Retiraste $200,000 en cajero desde tu cuenta *1234 el 30/09/2026 a las 15:00."),
    ).toMatchObject({ kind: "withdrawal", amount: 200000, destHint: "cash" });
  });

  it("monto con centavos", () => {
    expect(
      parseBancolombiaMessage(
        "Bancolombia: Transferiste $1,250,000.50 desde tu cuenta *1234 a la cuenta *987 el 01/10/2026 a las 08:05.",
      )?.amount,
    ).toBe(1250000.5);
  });

  it("verbo conocido pero tipo dudoso queda como movimiento genérico", () => {
    expect(
      parseBancolombiaMessage("Bancolombia: Realizaste un movimiento por $12,345 desde tu cuenta *1234 el 30/09/2026."),
    ).toMatchObject({ kind: "other", amount: 12345, description: "Movimiento Bancolombia", time: null });
  });
});

describe("parseBancolombiaMessage: lo que no es un movimiento", () => {
  it.each([
    ["clave dinámica", "Bancolombia: Tu clave dinámica es 123456. No la compartas."],
    ["publicidad", "Bancolombia: Conoce nuestros nuevos beneficios en la app."],
    ["otro banco", "Davivienda: Transferiste $10,000 desde tu cuenta"],
    ["sin monto", "Bancolombia: Transferiste desde tu cuenta *1234"],
  ])("%s → null", (_, text) => {
    expect(parseBancolombiaMessage(text)).toBeNull();
  });
});

describe("huella y parámetros", () => {
  it("la huella es fecha|monto|dirección|hora", () => {
    expect(movementRef(parseBancolombiaMessage(REAL.qr)!)).toBe("2026-09-18|7000.00|out|19:18");
  });

  it("los ingresos van como income y lo demás como expense", () => {
    const income = parseBancolombiaMessage(
      "Bancolombia: Recibiste una transferencia por $50,000 de ANA en tu cuenta *1234 el 30/09/2026.",
    )!;
    expect(movementParams(income, null).p_type).toBe("income");
    expect(movementParams(parseBancolombiaMessage(REAL.transfer)!, null).p_type).toBe("expense");
  });

  it("separa varios SMS pegados juntos", () => {
    expect(splitMessages(`${REAL.transfer}\n${REAL.qr}\n\n${REAL.wenia}`)).toHaveLength(3);
  });
});
