import { ControlCantidad } from "@/components/ControlCantidad";
import type { Unidad } from "@/features/productos/unidades";

type Props = { valor: string; unidad: Unidad; onChange: (valor: string) => void };

export function Cantidad({ valor, unidad, onChange }: Props) {
  return <ControlCantidad valor={valor} unidad={unidad} onCambio={onChange} etiqueta="Cantidad" />;
}
