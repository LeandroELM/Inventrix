import { Texto } from "@/components/Texto";
import { UNIDADES, type Unidad } from "@/features/productos/unidades";
import { ESPACIO } from "@/tema/tokens";

type Props = { unidad: Unidad };

// Abreviatura de la unidad dentro de un `Campo`; el campo debe llevar `paddingRight: 56`.
export function SufijoUnidad({ unidad }: Props) {
  return (
    <Texto tono="secundario" style={{ position: "absolute", right: ESPACIO.m, top: 34, pointerEvents: "none" }}>
      {UNIDADES[unidad].abreviatura}
    </Texto>
  );
}
