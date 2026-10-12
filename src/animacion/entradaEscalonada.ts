import { FadeInUp, ReduceMotion } from "react-native-reanimated";

export function entradaEscalonada(indice: number) {
  if (indice >= 6) return undefined;
  return FadeInUp.delay(indice * 60)
    .duration(300)
    .reduceMotion(ReduceMotion.System);
}
