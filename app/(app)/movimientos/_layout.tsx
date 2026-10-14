import { Stack } from "expo-router";
import { Encabezado } from "@/components/Encabezado";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options, navigation, back }) => (
          <Encabezado variante="pantalla" titulo={options.title ?? ""} onAtras={back ? navigation.goBack : undefined} />
        ),
        animation: "slide_from_right",
      }}
    >
      {/* El Historial dibuja su propio Encabezado (volver solo si hay historial de navegación). */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="historial" options={{ headerShown: false }} />
      {/* Entrada y Salida dibujan su propio Encabezado (con escanear y volver). */}
      <Stack.Screen name="entrada" options={{ headerShown: false }} />
      <Stack.Screen name="salida" options={{ headerShown: false }} />
    </Stack>
  );
}
