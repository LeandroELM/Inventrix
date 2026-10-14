import { conEncabezadosDia, fechaRelativa, grupoDia, horaLocal } from "@/lib/fechaRelativa";

describe("horaLocal", () => {
  it("horaLocal da HH:mm", () => {
    expect(horaLocal(new Date(2026, 9, 12, 9, 5).toISOString())).toBe("09:05");
  });
});

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

describe("conEncabezadosDia", () => {
  const ahora = new Date(2026, 9, 13, 12, 0);
  const fila = (d: Date) => ({ created_at: d.toISOString() });

  it("conEncabezadosDia agrupa hoy, ayer y anteriores", () => {
    const r = conEncabezadosDia(
      [
        fila(new Date(2026, 9, 13, 10, 0)),
        fila(new Date(2026, 9, 13, 8, 0)),
        fila(new Date(2026, 9, 12, 18, 0)),
        fila(new Date(2026, 9, 10, 9, 0)),
      ],
      ahora,
    );
    expect(r).toHaveLength(7);
    const textos = r.flatMap((e) => (e.tipo === "dia" ? [e.texto] : []));
    expect(textos).toEqual(["HOY", "AYER", "10/10"]);
    expect(r[0]).toEqual({ tipo: "dia", clave: "2026-10-13", texto: "HOY" });
  });

  it("23:30 local cae en su día", () => {
    const r = conEncabezadosDia([fila(new Date(2026, 9, 12, 23, 30))], ahora);
    expect(r[0]).toMatchObject({ tipo: "dia", texto: "AYER", clave: "2026-10-12" });
  });

  it("un día repartido en dos páginas lleva un solo encabezado", () => {
    const pagina1 = [fila(new Date(2026, 9, 12, 20, 0)), fila(new Date(2026, 9, 12, 19, 0))];
    const pagina2 = [fila(new Date(2026, 9, 12, 18, 0)), fila(new Date(2026, 9, 11, 9, 0))];
    const r = conEncabezadosDia([...pagina1, ...pagina2], ahora);
    expect(r.filter((e) => e.tipo === "dia" && e.clave === "2026-10-12")).toHaveLength(1);
  });
});
