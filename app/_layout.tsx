import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { queryClient } from "@/lib/queryClient";

function Navegacion() {
  const { estado } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();
  const enLogin = segmentos[0] === "login";

  useEffect(() => {
    if (estado === "anonimo" && !enLogin) router.replace("/login");
    else if (estado === "autenticado" && enLogin) router.replace("/");
  }, [estado, enLogin, router]);

  if (estado === "cargando") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator accessibilityLabel="Cargando" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navegacion />
      </AuthProvider>
    </QueryClientProvider>
  );
}
