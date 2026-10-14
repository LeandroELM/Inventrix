import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BackHandler,
  Keyboard,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { useTema } from "@/tema/TemaProvider";

const DURACION = 250;
const FRACCION_ALTO = 0.7;
const UMBRAL_CIERRE = 0.3;
const ESQUINA = 24;
const MARGEN_SUPERIOR = 8;

type Props = {
  children: ReactNode;
  onCerrar: () => void;
  /** Zona de arrastre (junto al asa): solo aquí el gesto cierra la hoja. Recibe el cierre animado. */
  encabezado?: (cerrar: () => void) => ReactNode;
  /** Con true la hoja no se cierra (gesto, fondo ni atrás): p. ej. mientras hay una operación en curso. */
  bloqueado?: boolean;
};

export function HojaInferior({ children, onCerrar, encabezado, bloqueado = false }: Props) {
  const { colores } = useTema();
  const reducido = useReducedMotion();
  const { height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const [teclado, setTeclado] = useState(0);
  // Con edge-to-edge la ventana no se encoge: se sube la hoja la altura del teclado y se
  // limita su alto para que el encabezado siga en pantalla.
  const alto = Math.max(
    0,
    Math.min(Math.round(height * FRACCION_ALTO), height - teclado - top - MARGEN_SUPERIOR),
  );
  // progreso: 0 = abierta, 1 = fuera de pantalla (o invisible con movimiento reducido).
  const progreso = useSharedValue(1);
  const arrastre = useSharedValue(0);
  const cerrando = useSharedValue(false);

  useEffect(() => {
    progreso.set(withTiming(0, { duration: DURACION, easing: Easing.out(Easing.cubic) }));
  }, [progreso]);

  useEffect(() => {
    const mostrar = Keyboard.addListener("keyboardDidShow", (e) =>
      setTeclado(e.endCoordinates.height),
    );
    const ocultar = Keyboard.addListener("keyboardDidHide", () => setTeclado(0));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  const cerrar = useCallback(() => {
    if (bloqueado || cerrando.get()) return;
    cerrando.set(true);
    progreso.set(
      withTiming(1, { duration: DURACION, easing: Easing.in(Easing.cubic) }, (fin) => {
        if (fin) scheduleOnRN(onCerrar);
      }),
    );
  }, [bloqueado, cerrando, progreso, onCerrar]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      cerrar();
      return true;
    });
    return () => sub.remove();
  }, [cerrar]);

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-10, 10])
        .onUpdate((e) => {
          if (cerrando.get()) return;
          arrastre.set(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          if (cerrando.get()) return;
          if (!bloqueado && e.translationY > alto * UMBRAL_CIERRE) {
            cerrando.set(true);
            arrastre.set(
              withTiming(alto, { duration: DURACION }, (fin) => {
                if (fin) scheduleOnRN(onCerrar);
              }),
            );
          } else {
            arrastre.set(withTiming(0, { duration: DURACION }));
          }
        }),
    [alto, arrastre, bloqueado, cerrando, onCerrar],
  );

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
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: teclado,
            height: alto,
            backgroundColor: colores.superficie,
            borderTopLeftRadius: ESQUINA,
            borderTopRightRadius: ESQUINA,
            overflow: "hidden",
          },
          estiloHoja,
        ]}
      >
        <GestureDetector gesture={gesto}>
          <View>
            <View style={{ height: 16, alignItems: "center", justifyContent: "flex-end" }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colores.inactivo,
                }}
              />
            </View>
            {encabezado?.(cerrar)}
          </View>
        </GestureDetector>
        <View style={{ flex: 1 }}>{children}</View>
      </Animated.View>
    </View>
  );
}
