import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useAPedir } from "@/features/alertas/hooks";
import { formatearCantidad } from "@/features/productos/unidades";

export default function Pedir() {
  return (
    <RequiereRol rol="admin">
      <ListaAPedir />
    </RequiereRol>
  );
}

function ListaAPedir() {
  const router = useRouter();
  const { data, isLoading, isError } = useAPedir();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text>Estos productos alcanzaron su punto de pedido.</Text>
      {isLoading && <Text>Cargando…</Text>}
      {isError && <Text accessibilityRole="alert">No se pudo cargar la lista.</Text>}
      {data?.length === 0 && <Text>No hay productos en punto de pedido.</Text>}
      {data && data.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Text style={{ flex: 2 }}>Producto</Text>
          <Text style={{ flex: 1 }}>Existencias</Text>
          <Text style={{ flex: 1 }}>Punto de pedido</Text>
        </View>
      )}
      {data?.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={p.nombre}
          onPress={() => router.push({ pathname: "/administracion/producto/[id]", params: { id: p.id } })}
          style={{ flexDirection: "row", gap: 8, borderWidth: 1, padding: 8 }}
        >
          <Text style={{ flex: 2 }}>{p.nombre}</Text>
          <Text style={{ flex: 1 }}>{formatearCantidad(p.existencias, p.unidad)}</Text>
          <Text style={{ flex: 1 }}>{formatearCantidad(p.punto_pedido, p.unidad)}</Text>
        </Pressable>
      ))}
      <Text>Esta versión no genera órdenes de compra.</Text>
    </ScrollView>
  );
}
