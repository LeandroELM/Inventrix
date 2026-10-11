import { View } from "react-native";
import { Texto } from "@/components/Texto";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Tipo = "disponible" | "pedir" | "inactivo";

const TEXTOS: Record<Tipo, string> = {
  disponible: "Disponible",
  pedir: "Pedir",
  inactivo: "Inactivo",
};

export function Etiqueta({ tipo, texto }: { tipo: Tipo; texto?: string }) {
  const { colores } = useTema();
  const fondo = { disponible: colores.exitoSuave, pedir: colores.peligroSuave, inactivo: colores.linea }[tipo];
  const color = {
    disponible: colores.textoExito,
    pedir: colores.textoPeligro,
    inactivo: colores.textoSecundario,
  }[tipo];
  return (
    <View
      style={{
        backgroundColor: fondo,
        borderRadius: RADIO.completo,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Texto variante="etiqueta" style={{ color }}>
        {texto ?? TEXTOS[tipo]}
      </Texto>
    </View>
  );
}
