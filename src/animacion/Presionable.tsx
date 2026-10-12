import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimadoPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  sinEscala?: boolean;
};

const CONFIG = { duration: 150, easing: Easing.out(Easing.quad) };

export function Presionable({ style, sinEscala, disabled, onPressIn, onPressOut, ...resto }: Props) {
  const reducido = useReducedMotion();
  const escala = useSharedValue(1);
  const animar = !disabled && !sinEscala && !reducido;
  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  return (
    <AnimadoPressable
      {...resto}
      disabled={disabled}
      onPressIn={(e) => {
        if (animar) escala.set(withTiming(0.96, CONFIG));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (animar) escala.set(withTiming(1, CONFIG));
        onPressOut?.(e);
      }}
      style={[style, estiloAnimado]}
    />
  );
}
