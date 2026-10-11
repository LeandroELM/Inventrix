import { TextInput, type TextInputProps } from "react-native";
import { useTema } from "@/tema/TemaProvider";
import { FUENTES } from "@/tema/tipografia";

type Props = TextInputProps & { invalido?: boolean };

export function EntradaTexto({ invalido: _invalido, style, ...resto }: Props) {
  const { colores } = useTema();
  return (
    <TextInput
      placeholderTextColor={colores.textoSecundario}
      {...resto}
      style={[
        { color: colores.texto, fontFamily: FUENTES.regular },
        style,
      ]}
    />
  );
}
