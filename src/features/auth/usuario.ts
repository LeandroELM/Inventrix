export const DOMINIO_USUARIOS = "usuarios.inventrix.app";

export function emailDeUsuario(usuario: string): string {
  return `${usuario.trim().toLowerCase()}@${DOMINIO_USUARIOS}`;
}
