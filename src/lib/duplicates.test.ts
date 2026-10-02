import { describe, expect, it } from "vitest";
import { type DuplicateCandidate, findDuplicateMatches, shiftDate } from "./duplicates";

const manual = (id: string, o: Partial<DuplicateCandidate> = {}): DuplicateCandidate => ({
  id,
  occurred_on: "2026-09-10",
  created_at: "2026-09-10T10:00:00Z",
  account_id: "bancolombia",
  amount: "50000.00",
  source: "manual",
  needs_review: false,
  external_ref: null,
  description: "Almuerzo",
  merchant: null,
  ...o,
});

const synced = (id: string, o: Partial<DuplicateCandidate> = {}) =>
  manual(id, {
    source: "bancolombia",
    needs_review: true,
    created_at: "2026-09-11T21:00:00Z",
    external_ref: "2026-09-10|50000.00|out|",
    description: null,
    ...o,
  });

describe("findDuplicateMatches", () => {
  it("empareja el sincronizado con el manual del mismo día", () => {
    expect(findDuplicateMatches([manual("m"), synced("s")]).get("s")?.id).toBe("m");
  });

  it("tolera un día de diferencia, no dos", () => {
    expect(findDuplicateMatches([manual("m", { occurred_on: "2026-09-09" }), synced("s")]).get("s")?.id).toBe("m");
    expect(findDuplicateMatches([manual("m", { occurred_on: "2026-09-08" }), synced("s")]).size).toBe(0);
  });

  it("exige misma cuenta y mismo monto", () => {
    expect(findDuplicateMatches([manual("m", { account_id: "nu" }), synced("s")]).size).toBe(0);
    expect(findDuplicateMatches([manual("m", { amount: "50001" }), synced("s")]).size).toBe(0);
  });

  it("marca el automático aunque el manual se haya anotado después", () => {
    expect(
      findDuplicateMatches([manual("m", { created_at: "2026-09-12T08:00:00Z" }), synced("s")]).get("s")?.id,
    ).toBe("m");
  });

  it("SMS y correo del mismo movimiento: el correo es el repetido", () => {
    const sms = synced("sms", { created_at: "2026-09-10T10:01:00Z", external_ref: "2026-09-10|50000.00|out|10:00" });
    expect(findDuplicateMatches([sms, synced("mail")]).get("mail")?.id).toBe("sms");
  });

  it("dos movimientos del banco con distinta hora no son duplicados entre sí", () => {
    const a = synced("a", { created_at: "2026-09-10T08:00:00Z", external_ref: "2026-09-10|50000.00|out|08:00" });
    const b = synced("b", { external_ref: "2026-09-10|50000.00|out|09:00" });
    expect(findDuplicateMatches([a, b]).size).toBe(0);
  });

  it("cada manual se usa en una sola pareja", () => {
    const a = synced("a", { created_at: "2026-09-10T08:00:00Z", external_ref: "2026-09-10|50000.00|out|08:00" });
    const b = synced("b", { external_ref: "2026-09-10|50000.00|out|09:00" });
    const matches = findDuplicateMatches([manual("m"), a, b]);
    expect(matches.size).toBe(1);
    expect([...matches.values()][0].id).toBe("m");
  });

  it("prefiere el manual sobre otro automático ya confirmado", () => {
    const confirmed = synced("c", { needs_review: false, created_at: "2026-09-10T09:00:00Z", external_ref: null });
    expect(findDuplicateMatches([confirmed, manual("m"), synced("s")]).get("s")?.id).toBe("m");
  });
});

describe("shiftDate", () => {
  it("cruza meses y años", () => {
    expect(shiftDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});
