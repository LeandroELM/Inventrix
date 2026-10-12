import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Texto } from "@/components/Texto";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props<T extends string> = {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
};

export function ChipsFiltro<T extends string>({ opciones, valor, onCambio, etiqueta }: Props<T>) {
  const { colores } = useTema();
  return (
    <View
      accessibilityLabel={etiqueta}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: ESPACIO.s }}
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Presionable
            key={o.valor}
            accessibilityRole="button"
            accessibilityLabel={o.texto}
            accessibilityState={{ selected: activo }}
            onPress={() => onCambio(o.valor)}
            style={{
              minHeight: 48,
              paddingHorizontal: ESPACIO.l,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIO.completo,
              borderWidth: 1,
              borderColor: activo ? colores.primario : colores.borde,
              backgroundColor: activo ? colores.primario : colores.superficie,
            }}
          >
            <Texto variante="cuerpoFuerte" tono={activo ? "sobrePrimario" : "secundario"}>
              {o.texto}
            </Texto>
          </Presionable>
        );
      })}
    </View>
  );
}
