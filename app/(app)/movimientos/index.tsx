import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { Campo } from "@/components/Campo";
import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import { useHistorial } from "@/features/movimientos/hooks";
import type { FilaHistorial } from "@/features/movimientos/api";
import { formatearCantidad } from "@/features/productos/unidades";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

type Segmento = "todos" | "entrada" | "salida";

const SEGMENTOS: { valor: Segmento; titulo: string }[] = [
  { valor: "todos", titulo: "Todos" },
  { valor: "entrada", titulo: "Entradas" },
  { valor: "salida", titulo: "Salidas" },
];

const TIPOS = { entrada: "Entrada", salida: "Salida", inicial: "Inicial" } as const;
const MOTIVOS = {
  venta: "Venta",
  consumo_interno: "Consumo interno",
  retiro_autorizado: "Retiro autorizado",
} as const;

function FilaMovimiento({ fila }: { fila: FilaHistorial }) {
  const [abierta, setAbierta] = useState(false);
  const fecha = new Date(fila.created_at);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fila.producto}, ${TIPOS[fila.tipo]}`}
      accessibilityState={{ expanded: abierta }}
      onPress={() => setAbierta((a) => !a)}
      style={{ padding: 12, borderBottomWidth: 1, gap: 4 }}
    >
      <Texto>{fecha.toLocaleDateString("es")}</Texto>
      <Texto>{fila.producto}</Texto>
      <Texto>
        {TIPOS[fila.tipo]} {etiquetaMovimiento(fila.tipo, fila.cantidad, fila.unidad)}
      </Texto>
      {abierta ? (
        <View style={{ gap: 2 }}>
          <Texto>Usuario: {fila.usuario}</Texto>
          <Texto>Fecha y hora: {fecha.toLocaleString("es")}</Texto>
          {fila.motivo ? <Texto>Motivo: {MOTIVOS[fila.motivo]}</Texto> : null}
          <Texto>
            Existencias: {formatearCantidad(fila.existencias_antes, fila.unidad)} {"\u2192"}{" "}
            {formatearCantidad(fila.existencias_despues, fila.unidad)}
          </Texto>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Movimientos() {
  const { colores } = useTema();
  const [texto, setTexto] = useState("");
  const [segmento, setSegmento] = useState<Segmento>("todos");
  const consulta = useHistorial({
    texto,
    tipo: segmento === "todos" ? undefined : segmento,
  });
  const filas = consulta.data?.pages.flat() ?? [];

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Campo label="Buscar" value={texto} onChangeText={setTexto} placeholder="Producto o código" />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {SEGMENTOS.map((s) => (
          <Pressable
            key={s.valor}
            accessibilityRole="button"
            accessibilityLabel={s.titulo}
            accessibilityState={{ selected: segmento === s.valor }}
            onPress={() => setSegmento(s.valor)}
            style={{ flex: 1, padding: 8, alignItems: "center", borderWidth: segmento === s.valor ? 2 : 1, borderColor: segmento === s.valor ? colores.interactivo : colores.borde }}
          >
            <Texto>{s.titulo}</Texto>
          </Pressable>
        ))}
      </View>
      {consulta.isPending ? (
        <ActivityIndicator color={colores.interactivo} />
      ) : consulta.isError ? (
        <Texto>No se pudo cargar el historial.</Texto>
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(f) => String(f.id)}
          renderItem={({ item }) => <FilaMovimiento fila={item} />}
          onEndReached={() => {
            if (consulta.hasNextPage && !consulta.isFetchingNextPage) void consulta.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Texto>Sin movimientos.</Texto>}
          ListFooterComponent={consulta.isFetchingNextPage ? <ActivityIndicator color={colores.interactivo} /> : null}
        />
      )}
    </View>
  );
}
