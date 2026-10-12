import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import { ETIQUETAS_MOTIVO_SALIDA, MOTIVOS_SALIDA } from "@/features/movimientos/motivos";

describe("motivos de salida", () => {
  it("expone los cuatro motivos con su etiqueta", () => {
    expect(MOTIVOS_SALIDA).toEqual(["venta", "caducidad", "dano", "otros"]);
    expect(MOTIVOS_SALIDA.map((m) => ETIQUETAS_MOTIVO_SALIDA[m])).toEqual(["Venta", "Caducidad", "Daño", "Otros"]);
  });

  it("etiqueta la baja como una salida", () => {
    expect(etiquetaMovimiento("baja", 3, "unidad")).toMatch(/^−/);
    expect(etiquetaMovimiento("baja", 3, "unidad")).toBe(etiquetaMovimiento("salida", 3, "unidad"));
  });
});
