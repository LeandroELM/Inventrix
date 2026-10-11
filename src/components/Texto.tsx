import { Text, type TextProps } from "react-native";
import { useTema } from "@/tema/TemaProvider";
import { TIPOGRAFIA, type VarianteTexto } from "@/tema/tipografia";

export type TonoTexto =
  | "texto"
  | "secundario"
  | "exito"
  | "peligro"
  | "interactivo"
  | "sobrePrimario";

type Props = TextProps & { variante?: VarianteTexto; tono?: TonoTexto };

export function Texto({ variante = "cuerpo", tono = "texto", style, ...resto }: Props) {
  const { colores } = useTema();
  const color = {
    texto: colores.texto,
    secundario: colores.textoSecundario,
    exito: colores.textoExito,
    peligro: colores.peligro,
    interactivo: colores.interactivo,
    sobrePrimario: colores.sobrePrimario,
  }[tono];
  return <Text {...resto} style={[TIPOGRAFIA[variante], { color }, style]} />;
}
