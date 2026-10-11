import { rutaDeNotificacion } from "@/features/alertas/ruta";

describe("rutaDeNotificacion", () => {
  it("acepta rutas internas", () => {
    expect(rutaDeNotificacion({ ruta: "/administracion/pedir" })).toBe("/administracion/pedir");
  });
  it("ignora valores que no son rutas internas", () => {
    expect(rutaDeNotificacion({ ruta: "https://malo.com" })).toBeNull();
    expect(rutaDeNotificacion({ ruta: "//malo.com" })).toBeNull();
    expect(rutaDeNotificacion({ ruta: 5 })).toBeNull();
    expect(rutaDeNotificacion({})).toBeNull();
    expect(rutaDeNotificacion(undefined)).toBeNull();
    expect(rutaDeNotificacion(null)).toBeNull();
  });
});
