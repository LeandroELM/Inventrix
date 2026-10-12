import type { TipoMovimiento } from "@/features/movimientos/api";
import { formatearCantidad, type Unidad } from "@/features/productos/unidades";

export function proyectar(existencias: number, cantidad: number, tipo: "entrada" | "salida"): number {
  const total = tipo === "entrada" ? existencias + cantidad : existencias - cantidad;
  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function validarSalida(existencias: number, cantidad: number): string | null {
  return cantidad > existencias ? "La cantidad supera las existencias disponibles." : null;
}

// Aviso previo en la UI; la alerta real la crea la base de datos.
export function generaAlerta(existencias: number, cantidad: number, puntoPedido: number): boolean {
  return existencias > puntoPedido && existencias - cantidad <= puntoPedido;
}

export function etiquetaMovimiento(tipo: TipoMovimiento, cantidad: number, unidad: Unidad): string {
  return `${tipo === "salida" || tipo === "baja" ? "−" : "+"}${formatearCantidad(cantidad, unidad)}`;
}
