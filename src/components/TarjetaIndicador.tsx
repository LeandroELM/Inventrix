import { View } from "react-native";
import { NumeroAnimado } from "@/animacion/NumeroAnimado";
import { Presionable } from "@/animacion/Presionable";
import { Icono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { RADIO, TINTA_OSCURA } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props =
  | { variante: "alerta"; valor: number; texto: string; onPress: () => void }
  | { variante: "lista"; titulo: string; filas: { valor: string; etiqueta: string }[] };

export function TarjetaIndicador(props: Props) {
  const { colores } = useTema();

  if (props.variante === "alerta") {
    return (
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={`${props.valor} ${props.texto}`}
        onPress={props.onPress}
        style={{
          backgroundColor: colores.advertenciaSuave,
          borderRadius: RADIO.tarjeta,
          padding: 16,
          gap: 8,
          minHeight: 48,
        }}
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
          <Icono nombre="alerta" tamano={18} color={TINTA_OSCURA} />
        </View>
        <NumeroAnimado valor={props.valor} style={{ color: colores.textoAdvertencia }} />
        <Texto variante="cuerpoFuerte" style={{ color: colores.textoAdvertencia }}>
          {props.texto}
        </Texto>
      </Presionable>
    );
  }

  return (
    <Tarjeta>
      <View style={{ gap: 8 }}>
        <Texto variante="etiqueta" tono="secundario">
          {props.titulo}
        </Texto>
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
