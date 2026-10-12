import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { RADIO, sombra } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  relleno?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Tarjeta({ children, onPress, relleno = 16, accessibilityLabel, style }: Props) {
  const { colores, esquema } = useTema();
  const estilo = [
    {
      backgroundColor: colores.superficie,
      borderRadius: RADIO.tarjeta,
      padding: relleno,
    },
    sombra("suave", esquema),
    style,
  ];
  if (onPress) {
    return (
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={estilo}
      >
        {children}
      </Presionable>
    );
  }
  return (
    <View accessibilityLabel={accessibilityLabel} style={estilo}>
      {children}
    </View>
  );
}
