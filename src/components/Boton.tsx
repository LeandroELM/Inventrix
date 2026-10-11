import { ActivityIndicator, Pressable, Text } from "react-native";

type Props = { titulo: string; onPress: () => void; disabled?: boolean; loading?: boolean };

export function Boton({ titulo, onPress, disabled = false, loading = false }: Props) {
  const inactivo = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inactivo, busy: loading }}
      disabled={inactivo}
      onPress={onPress}
      style={{ padding: 12, alignItems: "center", borderWidth: 1, opacity: inactivo ? 0.5 : 1 }}
    >
      {loading ? <ActivityIndicator /> : <Text>{titulo}</Text>}
    </Pressable>
  );
}
