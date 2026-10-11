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
      <Stack.Screen name="index" options={{ title: "Historial de movimientos" }} />
      <Stack.Screen name="entrada" options={{ title: "Registrar entrada" }} />
      <Stack.Screen name="salida" options={{ title: "Registrar salida" }} />
    </Stack>
  );
}
