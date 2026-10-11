import { tabsPara } from "@/features/auth/navegacion";

describe("tabsPara", () => {
  test("admin ve las 5 pestañas en orden", () => {
    expect(tabsPara("admin")).toEqual(["index", "administracion", "nuevo", "movimientos", "configuracion"]);
  });
  test("operativo no ve 'nuevo'", () => {
    expect(tabsPara("operativo")).toEqual(["index", "administracion", "movimientos", "configuracion"]);
  });
});
