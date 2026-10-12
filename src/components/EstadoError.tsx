import { View } from "react-native";
import { Boton } from "@/components/Boton";
import { Texto } from "@/components/Texto";
import { ESPACIO } from "@/tema/tokens";

type Props = { mensaje: string; onReintentar: () => void };

// Error de primera carga (sin datos que mostrar): mensaje + reintento.
export function EstadoError({ mensaje, onReintentar }: Props) {
  return (
    <View style={{ gap: ESPACIO.m }}>
      <Texto accessibilityRole="alert" tono="peligro">
        {mensaje}
      </Texto>
      <Boton titulo="Reintentar" onPress={onReintentar} />
    </View>
  );
}
