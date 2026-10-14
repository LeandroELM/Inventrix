import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Icono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import type { MotivoSalida, TipoMovimiento } from "@/features/movimientos/api";
import { ETIQUETAS_MOTIVO_SALIDA } from "@/features/movimientos/motivos";
import type { Unidad } from "@/features/productos/unidades";
import { fechaRelativa } from "@/lib/fechaRelativa";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  producto: string;
  tipo: TipoMovimiento;
  motivo: MotivoSalida | null;
  fecha: string;
  cantidad: number;
  unidad: Unidad;
  usuario?: string;
  ahora?: Date;
  onPress?: () => void;
};

export const NOMBRE_TIPO: Record<TipoMovimiento, string> = {
  entrada: "Entrada",
  inicial: "Entrada",
  salida: "Salida",
  baja: "Baja",
};

export function FilaMovimiento({ producto, tipo, motivo, fecha, cantidad, unidad, usuario, ahora, onPress }: Props) {
  const { colores } = useTema();
  const esEntrada = tipo === "entrada" || tipo === "inicial";
  const partes = [NOMBRE_TIPO[tipo]];
  if (motivo) partes.push(ETIQUETAS_MOTIVO_SALIDA[motivo]);
  partes.push(fechaRelativa(fecha, ahora ?? new Date()));
  if (usuario) partes.push(usuario);

  const cantidadTexto = etiquetaMovimiento(tipo, cantidad, unidad);
  const estilo = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, minHeight: 56, paddingVertical: 8 };
  const contenido = (
    <>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: esEntrada ? colores.exitoSuave : colores.primario,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icono
          nombre={esEntrada ? "mas" : "menos"}
          tamano={18}
          color={esEntrada ? colores.textoExito : colores.sobrePrimario}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte" numberOfLines={1}>
          {producto}
        </Texto>
        <Texto variante="pequeno" tono="secundario" numberOfLines={1}>
          {partes.join(" · ")}
        </Texto>
      </View>
      <Texto variante="cuerpoFuerte" tono={esEntrada ? "exito" : "texto"}>
        {cantidadTexto}
      </Texto>
    </>
  );
  if (onPress) {
    return (
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={`${producto}, ${partes.join(", ")}, ${cantidadTexto}`}
        onPress={onPress}
        style={estilo}
      >
        {contenido}
      </Presionable>
    );
  }
  return <View style={estilo}>{contenido}</View>;
}
