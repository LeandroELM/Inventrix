import {
  ETIQUETA_ROL,
  mensajeAcceso,
  normalizarUsuario,
  usuarioValido,
} from "@/features/usuarios/validacion";
import { mensajeDeError } from "@/lib/errores";

describe("validación de usuarios", () => {
  it("normaliza espacios y mayúsculas del teclado", () => {
    expect(normalizarUsuario("  Ana.Lopez ")).toBe("ana.lopez");
    expect(usuarioValido("Ana.Lopez ")).toBe(true);
  });

  it("aplica la misma regla que el servidor", () => {
    expect(usuarioValido("ab")).toBe(false);
    expect(usuarioValido("ana lopez")).toBe(false);
    expect(usuarioValido("a".repeat(31))).toBe(false);
    expect(usuarioValido("ana_lo-pez.2")).toBe(true);
  });

  it("etiquetas de rol", () => {
    expect(ETIQUETA_ROL).toEqual({ admin: "Administrador", operativo: "Operativo" });
  });

  it("mensaje de acceso para compartir", () => {
    expect(mensajeAcceso({ usuario: "ana", password: "Xk7mPq2Rtz" })).toBe(
      "Tu acceso a Inventrix\nUsuario: ana\nContraseña temporal: Xk7mPq2Rtz\nCámbiala en Configuración > Contraseña al entrar.",
    );
  });

  it("mensajes de los errores nuevos", () => {
    expect(mensajeDeError(new Error("USUARIO_EXISTENTE"))).toBe(
      "Ya existe un usuario con ese nombre.",
    );
    expect(mensajeDeError(new Error("USUARIO_NO_ENCONTRADO"))).toBe("No se encontró el usuario.");
    expect(mensajeDeError(new Error("ACCION_SOBRE_SI_MISMO"))).toBe(
      "No puedes cambiar tu propia cuenta desde aquí.",
    );
  });
});
