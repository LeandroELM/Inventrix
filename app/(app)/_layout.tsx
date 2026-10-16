import { Stack } from "expo-router";
import { BarraInferior, EspacioInferiorContext, pestanaActiva } from "@/components/BarraInferior";
import { useAuth } from "@/features/auth/AuthProvider";
import { BotonTrix } from "@/features/soporte/BotonTrix";
import { tabsPara } from "@/features/auth/navegacion";
import { useTema } from "@/tema/TemaProvider";

// Las pestañas son la base de este Stack y todo lo demás (ficha, pedir, reportes, entrada...) se
// apila encima. Así "volver" siempre regresa a la pantalla de la que se vino, venga de la pestaña
// que venga. La barra y Trix van sobre el Stack: siguen fijos mientras las pantallas se deslizan.
export default function LayoutApp() {
  const { perfil } = useAuth();
  const { colores } = useTema();
  const visibles = perfil ? tabsPara(perfil.rol) : [];
  return (
    <EspacioInferiorContext.Provider value={true}>
      <Stack
        layout={({ children, state, navigation }) => (
          <>
            {children}
            <BarraInferior
              visibles={visibles}
              activa={pestanaActiva(state)}
              // Cierra lo apilado sobre las pestañas y cambia a la elegida.
              onPresionar={(nombre) => navigation.navigate("(tabs)", { screen: nombre }, { pop: true })}
            />
            <BotonTrix />
          </>
        )}
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </EspacioInferiorContext.Provider>
  );
}
