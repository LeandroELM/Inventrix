import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { iniciales } from "@/components/AvatarProducto";
import { Icono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { ETIQUETA_ESTADO, type Estado } from "@/features/productos/estado";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  nombre: string;
  detalle: string;
  cantidad: string;
  estado: Estado;
  onPress?: () => void;
};

export function FilaProducto({ nombre, detalle, cantidad, estado, onPress }: Props) {
  const { colores } = useTema();
  const colorAvatar = { disponible: colores.exito, bajo: colores.advertencia, sin: colores.primario }[estado];
  const fondoEtiqueta = { disponible: colores.exitoSuave, bajo: colores.advertenciaSuave, sin: colores.primario }[estado];
  const textoEtiqueta = { disponible: colores.textoExito, bajo: colores.textoAdvertencia, sin: colores.sobrePrimario }[estado];
  const etiqueta = `${nombre}, ${cantidad}, ${ETIQUETA_ESTADO[estado]}`;

  const contenido = (
    <>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: colorAvatar,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Texto variante="etiqueta" style={{ color: estado === "sin" ? colores.sobrePrimario : colores.superficie }}>
          {iniciales(nombre)}
        </Texto>
      </View>
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte" numberOfLines={1}>
          {nombre}
        </Texto>
        <Texto variante="pequeno" tono="secundario" numberOfLines={1}>
          {detalle}
        </Texto>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Texto variante="cuerpoFuerte">{cantidad}</Texto>
        <View
          style={{
            backgroundColor: fondoEtiqueta,
            borderRadius: RADIO.completo,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Texto variante="etiqueta" style={{ color: textoEtiqueta }}>
            {ETIQUETA_ESTADO[estado]}
          </Texto>
        </View>
      </View>
      {onPress ? <Icono nombre="flecha" tamano={18} color={colores.textoSecundario} /> : null}
    </>
  );
  const estilo = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
  };
  if (onPress) {
    return (
      <Presionable accessibilityRole="button" accessibilityLabel={etiqueta} onPress={onPress} style={estilo}>
        {contenido}
      </Presionable>
    );
  }
  return (
    <View accessible accessibilityLabel={etiqueta} style={estilo}>
      {contenido}
    </View>
  );
}
