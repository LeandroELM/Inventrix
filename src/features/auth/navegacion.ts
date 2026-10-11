import type { Rol } from "@/features/auth/permisos";

export type NombreTab = "index" | "administracion" | "nuevo" | "movimientos" | "configuracion";

export function tabsPara(rol: Rol): NombreTab[] {
  const todas: NombreTab[] = ["index", "administracion", "nuevo", "movimientos", "configuracion"];
  return rol === "admin" ? todas : todas.filter((t) => t !== "nuevo");
}
