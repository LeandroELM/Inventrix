import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { useTema } from "@/tema/TemaProvider";
import { FUENTES } from "@/tema/tipografia";

type Props = TextInputProps & { invalido?: boolean };

export const EntradaTexto = forwardRef<TextInput, Props>(function EntradaTexto(
  { invalido: _invalido, style, ...resto },
  ref,
) {
  const { colores } = useTema();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colores.textoSecundario}
      {...resto}
      style={[
        { color: colores.texto, fontFamily: FUENTES.regular },
        style,
      ]}
    />
  );
});
