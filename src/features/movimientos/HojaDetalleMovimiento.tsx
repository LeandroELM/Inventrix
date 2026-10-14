import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Boton } from "@/components/Boton";
import { Icono } from "@/components/Icono";
import { NOMBRE_TIPO } from "@/components/FilaMovimiento";
import { HojaInferior } from "@/components/HojaInferior";
import { Texto } from "@/components/Texto";
import type { FilaHistorial } from "@/features/movimientos/api";
import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import { ETIQUETAS_MOTIVO_SALIDA } from "@/features/movimientos/motivos";
import { formatearCantidad } from "@/features/productos/unidades";
import { fechaHoraLocal } from "@/lib/fechaRelativa";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  fila: FilaHistorial;
  onCerrar: () => void;
  onVerProducto: (productoId: string) => void;
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 40 }}>
      <Texto tono="secundario">{etiqueta}</Texto>
      <Texto variante="cuerpoFuerte" style={{ flexShrink: 1, textAlign: "right" }}>
        {valor}
      </Texto>
    </View>
  );
}

export function HojaDetalleMovimiento({ fila, onCerrar, onVerProducto }: Props) {
  const { colores } = useTema();
  const esEntrada = fila.tipo === "entrada" || fila.tipo === "inicial";

  return (
    <HojaInferior
      onCerrar={onCerrar}
      encabezado={(cerrar) => (
        <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 4 }}>
          <Texto variante="titulo" style={{ flex: 1 }} numberOfLines={1}>
            {`${NOMBRE_TIPO[fila.tipo]} · ${fila.producto}`}
          </Texto>
          <Presionable
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle"
            onPress={cerrar}
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Icono nombre="cerrar" tamano={20} color={colores.textoSecundario} />
          </Presionable>
        </View>
      )}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 4 }}>
        <Texto variante="titulo" tono={esEntrada ? "exito" : "texto"}>
          {etiquetaMovimiento(fila.tipo, fila.cantidad, fila.unidad)}
        </Texto>
        {fila.motivo ? <Texto variante="cuerpoFuerte">{ETIQUETAS_MOTIVO_SALIDA[fila.motivo]}</Texto> : null}
        <View style={{ marginTop: 8 }}>
          <Dato etiqueta="Usuario" valor={fila.usuario} />
          <Dato etiqueta="Fecha y hora" valor={fechaHoraLocal(fila.created_at)} />
          <Dato
            etiqueta="Existencias"
            valor={`${formatearCantidad(fila.existencias_antes, fila.unidad)} → ${formatearCantidad(fila.existencias_despues, fila.unidad)}`}
          />
        </View>
        <View style={{ marginTop: 12 }}>
          <Boton titulo="Ver producto" variante="secundario" onPress={() => onVerProducto(fila.producto_id)} />
        </View>
      </View>
    </HojaInferior>
  );
}
