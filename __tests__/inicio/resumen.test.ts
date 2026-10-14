jest.mock("@/lib/supabase", () => ({ supabase: {} }));

import { filasResumen, textoResumen } from "@/features/inicio/api";

describe("textoResumen", () => {
  it("formatea los totales en el orden de UNIDADES", () => {
    expect(
      textoResumen([
        { unidad: "litro", total: 92 },
        { unidad: "unidad", total: 1284 },
        { unidad: "libra", total: 386 },
      ]),
    ).toEqual(["1,284 unid.", "386 lb", "92 L"]);
  });

  it("devuelve lista vacía sin datos", () => {
    expect(textoResumen([])).toEqual([]);
  });
});

describe("filasResumen", () => {
  it("filasResumen separa valor y unidad", () => {
    expect(filasResumen([{ unidad: "libra", total: 120 }])).toEqual([{ valor: "120", etiqueta: "lb" }]);
  });
});
