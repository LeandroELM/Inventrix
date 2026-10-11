import { useEffect, useState } from "react";
import { TextInput, type StyleProp, type TextStyle } from "react-native";
import {
  Easing,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTema } from "@/tema/TemaProvider";
import { TIPOGRAFIA } from "@/tema/tipografia";

type Props = {
  valor: number;
  // Función JS normal: solo se ejecuta en el hilo de JS.
  formato?: (n: number) => string;
  style?: StyleProp<TextStyle>;
};

function formatoMiles(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function NumeroAnimado({ valor, formato = formatoMiles, style }: Props) {
  const { colores } = useTema();
  const reducido = useReducedMotion();
  const actual = useSharedValue(reducido ? valor : 0);
  const [animado, setAnimado] = useState(reducido ? valor : 0);

  useEffect(() => {
    if (reducido) return;
    actual.set(withTiming(valor, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [valor, reducido, actual]);

  // La animación corre en UI; solo el número viaja a JS para formatearlo allí.
  useAnimatedReaction(
    () => actual.value,
    (v, previo) => {
      if (v !== previo) scheduleOnRN(setAnimado, v);
    },
  );

  const final = formato(valor);
  const texto = reducido ? final : formato(animado);

  return (
    <TextInput
      editable={false}
      pointerEvents="none"
      value={texto}
      accessibilityLabel={final}
      style={[TIPOGRAFIA.cifra, { color: colores.texto, padding: 0 }, style]}
    />
  );
}
