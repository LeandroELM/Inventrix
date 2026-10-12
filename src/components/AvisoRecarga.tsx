import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Texto } from "@/components/Texto";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

// Aviso en línea cuando una recarga falla pero ya hay datos en pantalla.
export function AvisoRecarga({ onReintentar }: { onReintentar: () => void }) {
  const { colores } = useTema();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Texto variante="pequeno" style={{ color: colores.textoPeligro, flex: 1 }}>
        No se pudo actualizar.
      </Texto>
      <Presionable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        onPress={onReintentar}
        style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: ESPACIO.s }}
      >
        <Texto variante="etiqueta" tono="interactivo">
          Reintentar
        </Texto>
      </Presionable>
    </View>
  );
}
