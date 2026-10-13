import { UNIDADES, detalleProducto, formatearCantidad } from "@/features/productos/unidades";

describe("UNIDADES", () => {
  it("define abreviaturas y enteras", () => {
    expect(UNIDADES.unidad).toMatchObject({ abreviatura: "unid.", entera: true });
    expect(UNIDADES.libra).toMatchObject({ abreviatura: "lb", entera: false });
    expect(UNIDADES.kilogramo).toMatchObject({ abreviatura: "kg", entera: false });
    expect(UNIDADES.litro).toMatchObject({ abreviatura: "L", entera: false });
    expect(UNIDADES.caja).toMatchObject({ abreviatura: "cajas", entera: true });
    expect(UNIDADES.paquete).toMatchObject({ abreviatura: "paq.", entera: true });
  });
});

describe("formatearCantidad", () => {
  it("formatea con miles", () => expect(formatearCantidad(1284, "unidad")).toBe("1,284 unid."));
  it("decimales sin ceros sobrantes", () => {
    expect(formatearCantidad(2.5, "kilogramo")).toBe("2.5 kg");
    expect(formatearCantidad(10, "libra")).toBe("10 lb");
    expect(formatearCantidad(4, "unidad")).toBe("4 unid.");
    expect(formatearCantidad(2.5, "litro")).toBe("2.5 L");
  });
  it("máximo 2 decimales y miles con decimales", () => {
    expect(formatearCantidad(1234567.891, "libra")).toBe("1,234,567.89 lb");
    expect(formatearCantidad(1.999, "libra")).toBe("2 lb");
    expect(formatearCantidad(0, "caja")).toBe("0 cajas");
  });
});

describe("detalleProducto", () => {
  it("une codigo y abreviatura, con Sin codigo si falta", () => {
    expect(detalleProducto("C-1", "kilogramo")).toBe("C-1 · kg");
    expect(detalleProducto(null, "caja")).toBe("Sin código · cajas");
  });
});
