import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useTema } from "@/tema/TemaProvider";

export function Pantalla({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  const { colores } = useTema();
  if (scroll) {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: colores.fondo }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center", backgroundColor: colores.fondo }}>
      {children}
    </View>
  );
}
