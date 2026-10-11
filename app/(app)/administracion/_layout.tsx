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
      <Stack.Screen name="index" options={{ title: "Administración" }} />
      <Stack.Screen name="reportes" options={{ title: "Reportes" }} />
      <Stack.Screen name="baja" options={{ title: "Dar de baja producto" }} />
      <Stack.Screen name="pedir" options={{ title: "Productos a pedir" }} />
      <Stack.Screen name="producto/[id]" options={{ title: "Producto" }} />
      <Stack.Screen name="producto/[id]/editar" options={{ title: "Editar producto" }} />
    </Stack>
  );
}
