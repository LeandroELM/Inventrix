import { Tabs } from "expo-router";
import { BarraInferior, EspacioInferiorContext } from "@/components/BarraInferior";
import { useAuth } from "@/features/auth/AuthProvider";
import { BotonTrix } from "@/features/soporte/BotonTrix";
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

export default function LayoutApp() {
  const { perfil } = useAuth();
  const { colores } = useTema();
  const visibles = perfil ? tabsPara(perfil.rol) : [];
  return (
    <>
      <EspacioInferiorContext.Provider value={true}>
        <Tabs
          tabBar={(p) => <BarraInferior {...p} visibles={visibles} />}
          backBehavior="history"
          screenOptions={{
            headerShown: false,
            animation: "fade",
            sceneStyle: { backgroundColor: colores.fondo },
          }}
        >
          {ORDEN.map((nombre) => (
            <Tabs.Screen
              key={nombre}
              name={nombre}
              options={visibles.includes(nombre) ? {} : { href: null }}
            />
          ))}
        </Tabs>
      </EspacioInferiorContext.Provider>
      <BotonTrix />
    </>
  );
}
