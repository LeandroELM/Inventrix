import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";
import { RADIO, sombra } from "@/tema/tokens";

export const DURACION_CONFIRMACION_MS = 1400;

const LONGITUD_CHECK = 34;
const DURACION_CHECK_MS = 400;

type Opciones = { mensaje: string; alCerrar?: () => void };
type Contexto = { mostrar: (o: Opciones) => void };

const ConfirmacionContext = createContext<Contexto>({ mostrar: () => {} });

export function useConfirmacion(): Contexto {
  return useContext(ConfirmacionContext);
}

const PathAnimado = Animated.createAnimatedComponent(Path);

type Activa = Opciones & { id: number };

function Tarjeta({ mensaje }: { mensaje: string }) {
  const { colores, esquema } = useTema();
  const reducido = useReducedMotion();
  const trazo = useSharedValue(reducido ? 0 : LONGITUD_CHECK);
  const aparicion = useSharedValue(reducido ? 1 : 0);

  useEffect(() => {
    if (reducido) return;
    trazo.set(
      withTiming(0, { duration: DURACION_CHECK_MS, easing: Easing.out(Easing.cubic) }),
    );
    aparicion.set(withDelay(DURACION_CHECK_MS, withTiming(1, { duration: 200 })));
  }, [reducido, trazo, aparicion]);

  const propsCheck = useAnimatedProps(() => ({ strokeDashoffset: trazo.value }));
  const estiloMensaje = useAnimatedStyle(() => ({ opacity: aparicion.value }));

  return (
    <View
      style={[
        styles.tarjeta,
        sombra("elevada", esquema),
        { backgroundColor: colores.superficie },
      ]}
    >
      <View style={[styles.circulo, { backgroundColor: colores.exitoSuave }]}>
        <Svg width={48} height={48} viewBox="0 0 48 48">
          <PathAnimado
            d="M14 25 L21 32 L34 16"
            fill="none"
            stroke={colores.exito}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={LONGITUD_CHECK}
            animatedProps={propsCheck}
          />
        </Svg>
      </View>
      <Animated.View style={estiloMensaje}>
        <Texto variante="subtitulo" style={styles.mensaje}>
          {mensaje}
        </Texto>
      </Animated.View>
    </View>
  );
}

export function ConfirmacionProvider({ children }: { children: ReactNode }) {
  const { colores } = useTema();
  const [activa, setActiva] = useState<Activa | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contador = useRef(0);

  const mostrar = useCallback((o: Opciones) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    contador.current += 1;
    setActiva({ ...o, id: contador.current });
    AccessibilityInfo.announceForAccessibility(o.mensaje);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      setActiva(null);
      o.alCerrar?.();
    }, DURACION_CONFIRMACION_MS);
  }, []);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ConfirmacionContext.Provider value={valor}>
      {children}
      {activa && (
        <View
          pointerEvents="auto"
          style={[StyleSheet.absoluteFill, styles.capa, { backgroundColor: colores.velo }]}
        >
          <Tarjeta key={activa.id} mensaje={activa.mensaje} />
        </View>
      )}
    </ConfirmacionContext.Provider>
  );
}

const styles = StyleSheet.create({
  capa: { alignItems: "center", justifyContent: "center" },
  tarjeta: {
    width: 220,
    borderRadius: RADIO.tarjeta,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 16,
  },
  circulo: {
    width: 72,
    height: 72,
    borderRadius: RADIO.completo,
    alignItems: "center",
    justifyContent: "center",
  },
  mensaje: { textAlign: "center" },
});
