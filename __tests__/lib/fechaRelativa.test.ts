import { fechaRelativa, grupoDia } from "@/lib/fechaRelativa";

describe("fechaRelativa", () => {
  const ahora = new Date(2026, 9, 11, 15, 0);

  it("muestra la hora para hoy", () => {
    expect(fechaRelativa(new Date(2026, 9, 11, 9, 5).toISOString(), ahora)).toBe("Hoy 09:05");
  });

  it("muestra la hora para ayer", () => {
    expect(fechaRelativa(new Date(2026, 9, 10, 23, 59).toISOString(), ahora)).toBe("Ayer 23:59");
  });

  it("muestra día/mes con ceros para fechas anteriores", () => {
    expect(fechaRelativa(new Date(2026, 9, 2, 8, 0).toISOString(), ahora)).toBe("02/10");
  });

  it("considera ayer al cambiar de día aunque falte menos de 24 h", () => {
    expect(fechaRelativa(new Date(2026, 0, 1, 0, 0).toISOString(), new Date(2026, 0, 2, 1, 0))).toBe("Ayer 00:00");
  });
});

describe("grupoDia", () => {
  const ahora = new Date(2026, 9, 11, 15, 0);

  it("agrupa en HOY, AYER o ANTERIORES", () => {
    expect(grupoDia(new Date(2026, 9, 11, 1, 0).toISOString(), ahora)).toBe("HOY");
    expect(grupoDia(new Date(2026, 9, 10, 23, 0).toISOString(), ahora)).toBe("AYER");
    expect(grupoDia(new Date(2026, 9, 9, 12).toISOString(), ahora)).toBe("ANTERIORES");
  });
});
