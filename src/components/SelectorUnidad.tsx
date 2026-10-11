import { Pressable, Text, View } from "react-native";
import { UNIDADES, type Unidad } from "@/features/productos/unidades";

type Props = { valor: Unidad; onChange: (u: Unidad) => void };

export function SelectorUnidad({ valor, onChange }: Props) {
  return (
    <View style={{ gap: 4 }}>
      <Text>Unidad</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(UNIDADES) as Unidad[]).map((u) => (
          <Pressable
            key={u}
            accessibilityRole="button"
            accessibilityLabel={UNIDADES[u].nombre}
            accessibilityState={{ selected: valor === u }}
            onPress={() => onChange(u)}
            style={{ borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, opacity: valor === u ? 1 : 0.5 }}
          >
            <Text>{UNIDADES[u].nombre}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
