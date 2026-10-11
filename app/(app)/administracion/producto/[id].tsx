import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede } from "@/features/auth/permisos";
import { ETIQUETA_ESTADO, estadoInventario } from "@/features/productos/estado";
import { useProducto, useUltimosMovimientos } from "@/features/productos/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";

const ETIQUETA_TIPO = { inicial: "Inicial", entrada: "Entrada", salida: "Salida" } as const;

function Movimientos({ id }: { id: string }) {
  const { data, isLoading, error } = useUltimosMovimientos(id);
  if (isLoading) return <ActivityIndicator />;
  if (error) return <Text>{mensajeDeError(error)}</Text>;
  if (!data || data.length === 0) return <Text>Sin movimientos.</Text>;
  return (
    <View style={{ gap: 6 }}>
      {data.map((m) => (
        <View key={m.id} style={{ borderBottomWidth: 1, paddingBottom: 4 }}>
          <Text>
            {m.tipo ? ETIQUETA_TIPO[m.tipo] : ""} ·{" "}
            {m.unidad && m.cantidad !== null ? formatearCantidad(m.cantidad, m.unidad) : ""}
          </Text>
          <Text>
            {m.created_at ? new Date(m.created_at).toLocaleString("es") : ""} · {m.usuario}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function Ficha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { perfil } = useAuth();
  const { data: p, isLoading, error, refetch } = useProducto(id);

  if (isLoading) return <ActivityIndicator />;
  if (error || !p) {
    return (
      <View style={{ padding: 16, gap: 8 }}>
        <Text>{mensajeDeError(error)}</Text>
        <Boton titulo="Reintentar" onPress={() => void refetch()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text accessibilityRole="header">{p.nombre}</Text>
      {!p.activo ? <Text>Producto dado de baja</Text> : null}
      <Text>Código: {p.codigo}</Text>
      <Text>Existencias: {formatearCantidad(p.existencias, p.unidad)}</Text>
      <Text>Punto de pedido: {formatearCantidad(p.punto_pedido, p.unidad)}</Text>
      <Text>Estado: {ETIQUETA_ESTADO[estadoInventario(p.existencias, p.punto_pedido)]}</Text>
      {p.activo ? (
        <>
          <Boton
            titulo="Entrada"
            onPress={() => router.push({ pathname: "/movimientos/entrada", params: { productoId: p.id } })}
          />
          <Boton
            titulo="Salida"
            onPress={() => router.push({ pathname: "/movimientos/salida", params: { productoId: p.id } })}
          />
          {perfil && puede(perfil.rol, "editar_producto") ? (
            <Boton
              titulo="Editar"
              onPress={() => router.push({ pathname: "/administracion/producto/[id]/editar", params: { id: p.id } })}
            />
          ) : null}
        </>
      ) : null}
      <Text accessibilityRole="header">Últimos movimientos</Text>
      <Movimientos id={p.id} />
    </ScrollView>
  );
}
