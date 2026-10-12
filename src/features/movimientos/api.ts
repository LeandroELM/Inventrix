import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { limpiarTexto } from "@/features/productos/api";

export type Movimiento = Database["public"]["Tables"]["movimientos"]["Row"];
export type MotivoSalida = Database["public"]["Enums"]["motivo_salida"];
export type TipoMovimiento = Database["public"]["Enums"]["tipo_movimiento"];

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

export const TAMANO_PAGINA = 30;

export type FilaHistorial = {
  id: number;
  created_at: string;
  producto_id: string;
  producto: string;
  codigo: string | null;
  unidad: Database["public"]["Enums"]["unidad_medida"];
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: MotivoSalida | null;
  existencias_antes: number;
  existencias_despues: number;
  usuario_id: string;
  usuario: string;
};

export type FiltroHistorial = {
  tipo?: "entrada" | "salida";
  texto?: string;
  productoId?: string;
};

export async function listarHistorial(filtro: FiltroHistorial & { pagina: number }): Promise<FilaHistorial[]> {
  let consulta = supabase.from("historial_movimientos").select("*");
  // "inicial" cuenta como entrada y "baja" como salida.
  if (filtro.tipo === "entrada") consulta = consulta.in("tipo", ["entrada", "inicial"]);
  else if (filtro.tipo === "salida") consulta = consulta.in("tipo", ["salida", "baja"]);
  if (filtro.productoId) consulta = consulta.eq("producto_id", filtro.productoId);
  const texto = filtro.texto ? limpiarTexto(filtro.texto) : "";
  if (texto) consulta = consulta.or(`producto.ilike.%${texto}%,codigo.ilike.%${texto}%`);
  const desde = filtro.pagina * TAMANO_PAGINA;
  const { data, error } = await consulta
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(desde, desde + TAMANO_PAGINA - 1);
  if (error) throw error;
  // La vista declara todo nullable en los tipos generados; en la práctica nunca lo es.
  return data as FilaHistorial[];
}
