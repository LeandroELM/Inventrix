import { mensajeDeError } from "@/lib/errores";

const codigos = ["NO_AUTORIZADO","CANTIDAD_INVALIDA","EXISTENCIAS_INSUFICIENTES","PRODUCTO_INACTIVO","PRODUCTO_NO_ENCONTRADO","CODIGO_DUPLICADO","DETALLE_REQUERIDO","RANGO_INVALIDO","MOTIVO_REQUERIDO","DATOS_INVALIDOS"];
const GENERICO = "Ocurrió un error. Intenta de nuevo.";

describe("mensajeDeError", () => {
  it("mapea EXISTENCIAS_INSUFICIENTES", () => {
    expect(mensajeDeError({ message: "EXISTENCIAS_INSUFICIENTES" })).toBe("La cantidad supera las existencias disponibles.");
  });
  it("cada código tiene mensaje propio", () => {
    const vistos = new Set<string>();
    for (const c of codigos) {
      const m = mensajeDeError({ message: c, code: "P0001" });
      expect(m).not.toBe(GENERICO);
      expect(m).not.toBe(c);
      vistos.add(m);
    }
    expect(vistos.size).toBe(codigos.length);
  });
  it("acepta Error", () => {
    expect(mensajeDeError(new Error("CODIGO_DUPLICADO"))).toBe(mensajeDeError({ message: "CODIGO_DUPLICADO" }));
  });
  it("credenciales inválidas", () => {
    expect(mensajeDeError(new Error("Invalid login credentials"))).toBe("No fue posible iniciar sesión. Verifica tus datos.");
  });
  it("string con código", () => {
    expect(mensajeDeError("NO_AUTORIZADO")).not.toBe(GENERICO);
  });
  it("fallas de red", () => {
    const red = "Sin conexión. Revisa tu internet e intenta de nuevo.";
    expect(mensajeDeError(new TypeError("Network request failed"))).toBe(red);
    expect(mensajeDeError(new TypeError("Failed to fetch"))).toBe(red);
  });
  it("desconocido", () => {
    expect(mensajeDeError(undefined)).toBe(GENERICO);
    expect(mensajeDeError(42)).toBe(GENERICO);
    expect(mensajeDeError({ message: "otra cosa" })).toBe(GENERICO);
  });
});
