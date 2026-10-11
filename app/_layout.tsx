import { useCallback, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { rutaDeNotificacion } from "@/features/alertas/ruta";
import { ActivityIndicator, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Stack, useRouter, useSegments, type Href } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { queryClient } from "@/lib/queryClient";

// Navega a data.ruta al tocar una notificación, solo con sesión iniciada y solo a rutas internas.
function useAbrirDesdeNotificacion(autenticado: boolean) {
  const router = useRouter();
  const pendiente = useRef<string | null>(null);
  const frioLeido = useRef(false);

  const abrir = useCallback(
    (ruta: string | null) => {
      if (!ruta) return;
      if (autenticado) router.push(ruta as Href);
      else pendiente.current = ruta;
    },
    [autenticado, router],
  );

  useEffect(() => {
    if (autenticado && pendiente.current) {
      const ruta = pendiente.current;
      pendiente.current = null;
      router.push(ruta as Href);
    }
  }, [autenticado, router]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      abrir(rutaDeNotificacion(r.notification.request.content.data)),
    );
    return () => sub.remove();
  }, [abrir]);

  useEffect(() => {
    if (frioLeido.current) return;
    frioLeido.current = true;
    void Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) abrir(rutaDeNotificacion(r.notification.request.content.data));
      })
      .catch(() => undefined);
  }, [abrir]);
}

function Navegacion() {
  const { estado, reintentar } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();
  const enLogin = segmentos[0] === "login";

  useEffect(() => {
    if (estado === "anonimo" && !enLogin) router.replace("/login");
    else if (estado === "autenticado" && enLogin) router.replace("/");
  }, [estado, enLogin, router]);

  useAbrirDesdeNotificacion(estado === "autenticado");

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
