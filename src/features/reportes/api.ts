import { supabase } from "@/lib/supabase";
import { traerTodo } from "@/lib/paginar";
import { listarTodosProductos } from "@/features/productos/api";
import { listarTodoAPedir } from "@/features/alertas/api";
import { filasAPedir, filasExistencias, filasMovimientos, type FilaMovimiento } from "@/features/reportes/excel";

export type TipoReporte = "existencias" | "a_pedir" | "entradas" | "salidas" | "historial";

export type FiltrosReporte = { desde?: Date; hasta?: Date; productoId?: string };

const TIPO_RPC = { entradas: "entrada", salidas: "salida", historial: null } as const;

// Devuelve las filas crudas de cada reporte. "entradas" usa tipo = entrada, por lo
// que excluye los movimientos "inicial"; "historial" (tipo nulo) incluye todos.
export async function obtenerReporte(tipo: TipoReporte, filtros: FiltrosReporte = {}): Promise<object[]> {
  if (tipo === "existencias") return listarTodosProductos({});
  if (tipo === "a_pedir") return listarTodoAPedir();
  const filas = await traerTodo(async (desde, hasta) => {
    const { data, error } = await supabase
      .rpc("reporte_movimientos", {
        p_tipo: TIPO_RPC[tipo] ?? undefined,
        p_desde: filtros.desde?.toISOString(),
        p_hasta: filtros.hasta?.toISOString(),
        p_producto_id: filtros.productoId,
      })
      .range(desde, hasta);
    if (error) throw error;
    return data;
  });
  return filas.map((m) => ({ ...m, cantidad: Number(m.cantidad), existencias_antes: Number(m.existencias_antes), existencias_despues: Number(m.existencias_despues) }));
}

// Filas legibles (tabla y Excel) a partir de lo que devuelve obtenerReporte.
export function filasDeReporte(tipo: TipoReporte, datos: object[], ahora: Date): Record<string, string | number>[] {
  if (tipo === "existencias") return filasExistencias(datos as Parameters<typeof filasExistencias>[0], ahora);
  if (tipo === "a_pedir") return filasAPedir(datos as Parameters<typeof filasAPedir>[0]);
  return filasMovimientos(datos as FilaMovimiento[]);
}
