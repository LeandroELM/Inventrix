import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarraInferior, ALTO_BARRA, ESPACIO_TRIX, MARGEN_BARRA } from "@/components/BarraInferior";
import { useAuth } from "@/features/auth/AuthProvider";
import { tabsPara, type NombreTab } from "@/features/auth/navegacion";
import { useTema } from "@/tema/TemaProvider";

const ORDEN: NombreTab[] = ["index", "buscar", "nuevo", "administracion", "movimientos", "configuracion"];

export default function LayoutApp() {
  const { perfil } = useAuth();
  const { colores } = useTema();
  const { bottom } = useSafeAreaInsets();
  const visibles = perfil ? tabsPara(perfil.rol) : [];
  return (
    <Tabs
      tabBar={(p) => <BarraInferior {...p} visibles={visibles} />}
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: "fade",
        // Reserva espacio para la barra flotante y el botón de Trix: ningún contenido queda tapado.
        sceneStyle: {
          backgroundColor: colores.fondo,
          paddingBottom: ALTO_BARRA + MARGEN_BARRA + bottom + ESPACIO_TRIX,
        },
      }}
    >
      {ORDEN.map((nombre) => (
        <Tabs.Screen key={nombre} name={nombre} options={visibles.includes(nombre) ? {} : { href: null }} />
      ))}
    </Tabs>
  );
}
