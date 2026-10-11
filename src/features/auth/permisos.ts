export type Rol = "admin" | "operativo";

export type Accion =
  | "registrar_producto"
  | "editar_producto"
  | "dar_baja"
  | "ver_a_pedir"
  | "ver_reportes"
  | "ver_alertas"
  | "registrar_movimiento"
  | "ver_existencias"
  | "exportar_existencias"
  | "ver_historial";

const ACCIONES_OPERATIVO: ReadonlySet<Accion> = new Set<Accion>([
  "registrar_movimiento",
  "ver_existencias",
  "exportar_existencias",
  "ver_historial",
]);

export function puede(rol: Rol, accion: Accion): boolean {
  return rol === "admin" || ACCIONES_OPERATIVO.has(accion);
}
