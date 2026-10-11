import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Presionable } from "@/animacion/Presionable";
import { ALTO_BARRA, MARGEN_BARRA } from "@/components/BarraInferior";
import { IconoTrix } from "@/components/Marca";
import { useTecladoVisible } from "@/lib/useTecladoVisible";
import { sombra } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const TAMANO = 48;

export function BotonTrix() {
  const router = useRouter();
  const { colores, esquema } = useTema();
  const { bottom } = useSafeAreaInsets();
  const tecladoVisible = useTecladoVisible();
  if (tecladoVisible) return null;
  return (
    <Presionable
      accessibilityRole="button"
      accessibilityLabel="Abrir asistente Trix"
      onPress={() => router.push("/soporte")}
      style={[
        {
          position: "absolute",
          right: 16,
          bottom: ALTO_BARRA + MARGEN_BARRA + bottom + 12,
          width: TAMANO,
          height: TAMANO,
          borderRadius: TAMANO / 2,
          backgroundColor: colores.superficie,
          alignItems: "center",
          justifyContent: "center",
        },
        sombra("elevada", esquema),
      ]}
    >
      <IconoTrix tamano={26} />
    </Presionable>
  );
}
