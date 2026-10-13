import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Skeleton } from "@/animacion/Skeleton";
import { EntradaTexto } from "@/components/EntradaTexto";
import { EstadoError } from "@/components/EstadoError";
import { FilaProducto } from "@/components/FilaProducto";
import { Icono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { estadoInventario } from "@/features/productos/estado";
import { useProductos } from "@/features/productos/hooks";
import { detalleProducto, formatearCantidad } from "@/features/productos/unidades";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export function BuscadorProducto({
  onElegir,
  escanearDestino,
}: {
  onElegir: (id: string, nombre: string) => void;
  // Si se indica, muestra el botón Escanear hacia /escaner?destino=...
  escanearDestino?: string;
}) {
  const router = useRouter();
  const { colores } = useTema();
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTexto(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);
  const { data, isLoading, isError, refetch } = useProductos({ texto });
  const resultados = (data ?? []).slice(0, 20);
  return (
    <View style={{ gap: ESPACIO.m }}>
      <View style={{ flexDirection: "row", gap: ESPACIO.s, alignItems: "center" }}>
        <View
          style={{
            flex: 1,
            height: 52,
            flexDirection: "row",
            alignItems: "center",
            gap: ESPACIO.s,
            paddingHorizontal: ESPACIO.m,
            borderWidth: 1.5,
            borderColor: colores.borde,
            borderRadius: RADIO.campo,
            backgroundColor: colores.superficie,
          }}
        >
          <Icono nombre="buscar" tamano={20} color={colores.textoSecundario} />
          <EntradaTexto
            accessibilityLabel="Buscar producto por nombre o código"
            placeholder="Buscar por nombre o código"
            value={busqueda}
            onChangeText={setBusqueda}
            style={{ flex: 1, padding: 0 }}
          />
        </View>
        {escanearDestino ? (
          <Presionable
            accessibilityRole="button"
            accessibilityLabel="Escanear código"
            onPress={() => router.push(`/escaner?destino=${escanearDestino}`)}
            style={{
              width: 52,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIO.campo,
              backgroundColor: colores.primario,
            }}
          >
            <Icono nombre="escanear" tamano={24} color={colores.sobrePrimario} />
          </Presionable>
        ) : null}
      </View>
      {isLoading ? (
        <View style={{ gap: ESPACIO.m }}>
          <Skeleton.Fila />
          <Skeleton.Fila />
          <Skeleton.Fila />
        </View>
      ) : isError && !data ? (
        <EstadoError mensaje="No se pudieron cargar los productos." onReintentar={() => void refetch()} />
      ) : resultados.length === 0 ? (
        <Texto tono="secundario">No hay productos que coincidan.</Texto>
      ) : (
        resultados.map((p) => (
          <FilaProducto
            key={p.id}
            nombre={p.nombre}
            detalle={detalleProducto(p.codigo, p.unidad)}
            cantidad={formatearCantidad(p.existencias, p.unidad)}
            estado={estadoInventario(p.existencias, p.punto_pedido)}
            onPress={() => onElegir(p.id, p.nombre)}
          />
        ))
      )}
    </View>
  );
}
