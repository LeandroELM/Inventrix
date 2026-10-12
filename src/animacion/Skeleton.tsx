import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTema } from "@/tema/TemaProvider";
import { RADIO } from "@/tema/tokens";

type Props = { ancho: DimensionValue; alto: number; radio?: number };

export function Skeleton({ ancho, alto, radio = RADIO.icono }: Props) {
  const { colores } = useTema();
  const reducido = useReducedMotion();
  const opacidad = useSharedValue(reducido ? 0.7 : 0.5);

  useEffect(() => {
    if (reducido) {
      opacidad.value = 0.7;
      return;
    }
    opacidad.value = 0.5;
    opacidad.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [reducido, opacidad]);

  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value }));

  return (
    <Animated.View
      accessibilityLabel="Cargando"
      style={[
        { width: ancho, height: alto, borderRadius: radio, backgroundColor: colores.linea },
        estilo,
      ]}
    />
  );
}

Skeleton.Fila = function SkeletonFila() {
  return <Skeleton ancho="100%" alto={56} radio={RADIO.campo} />;
};

Skeleton.Tarjeta = function SkeletonTarjeta() {
  return <Skeleton ancho="100%" alto={96} radio={RADIO.tarjeta} />;
};

Skeleton.Cifra = function SkeletonCifra() {
  return <Skeleton ancho={120} alto={32} radio={RADIO.icono} />;
};
