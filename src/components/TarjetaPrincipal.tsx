import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { NumeroAnimado } from "@/animacion/NumeroAnimado";
import { Presionable } from "@/animacion/Presionable";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { ESPACIO, RADIO, TINTA_OSCURA } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  titulo: string;
  valor: number;
  sufijo?: string;
  chips?: { texto: string; tono: "exito" | "neutro" }[];
  accesos: { titulo: string; icono: NombreIcono; onPress: () => void; destacado?: boolean }[];
};

// Translucido sobre el degradado: el texto blanco mantiene 4.5:1 en ambos esquemas.
const VELO_CLARO = "rgba(255,255,255,0.12)";

export function TarjetaPrincipal({ titulo, valor, sufijo, chips, accesos }: Props) {
  const { colores } = useTema();
  const [inicio, fin] = colores.encabezado;

  return (
    <LinearGradient
      colors={[inicio, fin]}
      style={{ borderRadius: RADIO.tarjeta + 8, padding: ESPACIO.l, gap: ESPACIO.m }}
    >
      <View style={{ gap: ESPACIO.xs }}>
        <Texto variante="cuerpo" tono="sobrePrimario">
          {titulo}
        </Texto>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: ESPACIO.s }}>
          <NumeroAnimado valor={valor} style={{ color: colores.sobrePrimario, fontSize: 40 }} />
          {sufijo ? (
            <Texto variante="subtitulo" tono="sobrePrimario">
              {sufijo}
            </Texto>
          ) : null}
        </View>
      </View>
      {chips && chips.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: ESPACIO.s }}>
          {chips.map((chip) => (
            <View
              key={chip.texto}
              testID="chip-principal"
              style={{
                borderRadius: RADIO.completo,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: chip.tono === "exito" ? colores.marcaAcento : VELO_CLARO,
              }}
            >
              <Texto
                variante="etiqueta"
                style={{ color: chip.tono === "exito" ? TINTA_OSCURA : colores.sobrePrimario }}
              >
                {chip.texto}
              </Texto>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: ESPACIO.s }}>
        {accesos.map((acceso) => {
          const color = acceso.destacado ? TINTA_OSCURA : colores.sobrePrimario;
          return (
            <Presionable
              key={acceso.titulo}
              accessibilityRole="button"
              accessibilityLabel={acceso.titulo}
              onPress={acceso.onPress}
              style={{
                flex: 1,
                minHeight: 74,
                borderRadius: RADIO.campo + 4,
                alignItems: "center",
                justifyContent: "center",
                gap: ESPACIO.xs,
                backgroundColor: acceso.destacado ? colores.marcaAcento : VELO_CLARO,
              }}
            >
              <Icono nombre={acceso.icono} tamano={24} color={color} />
              <Texto variante="etiqueta" style={{ color }}>
                {acceso.titulo}
              </Texto>
            </Presionable>
          );
        })}
      </View>
    </LinearGradient>
  );
}
