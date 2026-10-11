import { supabase } from "@/lib/supabase";
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
