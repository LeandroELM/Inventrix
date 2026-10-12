import { filasMovimientos, nombreArchivoReporte } from "@/features/reportes/excel";
import { rangoPeriodo } from "@/features/reportes/rango";

const fila = {
  fecha: new Date(2026, 9, 10, 9, 5).toISOString(),
  producto: "Arroz",
  codigo: "750",
  unidad: "caja" as const,
  tipo: "salida" as const,
  cantidad: 4,
  motivo: "caducidad" as const,
  usuario: "Ana",
  existencias_antes: 10,
  existencias_despues: 6,
};

describe("filasMovimientos", () => {
  it("traduce tipo, motivo y cantidad con unidad", () => {
    expect(filasMovimientos([fila])[0]).toEqual({
      Fecha: "10/10/2026 09:05",
      Producto: "Arroz",
      Código: "750",
      Tipo: "Salida",
      Cantidad: "4 cajas",
      Motivo: "Caducidad",
      Usuario: "Ana",
      "Existencias antes": "10 cajas",
      "Existencias después": "6 cajas",
    });
  });

  it("usa Entrada/Inicial y — sin motivo", () => {
    const r = filasMovimientos([
      { ...fila, tipo: "entrada", motivo: null },
      { ...fila, tipo: "inicial", motivo: null },
    ]);
    expect(r.map((x) => [x.Tipo, x.Motivo])).toEqual([
      ["Entrada", "—"],
      ["Inicial", "—"],
    ]);
  });
});

describe("filasMovimientos con bajas y nuevos motivos", () => {
  it("exporta la baja como Baja y sin motivo", () => {
    const r = filasMovimientos([{ ...fila, tipo: "baja", motivo: null }])[0];
    expect(r.Tipo).toBe("Baja");
    expect(r.Motivo).toBe("");
  });

  it("traduce Daño", () => {
    expect(filasMovimientos([{ ...fila, motivo: "dano" }])[0].Motivo).toBe("Daño");
  });
});

describe("nombreArchivoReporte", () => {
  it("usa inventrix-{tipo}-{aaaammdd}.xlsx", () => {
    expect(nombreArchivoReporte("salidas", new Date(2026, 0, 5))).toBe("inventrix-salidas-20260105.xlsx");
  });
});

describe("rangoPeriodo", () => {
  const ahora = new Date(2026, 9, 10, 15, 30);
  it("hoy: de 00:00 de hoy a 00:00 de mañana (hasta exclusivo)", () => {
    expect(rangoPeriodo("hoy", ahora)).toEqual({ desde: new Date(2026, 9, 10), hasta: new Date(2026, 9, 11) });
  });
  it("7 días incluye hoy y los 6 anteriores", () => {
    expect(rangoPeriodo("7d", ahora)).toEqual({ desde: new Date(2026, 9, 4), hasta: new Date(2026, 9, 11) });
  });
  it("30 días cruza el cambio de mes", () => {
    expect(rangoPeriodo("30d", ahora)).toEqual({ desde: new Date(2026, 8, 11), hasta: new Date(2026, 9, 11) });
  });
  it("personalizado incluye el día final completo", () => {
    const r = rangoPeriodo("personalizado", ahora, { desde: new Date(2026, 8, 1, 13), hasta: new Date(2026, 8, 30, 8) });
    expect(r).toEqual({ desde: new Date(2026, 8, 1), hasta: new Date(2026, 9, 1) });
  });
  it("personalizado sin fechas no filtra", () => {
    expect(rangoPeriodo("personalizado", ahora)).toEqual({});
  });
});
