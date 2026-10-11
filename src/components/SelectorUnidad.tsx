import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Texto } from "@/components/Texto";
import { UNIDADES, type Unidad } from "@/features/productos/unidades";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = { valor: Unidad; onChange: (u: Unidad) => void };

export function SelectorUnidad({ valor, onChange }: Props) {
  const { colores } = useTema();
  return (
    <View style={{ gap: 4 }}>
      <Texto variante="etiqueta" tono="secundario">
        Unidad
      </Texto>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(UNIDADES) as Unidad[]).map((u) => {
          const activa = valor === u;
          return (
            <Presionable
              key={u}
              accessibilityRole="button"
              accessibilityLabel={UNIDADES[u].nombre}
              accessibilityState={{ selected: activa }}
              onPress={() => onChange(u)}
              style={{
                minHeight: 40,
                justifyContent: "center",
                paddingHorizontal: 14,
                borderRadius: RADIO.completo,
                backgroundColor: activa ? colores.interactivo : colores.superficie,
                borderWidth: activa ? 0 : 1.5,
                borderColor: colores.borde,
              }}
            >
              <Texto variante="cuerpoFuerte" tono={activa ? "sobreInteractivo" : "texto"}>
                {UNIDADES[u].nombre}
              </Texto>
            </Presionable>
          );
        })}
      </View>
    </View>
  );
}
