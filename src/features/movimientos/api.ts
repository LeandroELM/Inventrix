import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

export type Movimiento = Database["public"]["Tables"]["movimientos"]["Row"];
export type MotivoSalida = Database["public"]["Enums"]["motivo_salida"];

export type DatosMovimiento = {
  productoId: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  motivo?: MotivoSalida;
};

export async function registrarMovimiento(input: DatosMovimiento): Promise<Movimiento> {
  const { data, error } = await supabase.rpc("registrar_movimiento", {
    p_producto_id: input.productoId,
    p_tipo: input.tipo,
    p_cantidad: input.cantidad,
    p_motivo: input.motivo,
  });
  if (error) throw error;
  return data;
}
