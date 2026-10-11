import type { Database } from "@/lib/database.types";

export type Producto = Database["public"]["Tables"]["productos"]["Row"];
export type Estado = "disponible" | "bajo" | "sin";

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  disponible: "Disponible",
  bajo: "Bajo inventario",
  sin: "Sin existencias",
};

export function estadoInventario(existencias: number, puntoPedido: number): Estado {
  if (existencias === 0) return "sin";
  if (existencias <= puntoPedido) return "bajo";
  return "disponible";
}
