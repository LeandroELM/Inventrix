export const DOMINIO_USUARIOS = "usuarios.inventrix.app";

export type Rol = "admin" | "operativo";

export interface AltaUsuario {
  usuario: string;
  nombre: string;
  rol: Rol;
  password: string;
}

const PATRON_USUARIO = /^[a-z0-9._-]{3,30}$/;

export function validarAltaUsuario(input: unknown): AltaUsuario {
  if (typeof input !== "object" || input === null) throw new Error("DATOS_INVALIDOS");
  const { usuario, nombre, rol, password } = input as Record<string, unknown>;
  if (
    typeof usuario !== "string" || !PATRON_USUARIO.test(usuario) ||
    typeof nombre !== "string" || nombre.trim() === "" || nombre.length > 120 ||
    (rol !== "admin" && rol !== "operativo") ||
    typeof password !== "string" || password.length < 8
  ) {
    throw new Error("DATOS_INVALIDOS");
  }
  return { usuario, nombre, rol, password };
}

export function emailDeUsuario(usuario: string): string {
  return `${usuario}@${DOMINIO_USUARIOS}`;
}
