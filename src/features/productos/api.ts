import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { estadoInventario, type Estado, type Producto } from "@/features/productos/estado";

export type FiltroProductos = { texto?: string; estado?: Estado };

// Quita caracteres con significado especial en filtros PostgREST (or/ilike).
function limpiarTexto(texto: string): string {
  return texto.replace(/[,()%*\\]/g, " ").trim();
}

export async function listarProductos(filtro: FiltroProductos = {}): Promise<Producto[]> {
  let consulta = supabase.from("productos").select("*").eq("activo", true);
  const texto = filtro.texto ? limpiarTexto(filtro.texto) : "";
  if (texto) consulta = consulta.or(`nombre.ilike.%${texto}%,codigo.ilike.%${texto}%`);
  const { data, error } = await consulta.order("nombre");
  if (error) throw error;
  const { estado } = filtro;
  return estado ? data.filter((p) => estadoInventario(p.existencias, p.punto_pedido) === estado) : data;
}

export async function buscarPorCodigo(codigo: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("activo", true)
    .eq("codigo", codigo.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function obtenerProducto(id: string): Promise<Producto> {
  const { data, error } = await supabase.from("productos").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export type DatosAlta = {
  nombre: string;
  codigo: string;
  unidad: Producto["unidad"];
  cantidadInicial: number;
  puntoPedido: number;
};

export async function registrarProducto(input: DatosAlta): Promise<Producto> {
  const { data, error } = await supabase.rpc("registrar_producto", {
    p_nombre: input.nombre,
    p_codigo: input.codigo,
    p_unidad: input.unidad,
    p_cantidad_inicial: input.cantidadInicial,
    p_punto_pedido: input.puntoPedido,
  });
  if (error) throw error;
  return data;
}

export async function actualizarProducto(
  id: string,
  cambios: { nombre: string; unidad: Producto["unidad"]; puntoPedido: number },
): Promise<Producto> {
  const { data, error } = await supabase.rpc("actualizar_producto", {
    p_id: id,
    p_nombre: cambios.nombre,
    p_unidad: cambios.unidad,
    p_punto_pedido: cambios.puntoPedido,
  });
  if (error) throw error;
  return data;
}

export async function darBajaProducto(id: string, motivo: string): Promise<Producto> {
  const { data, error } = await supabase.rpc("dar_baja_producto", { p_id: id, p_motivo: motivo });
  if (error) throw error;
  return data;
}

export type MovimientoHistorial = Database["public"]["Views"]["historial_movimientos"]["Row"];

export async function ultimosMovimientos(productoId: string, limite = 5): Promise<MovimientoHistorial[]> {
  const { data, error } = await supabase
    .from("historial_movimientos")
    .select("*")
    .eq("producto_id", productoId)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}
