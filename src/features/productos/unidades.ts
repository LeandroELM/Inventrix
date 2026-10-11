import type { Database } from "@/lib/database.types";

export type Unidad = Database["public"]["Enums"]["unidad_medida"];

export const UNIDADES: Record<Unidad, { nombre: string; abreviatura: string; entera: boolean }> = {
  unidad: { nombre: "Unidad", abreviatura: "unid.", entera: true },
  libra: { nombre: "Libra", abreviatura: "lb", entera: false },
  kilogramo: { nombre: "Kilogramo", abreviatura: "kg", entera: false },
  litro: { nombre: "Litro", abreviatura: "L", entera: false },
  caja: { nombre: "Caja", abreviatura: "cajas", entera: true },
  paquete: { nombre: "Paquete", abreviatura: "paq.", entera: true },
};

// Implementación manual: no depende de datos de locale de Intl en Hermes.
function formatearNumero(n: number): string {
  const [entera, decimal] = n.toFixed(2).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = decimal.replace(/0+$/, "");
  return dec ? `${conMiles}.${dec}` : conMiles;
}

export function formatearCantidad(cantidad: number, unidad: Unidad): string {
  return `${formatearNumero(cantidad)} ${UNIDADES[unidad].abreviatura}`;
}
