import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { queryClient } from "@/lib/queryClient";

function Navegacion() {
  const { estado, reintentar } = useAuth();
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
  if (estado === "error") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 16 }}>
        <Text>No se pudo cargar tu perfil.</Text>
        <Boton titulo="Reintentar" onPress={() => void reintentar()} />
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
