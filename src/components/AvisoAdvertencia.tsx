import { View } from "react-native";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  texto: string;
  /** Línea destacada opcional sobre el texto. */
  titulo?: string;
  icono?: NombreIcono;
  tono?: "advertencia" | "peligro";
  /** Si es true, el lector de pantalla lo anuncia como alerta. */
  alerta?: boolean;
};

export function AvisoAdvertencia({ texto, titulo, icono = "alerta", tono = "advertencia", alerta = false }: Props) {
  const { colores } = useTema();
  const fondo = tono === "peligro" ? colores.peligroSuave : colores.advertenciaSuave;
  const color = tono === "peligro" ? colores.textoPeligro : colores.textoAdvertencia;
  return (
    <View
      accessible={alerta}
      accessibilityRole={alerta ? "alert" : undefined}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: ESPACIO.m,
        backgroundColor: fondo,
        borderRadius: RADIO.tarjeta,
        padding: ESPACIO.l,
      }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icono nombre={icono} tamano={28} color={color} />
      </View>
      <View style={{ flex: 1, gap: ESPACIO.xs }}>
        {titulo ? (
          <Texto variante="subtitulo" style={{ color }}>
            {titulo}
          </Texto>
        ) : null}
        <Texto style={{ color }}>{texto}</Texto>
      </View>
    </View>
  );
}
