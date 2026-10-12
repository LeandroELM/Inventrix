import { useContext, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { useTema } from "@/tema/TemaProvider";

type Props = { children: ReactNode; scroll?: boolean; bordeSuperior?: boolean };

export function Pantalla({ children, scroll, bordeSuperior }: Props) {
  const { colores } = useTema();
  // Contexto directo: sin SafeAreaProvider (p. ej. en pruebas) el inset es 0 en vez de lanzar.
  const insets = useContext(SafeAreaInsetsContext);
  const arriba = 16 + (bordeSuperior ? (insets?.top ?? 0) : 0);
  if (scroll) {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: colores.fondo }}
        contentContainerStyle={{ padding: 16, paddingTop: arriba, gap: 12 }}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={{ flex: 1, padding: 16, paddingTop: arriba, gap: 12, justifyContent: "center", backgroundColor: colores.fondo }}>
      {children}
    </View>
  );
}
