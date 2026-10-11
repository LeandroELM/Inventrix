import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTema } from "@/tema/TemaProvider";

const DURACION = 250;
const FRACCION_ALTO = 0.7;
const UMBRAL_CIERRE = 0.3;
const ESQUINA = 24;

type Props = { children: ReactNode; onCerrar: () => void };

export function HojaInferior({ children, onCerrar }: Props) {
  const { colores } = useTema();
  const reducido = useReducedMotion();
  const { height } = useWindowDimensions();
  const alto = Math.round(height * FRACCION_ALTO);
  // progreso: 0 = abierta, 1 = fuera de pantalla (o invisible con movimiento reducido).
  const progreso = useSharedValue(1);
  const arrastre = useSharedValue(0);

  useEffect(() => {
    progreso.set(withTiming(0, { duration: DURACION, easing: Easing.out(Easing.cubic) }));
  }, [progreso]);

  function cerrar() {
    progreso.set(
      withTiming(1, { duration: DURACION, easing: Easing.in(Easing.cubic) }, (fin) => {
        if (fin) scheduleOnRN(onCerrar);
      }),
    );
  }

  const gesto = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      arrastre.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > alto * UMBRAL_CIERRE) {
        arrastre.set(
          withTiming(alto, { duration: DURACION }, (fin) => {
            if (fin) scheduleOnRN(onCerrar);
          }),
        );
      } else {
        arrastre.set(withTiming(0, { duration: DURACION }));
      }
    });

  const estiloFondo = useAnimatedStyle(() => ({ opacity: 1 - progreso.get() }));
  const estiloHoja = useAnimatedStyle(() =>
    reducido
      ? { opacity: 1 - progreso.get(), transform: [{ translateY: arrastre.get() }] }
      : {
          transform: [
            { translateY: interpolate(progreso.get(), [0, 1], [0, alto]) + arrastre.get() },
          ],
        },
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colores.veloHoja }, estiloFondo]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={StyleSheet.absoluteFill}
          onPress={cerrar}
        />
      </Animated.View>
      <GestureDetector gesture={gesto}>
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: alto,
              backgroundColor: colores.superficie,
              borderTopLeftRadius: ESQUINA,
              borderTopRightRadius: ESQUINA,
              overflow: "hidden",
            },
            estiloHoja,
          ]}
        >
          {children}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 8,
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colores.inactivo,
            }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
