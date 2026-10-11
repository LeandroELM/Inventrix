import { useState } from "react";
import { View, type TextInputProps } from "react-native";
import { EntradaTexto } from "@/components/EntradaTexto";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

type Props = Omit<TextInputProps, "accessibilityLabel"> & { label: string; error?: string };

export function Campo({ label, error, onFocus, onBlur, style, ...resto }: Props) {
  const { colores } = useTema();
  const [enfoque, setEnfoque] = useState(false);
  const borde = error ? colores.peligro : enfoque ? colores.interactivo : colores.borde;
  return (
    <View style={{ gap: 4 }}>
      <Texto variante="etiqueta" tono="secundario">
        {label}
      </Texto>
      <EntradaTexto
        accessibilityLabel={label}
        invalido={Boolean(error)}
        {...resto}
        onFocus={(e) => {
          setEnfoque(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfoque(false);
          onBlur?.(e);
        }}
        style={[
          {
            minHeight: 48,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: borde,
            backgroundColor: colores.superficie,
            paddingHorizontal: 12,
          },
          style,
        ]}
      />
      {error ? (
        <Texto accessibilityRole="alert" variante="pequeno" tono="peligro">
          {error}
        </Texto>
      ) : null}
    </View>
  );
}
