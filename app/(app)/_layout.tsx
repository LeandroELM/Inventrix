import { Pressable, Text, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { tabsPara, type NombreTab } from "@/features/auth/navegacion";

const TITULOS: Record<NombreTab, string> = {
  index: "Inicio",
  administracion: "Administración",
  nuevo: "Nuevo",
  movimientos: "Movimientos",
  configuracion: "Configuración",
};

const ORDEN: NombreTab[] = ["index", "administracion", "nuevo", "movimientos", "configuracion"];

export default function LayoutApp() {
  const { perfil } = useAuth();
  const router = useRouter();
  const visibles = perfil ? tabsPara(perfil.rol) : [];
  return (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{ headerShown: false }}>
        {ORDEN.map((nombre) => (
          <Tabs.Screen
            key={nombre}
            name={nombre}
            options={{ title: TITULOS[nombre], ...(visibles.includes(nombre) ? {} : { href: null }) }}
          />
        ))}
      </Tabs>
      {/* Flotante en la esquina superior derecha: no tapa la barra de pestañas ni los botones principales. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir soporte"
        onPress={() => router.push("/soporte")}
        style={{
          position: "absolute",
          top: 40,
          right: 12,
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text>?</Text>
      </Pressable>
    </View>
  );
}
