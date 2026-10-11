import { Tabs } from "expo-router";
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
  const visibles = perfil ? tabsPara(perfil.rol) : [];
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {ORDEN.map((nombre) => (
        <Tabs.Screen
          key={nombre}
          name={nombre}
          options={{ title: TITULOS[nombre], ...(visibles.includes(nombre) ? {} : { href: null }) }}
        />
      ))}
    </Tabs>
  );
}
