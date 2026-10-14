import { useState } from "react";
import { View } from "react-native";
import Svg, { G, Rect } from "react-native-svg";
import { Texto } from "@/components/Texto";
import type { PeriodoDashboard, PuntoSerie } from "@/features/reportes/dashboard";
import { useTema } from "@/tema/TemaProvider";

const ALTO_BARRAS = 140;
const ANCHO_ETIQUETA = 24;
const INICIALES_DIA = ["D", "L", "M", "X", "J", "V", "S"];

/** Mayor valor de la serie; 1 si todo es cero, para no dividir entre cero. */
export function escalaGrafico(serie: PuntoSerie[]): number {
  const mayor = Math.max(0, ...serie.flatMap((p) => [p.entradas, p.salidas]));
  return mayor > 0 ? mayor : 1;
}

export function etiquetaEje(fecha: string, indice: number, periodo: PeriodoDashboard): string {
  const [y, m, d] = fecha.split("-").map(Number);
  if (periodo === "7d") return INICIALES_DIA[new Date(y, m - 1, d).getDay()];
  return indice % 5 === 0 ? String(d) : "";
}

type Props = { serie: PuntoSerie[]; periodo: PeriodoDashboard };

export function GraficoBarras({ serie, periodo }: Props) {
  const { colores } = useTema();
  const [ancho, setAncho] = useState(0);

  const entradas = serie.reduce((suma, p) => suma + p.entradas, 0);
  const salidas = serie.reduce((suma, p) => suma + p.salidas, 0);
  const escala = escalaGrafico(serie);
  const celda = serie.length > 0 ? ancho / serie.length : 0;
  const barra = Math.max(1, Math.min(12, celda * 0.35));

  const leyenda = (color: string, texto: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Texto variante="etiqueta" tono="secundario">
        {texto}
      </Texto>
    </View>
  );

  return (
    <View
      accessible
      accessibilityLabel={`Entradas y salidas por día: ${entradas} entradas y ${salidas} salidas en el periodo`}
      style={{ gap: 12 }}
    >
      <View style={{ flexDirection: "row", gap: 16 }}>
        {leyenda(colores.exito, "Entradas")}
        {leyenda(colores.primario, "Salidas")}
      </View>
      {entradas + salidas === 0 ? (
        <Texto tono="secundario">Sin movimientos en el periodo.</Texto>
      ) : (
        <View testID="area-grafico" onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
          <Svg
            width={ancho}
            height={ALTO_BARRAS}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            {serie.map((p, i) => {
              const inicio = i * celda + (celda - 2 * barra - 2) / 2;
              const alto = (valor: number) => (valor / escala) * ALTO_BARRAS;
              return (
                <G key={p.fecha}>
                  <Rect
                    x={inicio}
                    y={ALTO_BARRAS - alto(p.entradas)}
                    width={barra}
                    height={alto(p.entradas)}
                    rx={2}
                    fill={colores.exito}
                  />
                  <Rect
                    x={inicio + barra + 2}
                    y={ALTO_BARRAS - alto(p.salidas)}
                    width={barra}
                    height={alto(p.salidas)}
                    rx={2}
                    fill={colores.primario}
                  />
                </G>
              );
            })}
          </Svg>
          <View style={{ flexDirection: "row" }}>
            {serie.map((p, i) => (
              <View key={p.fecha} style={{ width: celda, height: 16, overflow: "visible" }}>
                <Texto
                  variante="pequeno"
                  tono="secundario"
                  style={{
                    position: "absolute",
                    width: ANCHO_ETIQUETA,
                    left: (celda - ANCHO_ETIQUETA) / 2,
                    textAlign: "center",
                  }}
                >
                  {etiquetaEje(p.fecha, i, periodo)}
                </Texto>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
