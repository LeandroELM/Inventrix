import { View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { Texto } from "@/components/Texto";
import { ETIQUETA_ESTADO, estadoInventario } from "@/features/productos/estado";
import { UNIDADES, formatearCantidad, type Unidad } from "@/features/productos/unidades";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const TAMANO = 250;
const CENTRO = TAMANO / 2;
const RADIO_ANILLO = 100;
const TRAZO = 26;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO_ANILLO;

/** Fracción llena del anillo: el punto de pedido queda en la mitad (0.5). */
export function fraccionAnillo(existencias: number, puntoPedido: number): number {
  if (puntoPedido <= 0) return existencias > 0 ? 1 : 0;
  return Math.min(1, Math.max(0, existencias / (2 * puntoPedido)));
}

type Props = { existencias: number; puntoPedido: number; unidad: Unidad };

export function AnilloExistencias({ existencias, puntoPedido, unidad }: Props) {
  const { colores } = useTema();
  const fraccion = fraccionAnillo(existencias, puntoPedido);
  const cantidad = formatearCantidad(existencias, unidad);
  const pedido = formatearCantidad(puntoPedido, unidad);
  const estado = ETIQUETA_ESTADO[estadoInventario(existencias, puntoPedido)];

  const pildora = {
    borderRadius: RADIO.completo,
    borderWidth: 1,
    borderColor: colores.linea,
    backgroundColor: colores.superficie,
    paddingHorizontal: 12,
    paddingVertical: 6,
  };

  return (
    <View
      accessible
      accessibilityLabel={`Existencias ${cantidad}; punto de pedido ${pedido}; ${estado}`}
      style={{ alignItems: "center", gap: 16 }}
    >
      <View style={{ width: TAMANO, height: TAMANO }}>
        <Svg width={TAMANO} height={TAMANO} viewBox={`0 0 ${TAMANO} ${TAMANO}`}>
          <Circle cx={CENTRO} cy={CENTRO} r={RADIO_ANILLO} stroke={colores.linea} strokeWidth={TRAZO} fill="none" />
          {fraccion > 0 ? (
            <Circle
              cx={CENTRO}
              cy={CENTRO}
              r={RADIO_ANILLO}
              stroke={colores.primario}
              strokeWidth={TRAZO}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUNFERENCIA * fraccion} ${CIRCUNFERENCIA}`}
              transform={`rotate(-90 ${CENTRO} ${CENTRO})`}
            />
          ) : null}
          {puntoPedido > 0 ? (
            // Media vuelta desde las 12 en punto: abajo del anillo.
            <Line
              testID="marca-punto-pedido"
              x1={CENTRO}
              x2={CENTRO}
              y1={CENTRO + RADIO_ANILLO - TRAZO / 2 - 4}
              y2={CENTRO + RADIO_ANILLO + TRAZO / 2 + 4}
              stroke={colores.advertencia}
              strokeWidth={5}
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Texto variante="etiqueta" tono="secundario">
            Existencias
          </Texto>
          <Texto variante="titulo">{cantidad}</Texto>
          <Texto variante="etiqueta" tono="secundario">
            {estado}
          </Texto>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
        <View style={pildora}>
          <Texto variante="etiqueta">{`Punto de pedido ${pedido}`}</Texto>
        </View>
        <View style={pildora}>
          <Texto variante="etiqueta">{`Unidad ${UNIDADES[unidad].nombre}`}</Texto>
        </View>
      </View>
    </View>
  );
}
