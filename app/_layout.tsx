import { useEffect } from "react";
import { useAbrirDesdeNotificacion } from "@/features/alertas/useAbrirDesdeNotificacion";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { CargadorFuentes } from "@/tema/CargadorFuentes";
import { TemaProvider, useTema } from "@/tema/TemaProvider";
import { Boton } from "@/components/Boton";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import { Texto } from "@/components/Texto";
import { ConfirmacionProvider } from "@/animacion/Confirmacion";

function Navegacion() {
  const { estado, reintentar } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();
  const { colores } = useTema();
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
        <ActivityIndicator accessibilityLabel="Cargando" color={colores.interactivo} />
      </View>
    );
  }
  if (estado === "error") {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 16 }}
      >
        <Texto>No se pudo cargar tu perfil.</Texto>
        <Boton titulo="Reintentar" onPress={() => void reintentar()} />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen
        name="escaner"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="notificaciones"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="soporte"
        options={{
          presentation: "transparentModal",
          animation: "none",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}

function Raiz() {
  const { colores, esquema } = useTema();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colores.fondo).catch(() => {});
  }, [colores.fondo]);

  return (
    <>
      <StatusBar style={esquema === "oscuro" ? "light" : "dark"} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Navegacion />
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TemaProvider>
        <ConfirmacionProvider>
          <CargadorFuentes>
            <Raiz />
          </CargadorFuentes>
        </ConfirmacionProvider>
      </TemaProvider>
    </GestureHandlerRootView>
  );
}
