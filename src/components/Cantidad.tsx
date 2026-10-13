import { ControlCantidad } from "@/components/ControlCantidad";
import type { Unidad } from "@/features/productos/unidades";

type Props = { valor: string; unidad: Unidad; onChange: (valor: string) => void; error?: string };

export function Cantidad({ valor, unidad, onChange, error }: Props) {
  return (
    <ControlCantidad valor={valor} unidad={unidad} onCambio={onChange} etiqueta="Cantidad" error={error} />
  );
}
