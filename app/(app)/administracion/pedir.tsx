import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useAPedir } from "@/features/alertas/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

export default function Pedir() {
  return (
    <RequiereRol rol="admin">
      <ListaAPedir />
    </RequiereRol>
  );
}

function ListaAPedir() {
  const { colores } = useTema();
  const router = useRouter();
  const { data, isLoading, isError } = useAPedir();

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Texto>Estos productos alcanzaron su punto de pedido.</Texto>
      {isLoading && <Texto>Cargando…</Texto>}
      {isError && <Texto accessibilityRole="alert" tono="peligro">No se pudo cargar la lista.</Texto>}
      {data?.length === 0 && <Texto>No hay productos en punto de pedido.</Texto>}
      {data && data.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Texto style={{ flex: 2 }}>Producto</Texto>
          <Texto style={{ flex: 1 }}>Existencias</Texto>
          <Texto style={{ flex: 1 }}>Punto de pedido</Texto>
        </View>
      )}
      {data?.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={p.nombre}
          onPress={() => router.push({ pathname: "/administracion/producto/[id]", params: { id: p.id } })}
          style={{ flexDirection: "row", gap: 8, borderWidth: 1, borderColor: colores.linea, padding: 8 }}
        >
          <Texto style={{ flex: 2 }}>{p.nombre}</Texto>
          <Texto style={{ flex: 1 }}>{formatearCantidad(p.existencias, p.unidad)}</Texto>
          <Texto style={{ flex: 1 }}>{formatearCantidad(p.punto_pedido, p.unidad)}</Texto>
        </Pressable>
      ))}
      <Texto>Esta versión no genera órdenes de compra.</Texto>
    </ScrollView>
  );
}
