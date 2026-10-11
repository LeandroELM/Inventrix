// Copia de src/features/productos/unidades.ts (otro runtime: Deno). Mantener idéntica la salida.
export type Unidad = "unidad" | "libra" | "kilogramo" | "litro" | "caja" | "paquete";

const ABREVIATURAS: Record<Unidad, string> = {
  unidad: "unid.",
  libra: "lb",
  kilogramo: "kg",
  litro: "L",
  caja: "cajas",
  paquete: "paq.",
};

function formatearNumero(n: number): string {
  const [entera, decimal] = n.toFixed(2).split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = decimal.replace(/0+$/, "");
  return dec ? `${conMiles}.${dec}` : conMiles;
}

export function formatearCantidad(cantidad: number, unidad: Unidad): string {
  return `${formatearNumero(cantidad)} ${ABREVIATURAS[unidad]}`;
}
