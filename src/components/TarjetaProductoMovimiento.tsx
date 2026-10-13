import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { AvatarProducto } from "@/components/AvatarProducto";
import { Texto } from "@/components/Texto";
import { VELO_CLARO } from "@/components/TarjetaPrincipal";
import { formatearCantidad, UNIDADES, type Unidad } from "@/features/productos/unidades";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  producto: { nombre: string; codigo: string; unidad: Unidad; existencias: number; punto_pedido: number };
  tipo: "entrada" | "salida";
  proyectadas: number | null;
};

export function TarjetaProductoMovimiento({ producto, tipo, proyectadas }: Props) {
  const { colores } = useTema();
  const [inicio, fin] = colores.encabezado;
  const actual = formatearCantidad(producto.existencias, producto.unidad);
  const formateada = proyectadas === null ? null : formatearCantidad(proyectadas, producto.unidad);
  const colorProyectado = tipo === "entrada" ? colores.marcaAcento : colores.advertencia;

  return (
    <LinearGradient
      colors={[inicio, fin]}
      style={{ borderRadius: RADIO.encabezado, padding: ESPACIO.l, gap: ESPACIO.m }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.m }}>
        <AvatarProducto nombre={producto.nombre} tamano={48} />
        <View style={{ flex: 1, gap: ESPACIO.xs }}>
          <Texto variante="subtitulo" tono="sobrePrimario" numberOfLines={2}>
            {producto.nombre}
          </Texto>
          <Texto variante="cuerpo" tono="sobrePrimario">
            {`${producto.codigo} · ${UNIDADES[producto.unidad].nombre}${tipo === "salida" ? ` · P. pedido ${formatearCantidad(producto.punto_pedido, producto.unidad)}` : ""}`}
          </Texto>
        </View>
      </View>
      <View
        accessible
        accessibilityLabel={`Existencias actuales ${actual}; ${tipo === "entrada" ? "proyectadas" : "quedarían"} ${formateada ?? "sin dato"}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ESPACIO.m,
          borderRadius: RADIO.campo + 4,
          padding: ESPACIO.m,
          backgroundColor: VELO_CLARO,
        }}
      >
        <View style={{ gap: ESPACIO.xs }}>
          <Texto variante="etiqueta" tono="sobrePrimario">
            Existencias actuales
          </Texto>
          <Texto variante="subtitulo" tono="sobrePrimario">
            {actual}
          </Texto>
        </View>
        <View style={{ gap: ESPACIO.xs, alignItems: "flex-end", flexShrink: 1 }}>
          <Texto variante="etiqueta" tono="sobrePrimario">
            {tipo === "entrada" ? "Proyectadas" : "Quedarían"}
          </Texto>
          <Texto variante="titulo" style={{ color: colorProyectado }}>
            {formateada ?? "—"}
          </Texto>
        </View>
      </View>
    </LinearGradient>
  );
}
