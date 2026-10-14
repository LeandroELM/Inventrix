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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="existencias" options={{ headerShown: false }} />
      <Stack.Screen name="reportes" options={{ headerShown: false }} />
      <Stack.Screen name="baja" options={{ headerShown: false }} />
      <Stack.Screen name="pedir" options={{ headerShown: false }} />
      <Stack.Screen name="producto/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="producto/[id]/editar" options={{ headerShown: false }} />
    </Stack>
  );
}
