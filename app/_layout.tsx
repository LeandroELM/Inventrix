import { useEffect } from "react";
import { useAbrirDesdeNotificacion } from "@/features/alertas/useAbrirDesdeNotificacion";
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

  // Solo cuando hay sesión y ya se salió de /login (la redirección posterior al login terminó).
  useAbrirDesdeNotificacion(estado === "autenticado" && !enLogin);

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
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="escaner" options={{ presentation: "modal" }} />
      <Stack.Screen name="notificaciones" options={{ presentation: "modal" }} />
      <Stack.Screen name="soporte" options={{ presentation: "modal" }} />
    </Stack>
  );
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
