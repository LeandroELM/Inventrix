import { Pressable, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/AuthProvider";
import { tabsPara, type NombreTab } from "@/features/auth/navegacion";
import { Texto } from "@/components/Texto";

const TITULOS: Record<NombreTab, string> = {
  index: "Inicio",
  administracion: "Administración",
  nuevo: "Nuevo",
  movimientos: "Movimientos",
  configuracion: "Configuración",
};

const ORDEN: NombreTab[] = ["index", "administracion", "nuevo", "movimientos", "configuracion"];

const ALTO_TAB = 56;
const TAMANO_BOTON = 44;
const MARGEN = 8;

export default function LayoutApp() {
  const { perfil } = useAuth();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const visibles = perfil ? tabsPara(perfil.rol) : [];
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { height: ALTO_TAB + bottom, paddingBottom: bottom },
          // Reserva una franja sobre la barra para el botón flotante: ningún botón de pantalla queda tapado.
          sceneStyle: { paddingBottom: TAMANO_BOTON + 2 * MARGEN },
        }}
      >
        {ORDEN.map((nombre) => (
          <Tabs.Screen
            key={nombre}
            name={nombre}
            options={{ title: TITULOS[nombre], ...(visibles.includes(nombre) ? {} : { href: null }) }}
          />
        ))}
      </Tabs>
      {/* Flotante abajo a la derecha, justo sobre la barra de pestañas, en la franja reservada por sceneStyle. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir soporte"
        onPress={() => router.push("/soporte")}
        style={{
          position: "absolute",
          bottom: ALTO_TAB + bottom + MARGEN,
          right: 12,
          width: TAMANO_BOTON,
          height: TAMANO_BOTON,
          borderRadius: 22,
          borderWidth: 1,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Texto>?</Texto>
      </Pressable>
    </View>
  );
}
