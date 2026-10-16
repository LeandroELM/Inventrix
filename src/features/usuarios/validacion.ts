import type { Rol } from "@/features/auth/permisos";

// Misma regla que supabase/functions/admin-usuarios/logica.ts (runtimes distintos: duplicada).
export const PATRON_USUARIO = /^[a-z0-9._-]{3,30}$/;

// El teclado suele poner mayúscula inicial o un espacio final: se corrigen en vez de rechazarlos.
export function normalizarUsuario(texto: string): string {
  return texto.trim().toLowerCase();
}

export function usuarioValido(texto: string): boolean {
  return PATRON_USUARIO.test(normalizarUsuario(texto));
}

export const ETIQUETA_ROL: Record<Rol, "Administrador" | "Operativo"> = {
  admin: "Administrador",
  operativo: "Operativo",
};

export function mensajeAcceso({ usuario, password }: { usuario: string; password: string }): string {
  return [
    "Tu acceso a Inventrix",
    `Usuario: ${usuario}`,
    `Contraseña temporal: ${password}`,
    "Cámbiala en Configuración > Contraseña al entrar.",
  ].join("\n");
}
