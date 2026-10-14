import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Skeleton } from "@/animacion/Skeleton";
import { ChipsFiltro } from "@/components/ChipsFiltro";
import { Encabezado } from "@/components/Encabezado";
import { EntradaTexto } from "@/components/EntradaTexto";
import { EstadoError } from "@/components/EstadoError";
import { FilaMovimiento } from "@/components/FilaMovimiento";
import { Icono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import type { FilaHistorial } from "@/features/movimientos/api";
import { HojaDetalleMovimiento } from "@/features/movimientos/HojaDetalleMovimiento";
import { useHistorial } from "@/features/movimientos/hooks";
import { useProducto } from "@/features/productos/hooks";
import { conEncabezadosDia } from "@/lib/fechaRelativa";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Segmento = "todos" | "entrada" | "salida";

const SEGMENTOS: { valor: Segmento; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "entrada", texto: "Entradas" },
  { valor: "salida", texto: "Salidas" },
];

export default function Movimientos() {
  const { colores } = useTema();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
  const [segmento, setSegmento] = useState<Segmento>("todos");
  const [detalle, setDetalle] = useState<FilaHistorial | null>(null);
  const { productoId: productoParam } = useLocalSearchParams<{ productoId?: string }>();
  const productoId = productoParam || undefined;
  const { data: productoFiltrado } = useProducto(productoId ?? "");

  useEffect(() => {
    const t = setTimeout(() => setTexto(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const tipo = segmento === "todos" ? undefined : segmento;
  const consulta = useHistorial({ texto, productoId, tipo });
  const elementos = conEncabezadosDia(consulta.data?.pages.flat() ?? [], new Date());
  const hayFiltros = texto.trim() !== "" || tipo !== undefined || productoId !== undefined;
  const nombreProducto = productoFiltrado?.nombre ?? "…";

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado
        variante="pantalla"
        titulo="Historial de movimientos"
        onAtras={router.canGoBack() ? () => router.back() : undefined}
      />
      <View style={{ padding: ESPACIO.l, gap: ESPACIO.m, flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: ESPACIO.s,
            borderWidth: 1.5,
            borderColor: colores.borde,
            borderRadius: RADIO.campo,
            backgroundColor: colores.superficie,
            paddingHorizontal: ESPACIO.m,
          }}
        >
          <Icono nombre="buscar" tamano={18} color={colores.textoSecundario} />
          <EntradaTexto
            accessibilityLabel="Buscar por producto o código"
            placeholder="Buscar por producto o código"
            value={busqueda}
            onChangeText={setBusqueda}
            style={{ flex: 1, paddingVertical: 8 }}
          />
        </View>
        <ChipsFiltro etiqueta="Tipo de movimiento" opciones={SEGMENTOS} valor={segmento} onCambio={setSegmento} />
        {productoId ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: ESPACIO.s }}>
            <Texto style={{ flex: 1 }}>{`Mostrando: ${nombreProducto}`}</Texto>
            <Presionable
              accessibilityRole="button"
              accessibilityLabel="Quitar filtro"
              onPress={() => router.setParams({ productoId: undefined })}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Texto tono="interactivo">Quitar filtro</Texto>
            </Presionable>
          </View>
        ) : null}
        {consulta.isPending ? (
          <View style={{ gap: ESPACIO.m }}>
            <Skeleton.Fila />
            <Skeleton.Fila />
            <Skeleton.Fila />
          </View>
        ) : consulta.isError ? (
          <EstadoError mensaje="No se pudo cargar el historial." onReintentar={() => void consulta.refetch()} />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={elementos}
            keyExtractor={(e) => (e.tipo === "dia" ? `dia-${e.clave}` : String(e.fila.id))}
            renderItem={({ item }) =>
              item.tipo === "dia" ? (
                <Texto
                  variante="etiqueta"
                  tono="secundario"
                  accessibilityRole="header"
                  style={{ paddingTop: ESPACIO.m }}
                >
                  {item.texto}
                </Texto>
              ) : (
                <FilaMovimiento
                  producto={item.fila.producto}
                  tipo={item.fila.tipo}
                  motivo={item.fila.motivo}
                  fecha={item.fila.created_at}
                  cantidad={item.fila.cantidad}
                  unidad={item.fila.unidad}
                  usuario={item.fila.usuario}
                  onPress={() => setDetalle(item.fila)}
                />
              )
            }
            onEndReached={() => {
              if (consulta.hasNextPage && !consulta.isFetchingNextPage) void consulta.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <Texto tono="secundario">
                {hayFiltros ? "No hay movimientos que coincidan." : "Sin movimientos."}
              </Texto>
            }
            ListFooterComponent={consulta.isFetchingNextPage ? <Skeleton.Fila /> : null}
          />
        )}
      </View>
      {detalle ? (
        <HojaDetalleMovimiento
          fila={detalle}
          onCerrar={() => setDetalle(null)}
          onVerProducto={(id) => {
            setDetalle(null);
            router.push(`/administracion/producto/${id}`);
          }}
        />
      ) : null}
    </View>
  );
}
