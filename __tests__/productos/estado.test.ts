import { estadoInventario, ETIQUETA_ESTADO } from "@/features/productos/estado";

describe("estadoInventario", () => {
  it("0 existencias es sin", () => expect(estadoInventario(0, 5)).toBe("sin"));
  it("igual al punto de pedido es bajo", () => expect(estadoInventario(10, 10)).toBe("bajo"));
  it("menor al punto es bajo", () => expect(estadoInventario(3, 10)).toBe("bajo"));
  it("mayor al punto es disponible", () => expect(estadoInventario(11, 10)).toBe("disponible"));
  it("0 existencias con punto 0 sigue siendo sin", () => expect(estadoInventario(0, 0)).toBe("sin"));
  it("etiquetas", () =>
    expect(ETIQUETA_ESTADO).toEqual({
      disponible: "Disponible",
      bajo: "Bajo inventario",
      sin: "Sin existencias",
    }));
});
