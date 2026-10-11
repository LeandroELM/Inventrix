import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Campo } from "@/components/Campo";
import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import { useHistorial } from "@/features/movimientos/hooks";
import type { FilaHistorial } from "@/features/movimientos/api";
import { formatearCantidad } from "@/features/productos/unidades";

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
      <Text>{fecha.toLocaleDateString("es")}</Text>
      <Text>{fila.producto}</Text>
      <Text>
        {TIPOS[fila.tipo]} {etiquetaMovimiento(fila.tipo, fila.cantidad, fila.unidad)}
      </Text>
      {abierta ? (
        <View style={{ gap: 2 }}>
          <Text>Usuario: {fila.usuario}</Text>
          <Text>Fecha y hora: {fecha.toLocaleString("es")}</Text>
          {fila.motivo ? <Text>Motivo: {MOTIVOS[fila.motivo]}</Text> : null}
          <Text>
            Existencias: {formatearCantidad(fila.existencias_antes, fila.unidad)} {"\u2192"}{" "}
            {formatearCantidad(fila.existencias_despues, fila.unidad)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Historial() {
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
            style={{ flex: 1, padding: 8, alignItems: "center", borderWidth: segmento === s.valor ? 2 : 1 }}
          >
            <Text>{s.titulo}</Text>
          </Pressable>
        ))}
      </View>
      {consulta.isPending ? (
        <ActivityIndicator />
      ) : consulta.isError ? (
        <Text>No se pudo cargar el historial.</Text>
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(f) => String(f.id)}
          renderItem={({ item }) => <FilaMovimiento fila={item} />}
          onEndReached={() => {
            if (consulta.hasNextPage && !consulta.isFetchingNextPage) void consulta.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text>Sin movimientos.</Text>}
          ListFooterComponent={consulta.isFetchingNextPage ? <ActivityIndicator /> : null}
        />
      )}
    </View>
  );
}
