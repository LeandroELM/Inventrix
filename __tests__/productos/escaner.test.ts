import { crearFiltroLecturas, normalizarCodigo } from "@/features/productos/escaner";

describe("normalizarCodigo", () => {
  it("quita espacios externos e internos", () => {
    expect(normalizarCodigo(" 750 123 ")).toBe("750123");
  });
});

describe("crearFiltroLecturas", () => {
  it("ignora la misma lectura dentro de la ventana", () => {
    const aceptar = crearFiltroLecturas(1500);
    expect(aceptar("750123", 0)).toBe(true);
    expect(aceptar("750123", 500)).toBe(false);
  });
  it("acepta la misma lectura pasada la ventana", () => {
    const aceptar = crearFiltroLecturas(1500);
    aceptar("750123", 0);
    expect(aceptar("750123", 1600)).toBe(true);
  });
  it("acepta un código distinto de inmediato", () => {
    const aceptar = crearFiltroLecturas(1500);
    aceptar("750123", 0);
    expect(aceptar("999", 100)).toBe(true);
  });
  it("reiniciar permite el mismo código enseguida", () => {
    const aceptar = crearFiltroLecturas(1500);
    aceptar("750123", 0);
    aceptar.reiniciar();
    expect(aceptar("750123", 100)).toBe(true);
  });
});
