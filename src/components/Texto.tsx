import { Text, type TextProps } from "react-native";
import { useTema } from "@/tema/TemaProvider";
import { TIPOGRAFIA, type VarianteTexto } from "@/tema/tipografia";

export type TonoTexto =
  | "texto"
  | "secundario"
  | "exito"
  | "peligro"
  | "interactivo"
  | "sobrePrimario"
  | "sobreInteractivo";

type Props = TextProps & { variante?: VarianteTexto; tono?: TonoTexto };

export function Texto({ variante = "cuerpo", tono = "texto", style, ...resto }: Props) {
  const { colores } = useTema();
  const color = {
    texto: colores.texto,
    secundario: colores.textoSecundario,
    exito: colores.textoExito,
    peligro: colores.textoPeligro,
    interactivo: colores.interactivo,
    sobrePrimario: colores.sobrePrimario,
    sobreInteractivo: colores.sobreInteractivo,
  }[tono];
  return <Text {...resto} style={[TIPOGRAFIA[variante], { color }, style]} />;
}
