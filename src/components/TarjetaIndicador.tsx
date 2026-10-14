import { View, type StyleProp, type ViewStyle } from "react-native";
import { NumeroAnimado } from "@/animacion/NumeroAnimado";
import { Presionable } from "@/animacion/Presionable";
import { Icono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = { style?: StyleProp<ViewStyle> } & (
  | { variante: "alerta"; valor: number; texto: string; onPress: () => void }
  | { variante: "lista"; titulo: string; filas: { valor: string; etiqueta: string }[]; vacio?: string }
  | { variante: "dato"; titulo: string; valor: string; detalle?: string; onPress?: () => void }
);

export function TarjetaIndicador(props: Props) {
  const { colores } = useTema();

  if (props.variante === "alerta") {
    return (
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={`${props.valor} ${props.texto}`}
        onPress={props.onPress}
        style={[
          {
            backgroundColor: colores.advertenciaSuave,
            borderRadius: RADIO.tarjeta,
            padding: 16,
            gap: 8,
            minHeight: 48,
          },
          props.style,
        ]}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: RADIO.completo,
            backgroundColor: colores.advertencia,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icono nombre="alerta" tamano={18} color={colores.sobreAcento} />
        </View>
        <NumeroAnimado valor={props.valor} style={{ color: colores.textoAdvertencia }} />
        <Texto variante="cuerpoFuerte" style={{ color: colores.textoAdvertencia }}>
          {props.texto}
        </Texto>
      </Presionable>
    );
  }

  if (props.variante === "dato") {
    return (
      <Tarjeta
        onPress={props.onPress}
        accessibilityLabel={
          props.onPress ? `${props.titulo}: ${props.valor}${props.detalle ? `, ${props.detalle}` : ""}` : undefined
        }
        style={props.style}
      >
        <View style={{ gap: 4 }}>
          <Texto variante="etiqueta" tono="secundario">
            {props.titulo}
          </Texto>
          <Texto variante="titulo" numberOfLines={2}>
            {props.valor}
          </Texto>
          {props.detalle ? (
            <Texto variante="pequeno" tono="secundario">
              {props.detalle}
            </Texto>
          ) : null}
        </View>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta style={props.style}>
      <View style={{ gap: 8 }}>
        <Texto variante="etiqueta" tono="secundario">
          {props.titulo}
        </Texto>
        {props.filas.length === 0 && props.vacio ? <Texto tono="secundario">{props.vacio}</Texto> : null}
        {props.filas.map((fila) => (
          <View key={fila.etiqueta} style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Texto variante="titulo">{fila.valor}</Texto>
            <Texto variante="cuerpo" tono="secundario">
              {fila.etiqueta}
            </Texto>
          </View>
        ))}
      </View>
    </Tarjeta>
  );
}
