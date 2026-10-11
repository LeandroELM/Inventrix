import type { Rol } from "@/features/auth/permisos";

export type NombreTab = "index" | "buscar" | "nuevo" | "administracion" | "movimientos" | "configuracion";

export function tabsPara(rol: Rol): NombreTab[] {
  return rol === "admin"
    ? ["index", "buscar", "nuevo", "administracion", "configuracion"]
    : ["index", "buscar", "movimientos", "configuracion"];
}
