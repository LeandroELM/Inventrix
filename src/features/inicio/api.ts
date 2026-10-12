import { supabase } from "@/lib/supabase";
import type { Rol } from "@/features/auth/permisos";
import { listarHistorial, type FilaHistorial } from "@/features/movimientos/api";
import { obtenerDashboard } from "@/features/reportes/api";
import { aFecha } from "@/features/reportes/dashboard";
import { formatearCantidad, UNIDADES, type Unidad } from "@/features/productos/unidades";

export type ResumenUnidad = { unidad: Unidad; total: number };

export type ProductoAPedir = {
  id: string;
  nombre: string;
  codigo: string | null;
  unidad: Unidad;
  existencias: number;
  punto_pedido: number;
};

export type Inicio = {
  productosActivos: number;
  resumen: ResumenUnidad[];
  aPedir?: { total: number; primeros: ProductoAPedir[] };
  recientes: FilaHistorial[];
  hoy?: { entradas: number; salidas: number };
};

// Totales por unidad, en el orden de UNIDADES; nunca mezcla unidades.
export function textoResumen(resumen: ResumenUnidad[]): string[] {
  const orden = Object.keys(UNIDADES);
  return [...resumen]
    .sort((a, b) => orden.indexOf(a.unidad) - orden.indexOf(b.unidad))
    .map((r) => formatearCantidad(r.total, r.unidad));
}

// Entradas y salidas del día; es un dato accesorio, así que un fallo se descarta.
async function movimientosDeHoy(ahora: Date): Promise<Inicio["hoy"]> {
  try {
    const dia = aFecha(ahora);
    const { serie } = await obtenerDashboard(dia, dia);
    const punto = serie.find((p) => p.fecha === dia);
    return { entradas: punto?.entradas ?? 0, salidas: punto?.salidas ?? 0 };
  } catch {
    return undefined;
  }
}

export async function obtenerInicio(rol: Rol, ahora: Date = new Date()): Promise<Inicio> {
  const [activos, resumen, aPedir, recientes, hoy] = await Promise.all([
    supabase.from("productos").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase.rpc("resumen_existencias"),
    rol === "admin"
      ? supabase.from("productos_a_pedir").select("*", { count: "exact" }).limit(3)
      : Promise.resolve(null),
    listarHistorial({ pagina: 0 }).then((f) => f.slice(0, 5)),
    rol === "admin" ? movimientosDeHoy(ahora) : Promise.resolve(undefined),
  ]);
  if (activos.error) throw activos.error;
  if (resumen.error) throw resumen.error;
  if (aPedir?.error) throw aPedir.error;
  return {
    productosActivos: activos.count ?? 0,
    resumen: resumen.data.map((r) => ({ unidad: r.unidad, total: Number(r.total) })),
    aPedir: aPedir
      ? { total: aPedir.count ?? aPedir.data.length, primeros: aPedir.data as ProductoAPedir[] }
      : undefined,
    recientes,
    hoy,
  };
}

export async function contarAlertasNoLeidas(): Promise<number> {
  const { count, error } = await supabase
    .from("alertas")
    .select("*", { count: "exact", head: true })
    .eq("leida", false);
  if (error) throw error;
  return count ?? 0;
}
