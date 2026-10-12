import type { Unidad } from "@/features/productos/unidades";

export type PeriodoDashboard = "7d" | "30d" | "mes";

export type ProductoVendido = { productoId: string; nombre: string; unidad: Unidad; cantidad: number };
export type PuntoSerie = { fecha: string; entradas: number; salidas: number };
export type Dashboard = {
  masVendido: ProductoVendido | null;
  menosVendido: ProductoVendido | null;
  enPuntoPedido: number;
  totalMovimientos: number;
  serie: PuntoSerie[];
};

// YYYY-MM-DD con los componentes locales (toISOString usaría UTC y corre el día).
function aFecha(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Rango inclusivo que termina hoy, en hora local del dispositivo.
export function rangoDePeriodo(periodo: PeriodoDashboard, hoy: Date): { desde: string; hasta: string } {
  const inicio =
    periodo === "mes"
      ? new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      : new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (periodo === "7d" ? 6 : 29));
  return { desde: aFecha(inicio), hasta: aFecha(hoy) };
}

type JsonVendido = { producto_id: string; nombre: string; unidad: Unidad; cantidad: number | string };

function aVendido(v: JsonVendido | null | undefined): ProductoVendido | null {
  if (!v) return null;
  return { productoId: v.producto_id, nombre: v.nombre, unidad: v.unidad, cantidad: Number(v.cantidad) };
}

// Convierte el jsonb de dashboard_reportes al modelo de la app.
export function aDashboard(json: unknown): Dashboard {
  const j = json as {
    mas_vendido?: JsonVendido | null;
    menos_vendido?: JsonVendido | null;
    en_punto_pedido: number | string;
    total_movimientos: number | string;
    serie: { fecha: string; entradas: number | string; salidas: number | string }[];
  };
  return {
    masVendido: aVendido(j.mas_vendido),
    menosVendido: aVendido(j.menos_vendido),
    enPuntoPedido: Number(j.en_punto_pedido),
    totalMovimientos: Number(j.total_movimientos),
    serie: j.serie.map((p) => ({ fecha: p.fecha, entradas: Number(p.entradas), salidas: Number(p.salidas) })),
  };
}
