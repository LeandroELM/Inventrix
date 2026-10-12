import type { Database } from "@/lib/database.types";

export type MotivoBaja = Database["public"]["Enums"]["motivo_baja"];

export const MOTIVOS_BAJA: readonly MotivoBaja[] = ["descontinuado", "ya_no_se_vende", "error_registro", "otro"];

export const ETIQUETAS_MOTIVO_BAJA: Record<MotivoBaja, string> = {
  descontinuado: "Descontinuado",
  ya_no_se_vende: "Ya no se vende",
  error_registro: "Error de registro",
  otro: "Otro",
};
