import { forwardRef, useState, type ReactNode } from "react";
import { View, type TextInput, type TextInputProps } from "react-native";
import { EntradaTexto } from "@/components/EntradaTexto";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = Omit<TextInputProps, "accessibilityLabel"> & {
  label: string;
  error?: string;
  iconoInicio?: NombreIcono;
  accesorioFin?: ReactNode;
};

export const Campo = forwardRef<TextInput, Props>(function Campo(
  { label, error, iconoInicio, accesorioFin, onFocus, onBlur, style, ...resto },
  ref,
) {
  const { colores } = useTema();
  const [enfoque, setEnfoque] = useState(false);
  const borde = error ? colores.peligro : enfoque ? colores.interactivo : colores.borde;
  const conExtras = Boolean(iconoInicio) || Boolean(accesorioFin);
  const estiloCaja = {
    minHeight: 48,
    borderRadius: RADIO.campo,
    borderWidth: 1.5,
    borderColor: borde,
    backgroundColor: colores.superficie,
  };
  return (
    <View style={{ gap: 4 }}>
      <Texto variante="etiqueta" tono="secundario">
        {label}
      </Texto>
      {conExtras ? (
        <View style={[estiloCaja, { flexDirection: "row", alignItems: "center" }]}>
          {iconoInicio ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ paddingLeft: ESPACIO.m }}
            >
              <Icono nombre={iconoInicio} tamano={20} color={colores.textoSecundario} />
            </View>
          ) : null}
          <EntradaTexto
            ref={ref}
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
            style={[{ flex: 1, minHeight: 46, paddingHorizontal: ESPACIO.m }, style]}
          />
          {accesorioFin}
        </View>
      ) : (
        <EntradaTexto
          ref={ref}
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
          style={[{ ...estiloCaja, paddingHorizontal: 12 }, style]}
        />
      )}
      {error ? (
        <Texto accessibilityRole="alert" variante="pequeno" tono="peligro">
          {error}
        </Texto>
      ) : null}
    </View>
  );
});
