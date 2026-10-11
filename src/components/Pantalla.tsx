import type { ReactNode } from "react";
import { View } from "react-native";

export function Pantalla({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>{children}</View>;
}
