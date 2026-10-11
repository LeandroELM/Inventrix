import { supabase } from "@/lib/supabase";
import { traerTodo } from "@/lib/paginar";
import type { ProductoAPedir } from "@/features/inicio/api";
import type { Unidad } from "@/features/productos/unidades";

export type Alerta = {
  id: number;
  producto: string;
  unidad: Unidad;
  existencias: number;
  punto_pedido: number;
  leida: boolean;
  created_at: string;
};

export async function listarAlertas(): Promise<Alerta[]> {
  const { data, error } = await supabase
    .from("alertas")
    .select("id, existencias, punto_pedido, leida, created_at, productos(nombre, unidad)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data.map((a) => ({
    id: a.id,
    producto: a.productos?.nombre ?? "Producto",
    unidad: a.productos?.unidad ?? "unidad",
    existencias: Number(a.existencias),
    punto_pedido: Number(a.punto_pedido),
    leida: a.leida,
    created_at: a.created_at ?? "",
  }));
}

export async function marcarLeidas(): Promise<void> {
  const { error } = await supabase.rpc("marcar_alertas_leidas");
  if (error) throw error;
}

export async function listarAPedir(): Promise<ProductoAPedir[]> {
  const { data, error } = await supabase.from("productos_a_pedir").select("*").order("nombre");
  if (error) throw error;
  return data.map((p) => ({ ...p, existencias: Number(p.existencias), punto_pedido: Number(p.punto_pedido) })) as ProductoAPedir[];
}

// Reportes: pagina para no cortar la lista en 1000 filas.
export async function listarTodoAPedir(): Promise<ProductoAPedir[]> {
  return traerTodo<ProductoAPedir>(async (desde, hasta) => {
    const { data, error } = await supabase.from("productos_a_pedir").select("*").order("nombre").order("id").range(desde, hasta);
    if (error) throw error;
    return data.map((p) => ({ ...p, existencias: Number(p.existencias), punto_pedido: Number(p.punto_pedido) })) as ProductoAPedir[];
  });
}
