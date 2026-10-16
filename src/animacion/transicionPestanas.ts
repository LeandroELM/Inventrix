import { Easing } from "react-native";
import type { BottomTabNavigationOptions } from "expo-router/tabs";

type Interpolador = NonNullable<BottomTabNavigationOptions["sceneStyleInterpolator"]>;
type Especificacion = NonNullable<BottomTabNavigationOptions["transitionSpec"]>;

// Lineal: la parte visible (la primera mitad) dura la mitad exacta, 180 ms.
export const DURACION_PESTANAS = 360;

// El progreso va de ±1 (fuera) a 0 (visible). La pestaña enfocada se dibuja encima, así que la
// nueva aparece en la primera mitad del recorrido y la anterior sigue opaca debajo: en ningún
// momento las dos están a medias y el fondo se transparenta (el parpadeo del fundido cruzado).
// Con la anterior ya tapada se desvanece en la segunda mitad sin que se note.
export const interpolarPestana: Interpolador = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, -0.5, 0, 0.5, 1],
      outputRange: [0, 1, 1, 1, 0],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, -0.5, 0.5, 1],
          outputRange: [-16, 0, 0, 16],
        }),
      },
    ],
  },
});

export const especificacionPestanas: Especificacion = {
  animation: "timing",
  config: { duration: DURACION_PESTANAS, easing: Easing.linear },
};
