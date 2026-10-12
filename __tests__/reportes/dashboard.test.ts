import { aDashboard, rangoDePeriodo } from "@/features/reportes/dashboard";

describe("rangoDePeriodo", () => {
  it("7d incluye hoy y los 6 días anteriores", () => {
    expect(rangoDePeriodo("7d", new Date(2026, 9, 11))).toEqual({ desde: "2026-10-05", hasta: "2026-10-11" });
  });

  it("30d incluye hoy y los 29 días anteriores", () => {
    expect(rangoDePeriodo("30d", new Date(2026, 9, 11))).toEqual({ desde: "2026-09-12", hasta: "2026-10-11" });
  });

  it("mes empieza el día 1 del mes en curso", () => {
    expect(rangoDePeriodo("mes", new Date(2026, 9, 11))).toEqual({ desde: "2026-10-01", hasta: "2026-10-11" });
    expect(rangoDePeriodo("mes", new Date(2026, 9, 1))).toEqual({ desde: "2026-10-01", hasta: "2026-10-01" });
  });

  it("cruza el cambio de año", () => {
    expect(rangoDePeriodo("7d", new Date(2027, 0, 3))).toEqual({ desde: "2026-12-28", hasta: "2027-01-03" });
  });
});

describe("aDashboard", () => {
  it("convierte claves snake_case y numéricos", () => {
    expect(
      aDashboard({
        mas_vendido: { producto_id: "p1", nombre: "Arroz", unidad: "libra", cantidad: "42.50" },
        menos_vendido: null,
        en_punto_pedido: 3,
        total_movimientos: 57,
        serie: [{ fecha: "2026-10-05", entradas: 4, salidas: 9 }],
      }),
    ).toEqual({
      masVendido: { productoId: "p1", nombre: "Arroz", unidad: "libra", cantidad: 42.5 },
      menosVendido: null,
      enPuntoPedido: 3,
      totalMovimientos: 57,
      serie: [{ fecha: "2026-10-05", entradas: 4, salidas: 9 }],
    });
  });
});
