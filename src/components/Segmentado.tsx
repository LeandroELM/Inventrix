import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Texto } from "@/components/Texto";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props<T extends string> = {
  opciones: { valor: T; titulo: string }[];
  valor: T;
  onCambio: (v: T) => void;
};

export function Segmentado<T extends string>({ opciones, valor, onCambio }: Props<T>) {
  const { colores } = useTema();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: colores.linea,
        borderRadius: RADIO.campo,
        padding: 3,
        gap: 3,
      }}
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <Presionable
            key={o.valor}
            accessibilityRole="tab"
            accessibilityLabel={o.titulo}
            accessibilityState={{ selected: activa }}
            onPress={() => onCambio(o.valor)}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIO.campo - 3,
              backgroundColor: activa ? colores.superficie : "transparent",
            }}
          >
            <Texto variante="cuerpoFuerte" tono={activa ? "texto" : "secundario"}>
              {o.titulo}
            </Texto>
          </Presionable>
        );
      })}
    </View>
  );
}
