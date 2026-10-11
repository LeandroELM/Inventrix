import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, type ReactNode } from "react";

void SplashScreen.preventAutoHideAsync().catch(() => {});

export function CargadorFuentes({ children }: { children: ReactNode }) {
  const [cargada, error] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold });
  const lista = cargada || error !== null;

  useEffect(() => {
    if (lista) void SplashScreen.hideAsync().catch(() => {});
  }, [lista]);

  return lista ? <>{children}</> : null;
}
