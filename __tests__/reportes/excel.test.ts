import { filasExistencias } from "@/features/reportes/excel";
import type { Producto } from "@/features/productos/estado";

const base: Producto = {
  id: "1",
  codigo: "750",
  nombre: "Arroz",
  unidad: "libra",
  existencias: 10,
  punto_pedido: 5,
  activo: true,
  created_at: "",
  updated_at: "",
  dado_baja_at: null,
  dado_baja_por: null,
  motivo_baja: null,
  detalle_baja: null,
};

describe("filasExistencias", () => {
  it("mapea productos a filas con unidad abreviada y fecha dd/mm/aaaa hh:mm", () => {
    expect(filasExistencias([base], new Date(2026, 9, 10, 9, 5))).toEqual([
      { Código: "750", Nombre: "Arroz", Unidad: "lb", "Cantidad disponible": 10, "Fecha de generación": "10/10/2026 09:05" },
    ]);
  });
});
