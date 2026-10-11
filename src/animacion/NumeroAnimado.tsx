import { useEffect } from "react";
import { TextInput, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTema } from "@/tema/TemaProvider";
import { TIPOGRAFIA } from "@/tema/tipografia";

const AnimadoInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  valor: number;
  // Se ejecuta en el hilo de UI: una función propia debe llevar la directiva "worklet".
  formato?: (n: number) => string;
  style?: StyleProp<TextStyle>;
};

function formatoMiles(n: number): string {
  "worklet";
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function NumeroAnimado({ valor, formato = formatoMiles, style }: Props) {
  const { colores } = useTema();
  const reducido = useReducedMotion();
  const actual = useSharedValue(reducido ? valor : 0);

  useEffect(() => {
    if (reducido) {
      actual.value = valor;
      return;
    }
    actual.value = withTiming(valor, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [valor, reducido, actual]);

  const propsAnimadas = useAnimatedProps(() => {
    "worklet";
    return { text: formato(actual.value) } as object;
  });

  const final = formato(valor);

  return (
    <AnimadoInput
      editable={false}
      pointerEvents="none"
      defaultValue={final}
      accessibilityLabel={final}
      animatedProps={propsAnimadas}
      style={[TIPOGRAFIA.cifra, { color: colores.texto, padding: 0 }, style]}
    />
  );
}
