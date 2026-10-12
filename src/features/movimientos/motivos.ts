import type { MotivoSalida } from "@/features/movimientos/api";

export const MOTIVOS_SALIDA: readonly MotivoSalida[] = ["venta", "caducidad", "dano", "otros"];

export const ETIQUETAS_MOTIVO_SALIDA: Record<MotivoSalida, string> = {
  venta: "Venta",
  caducidad: "Caducidad",
  dano: "Daño",
  otros: "Otros",
};
