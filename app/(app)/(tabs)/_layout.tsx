import { Tabs } from "expo-router";
import { useReducedMotion } from "react-native-reanimated";
import { especificacionPestanas, interpolarPestana } from "@/animacion/transicionPestanas";
import { useAuth } from "@/features/auth/AuthProvider";
import { tabsPara, type NombreTab } from "@/features/auth/navegacion";
import { useTema } from "@/tema/TemaProvider";

const ORDEN: NombreTab[] = [
  "index",
  "buscar",
  "nuevo",
  "administracion",
  "movimientos",
  "configuracion",
];

// La barra la dibuja el Stack de (app) encima de todo, para que siga visible en las pantallas
// que se abren sobre las pestañas.
export default function LayoutPestanas() {
  const { perfil } = useAuth();
  const { colores } = useTema();
  const reducirMovimiento = useReducedMotion();
  const visibles = perfil ? tabsPara(perfil.rol) : [];
  return (
    <Tabs
      tabBar={() => null}
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: reducirMovimiento ? "none" : "fade",
        ...(reducirMovimiento
          ? {}
          : { sceneStyleInterpolator: interpolarPestana, transitionSpec: especificacionPestanas }),
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      {ORDEN.map((nombre) => (
        <Tabs.Screen key={nombre} name={nombre} options={visibles.includes(nombre) ? {} : { href: null }} />
      ))}
    </Tabs>
  );
}
