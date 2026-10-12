import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Boton } from "@/components/Boton";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede } from "@/features/auth/permisos";
import { ETIQUETA_ESTADO, estadoInventario } from "@/features/productos/estado";
import { useProducto, useUltimosMovimientos } from "@/features/productos/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

const ETIQUETA_TIPO = { inicial: "Inicial", entrada: "Entrada", salida: "Salida", baja: "Baja" } as const;

function Movimientos({ id }: { id: string }) {
  const { colores } = useTema();
  const { data, isLoading, error } = useUltimosMovimientos(id);
  if (isLoading) return <ActivityIndicator color={colores.interactivo} />;
  if (error) return <Texto>{mensajeDeError(error)}</Texto>;
  if (!data || data.length === 0) return <Texto>Sin movimientos.</Texto>;
  return (
    <View style={{ gap: 6 }}>
      {data.map((m) => (
        <View key={m.id} style={{ borderBottomWidth: 1, paddingBottom: 4 }}>
          <Texto>
            {m.tipo ? ETIQUETA_TIPO[m.tipo] : ""} ·{" "}
            {m.unidad && m.cantidad !== null ? formatearCantidad(m.cantidad, m.unidad) : ""}
          </Texto>
          <Texto>
            {m.created_at ? new Date(m.created_at).toLocaleString("es") : ""} · {m.usuario}
          </Texto>
        </View>
      ))}
    </View>
  );
}

export default function Ficha() {
  const { colores } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { perfil } = useAuth();
  const { data: p, isLoading, error, refetch } = useProducto(id);

  if (isLoading) return <ActivityIndicator color={colores.interactivo} />;
  if (error || !p) {
    return (
      <View style={{ padding: 16, gap: 8 }}>
        <Texto>{mensajeDeError(error)}</Texto>
        <Boton titulo="Reintentar" onPress={() => void refetch()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Texto accessibilityRole="header" variante="subtitulo">{p.nombre}</Texto>
      {!p.activo ? <Texto>Producto dado de baja</Texto> : null}
      <Texto>Código: {p.codigo}</Texto>
      <Texto>Existencias: {formatearCantidad(p.existencias, p.unidad)}</Texto>
      <Texto>Punto de pedido: {formatearCantidad(p.punto_pedido, p.unidad)}</Texto>
      <Texto>Estado: {ETIQUETA_ESTADO[estadoInventario(p.existencias, p.punto_pedido)]}</Texto>
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
      <Texto accessibilityRole="header" variante="subtitulo">Últimos movimientos</Texto>
      <Movimientos id={p.id} />
    </ScrollView>
  );
}
