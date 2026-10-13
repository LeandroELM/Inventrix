import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { Skeleton } from "@/animacion/Skeleton";
import { AnilloExistencias } from "@/components/AnilloExistencias";
import { AvisoRecarga } from "@/components/AvisoRecarga";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { EstadoError } from "@/components/EstadoError";
import { Etiqueta } from "@/components/Etiqueta";
import { FilaMovimiento } from "@/components/FilaMovimiento";
import { Icono } from "@/components/Icono";
import { Presionable } from "@/animacion/Presionable";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede } from "@/features/auth/permisos";
import { ETIQUETAS_MOTIVO_BAJA } from "@/features/productos/motivosBaja";
import { useProducto, useUltimosMovimientos } from "@/features/productos/hooks";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

function Movimientos({ id }: { id: string }) {
  const { data, isLoading, isError, refetch } = useUltimosMovimientos(id);
  if (!data) {
    if (isLoading) return <Skeleton.Fila />;
    if (isError) return <EstadoError mensaje="No se pudieron cargar los movimientos." onReintentar={() => void refetch()} />;
    return null;
  }
  if (data.length === 0) return <Texto tono="secundario">Sin movimientos.</Texto>;
  return (
    <View>
      {data.map((m) =>
        m.tipo && m.unidad && m.cantidad !== null && m.created_at ? (
          <FilaMovimiento
            key={m.id}
            producto={m.producto ?? ""}
            tipo={m.tipo}
            motivo={m.motivo}
            fecha={m.created_at}
            cantidad={m.cantidad}
            unidad={m.unidad}
            usuario={m.usuario ?? undefined}
          />
        ) : null,
      )}
    </View>
  );
}

export default function Ficha() {
  const { colores } = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { perfil } = useAuth();
  const { data: p, isLoading, refetch, isError } = useProducto(id);
  const puedeEditar = !!perfil && puede(perfil.rol, "editar_producto");

  // Si una recarga falla pero ya hay datos, se siguen mostrando.
  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <Encabezado variante="pantalla" titulo="Producto" onAtras={() => router.back()} />
        <View style={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
          {isLoading ? (
            <>
              <Skeleton.Fila />
              <Skeleton.Fila />
            </>
          ) : (
            <EstadoError mensaje="No se pudo cargar el producto." onReintentar={() => void refetch()} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado
        variante="pantalla"
        titulo={p.nombre}
        lineasTitulo={2}
        subtitulo={p.codigo ? `Código: ${p.codigo}` : "Sin código"}
        onAtras={() => router.back()}
        accion={
          p.activo && puedeEditar
            ? {
                icono: "lapiz",
                etiqueta: "Editar producto",
                onPress: () => router.push({ pathname: "/administracion/producto/[id]/editar", params: { id: p.id } }),
              }
            : undefined
        }
      />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.l, gap: ESPACIO.l }}>
        {isError ? <AvisoRecarga onReintentar={() => void refetch()} /> : null}
        <AnilloExistencias existencias={p.existencias} puntoPedido={p.punto_pedido} unidad={p.unidad} />
        {!p.activo ? (
          <Tarjeta>
            <View style={{ gap: ESPACIO.s }}>
              <Etiqueta tipo="inactivo" texto="Dado de baja" />
              {p.motivo_baja ? <Texto>{`Motivo: ${ETIQUETAS_MOTIVO_BAJA[p.motivo_baja]}`}</Texto> : null}
              {p.detalle_baja ? <Texto>{`Detalle: ${p.detalle_baja}`}</Texto> : null}
            </View>
          </Tarjeta>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: ESPACIO.m }}>
              <View style={{ flex: 1 }}>
                <Boton
                  titulo="Entrada"
                  icono="entrada"
                  onPress={() => router.push({ pathname: "/movimientos/entrada", params: { productoId: p.id } })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Boton
                  titulo="Salida"
                  icono="salida"
                  variante="secundario"
                  onPress={() => router.push({ pathname: "/movimientos/salida", params: { productoId: p.id } })}
                />
              </View>
            </View>
            {!puedeEditar ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.s }}>
                <Icono nombre="candado" tamano={18} color={colores.textoSecundario} />
                <Texto tono="secundario" style={{ flex: 1 }}>
                  La edición de datos maestros es exclusiva del Administrador.
                </Texto>
              </View>
            ) : null}
          </>
        )}
        <View style={{ gap: ESPACIO.s }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Texto accessibilityRole="header" variante="subtitulo">
              Movimientos del producto
            </Texto>
            <Presionable
              accessibilityRole="button"
              accessibilityLabel="Ver todo"
              onPress={() => router.push(`/movimientos?productoId=${p.id}`)}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Texto tono="interactivo" variante="etiqueta">
                Ver todo
              </Texto>
            </Presionable>
          </View>
          <Movimientos id={p.id} />
        </View>
      </ScrollView>
    </View>
  );
}
