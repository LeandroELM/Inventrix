import { tabsPara } from "@/features/auth/navegacion";

describe("tabsPara", () => {
  test("admin ve las 5 pestañas en orden", () => {
    expect(tabsPara("admin")).toEqual(["index", "buscar", "nuevo", "administracion", "configuracion"]);
  });
  test("operativo no ve 'nuevo' ni administración", () => {
    expect(tabsPara("operativo")).toEqual(["index", "buscar", "movimientos", "configuracion"]);
  });
});
