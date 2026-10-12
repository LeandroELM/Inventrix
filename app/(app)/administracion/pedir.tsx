import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { entradaEscalonada } from "@/animacion/entradaEscalonada";
import { Skeleton } from "@/animacion/Skeleton";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { Icono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useAPedir } from "@/features/alertas/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export default function Pedir() {
  return (
    <RequiereRol rol="admin">
      <ListaAPedir />
    </RequiereRol>
  );
}

// Proporción de existencias respecto del punto de pedido, con tope de 100 %.
function proporcion(existencias: number, puntoPedido: number): number {
  if (puntoPedido <= 0) return 1;
  return Math.min(Math.max(existencias / puntoPedido, 0), 1);
}

function ListaAPedir() {
  const { colores } = useTema();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useAPedir();

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado variante="pantalla" titulo="Productos a pedir" onAtras={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
        {/* Si una recarga falla pero ya hay datos, se siguen mostrando. */}
        {!data && isLoading ? (
          <>
            <Skeleton.Fila />
            <Skeleton.Fila />
          </>
        ) : null}
        {!data && !isLoading ? (
          <View style={{ gap: ESPACIO.m }}>
            <Texto accessibilityRole="alert" tono="peligro">
              {mensajeDeError(error)}
            </Texto>
            <Boton titulo="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : null}
        {data?.length === 0 ? <Texto tono="secundario">Ningún producto está en su punto de pedido.</Texto> : null}
        {data && data.length > 0 ? (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: ESPACIO.m,
                backgroundColor: colores.advertenciaSuave,
                borderRadius: RADIO.tarjeta,
                padding: ESPACIO.l,
              }}
            >
              <Icono nombre="alerta" tamano={28} color={colores.textoAdvertencia} />
              <View style={{ flex: 1, gap: ESPACIO.xs }}>
                <Texto variante="subtitulo" style={{ color: colores.textoAdvertencia }}>
                  {data.length === 1 ? "1 producto" : `${data.length} productos`}
                </Texto>
                <Texto style={{ color: colores.textoAdvertencia }}>
                  Alcanzaron o están por debajo de su punto de pedido.
                </Texto>
              </View>
            </View>
            {data.map((p, i) => (
              <Animated.View key={p.id} entering={entradaEscalonada(i)}>
                <Tarjeta
                  accessibilityLabel={p.nombre}
                  onPress={() => router.push({ pathname: "/administracion/producto/[id]", params: { id: p.id } })}
                >
                  <View style={{ gap: ESPACIO.s }}>
                    <Texto variante="cuerpoFuerte">{p.nombre}</Texto>
                    <View style={{ flexDirection: "row", gap: ESPACIO.m }}>
                      <View style={{ flex: 1 }}>
                        <Texto variante="pequeno" tono="secundario">
                          Existencias
                        </Texto>
                        <Texto variante="cuerpoFuerte">{formatearCantidad(p.existencias, p.unidad)}</Texto>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Texto variante="pequeno" tono="secundario">
                          Punto de pedido
                        </Texto>
                        <Texto variante="cuerpoFuerte">{formatearCantidad(p.punto_pedido, p.unidad)}</Texto>
                      </View>
                    </View>
                    <View
                      style={{ height: 8, borderRadius: RADIO.completo, backgroundColor: colores.linea, overflow: "hidden" }}
                    >
                      <View
                        testID={`barra-${p.id}`}
                        style={{
                          height: 8,
                          borderRadius: RADIO.completo,
                          backgroundColor: colores.peligro,
                          width: `${Math.round(proporcion(p.existencias, p.punto_pedido) * 100)}%`,
                        }}
                      />
                    </View>
                  </View>
                </Tarjeta>
              </Animated.View>
            ))}
            <View style={{ flexDirection: "row", gap: ESPACIO.s, alignItems: "flex-start" }}>
              <Icono nombre="info" tamano={18} color={colores.textoSecundario} />
              <Texto variante="pequeno" tono="secundario" style={{ flex: 1 }}>
                Esta versión no genera órdenes de compra. La decisión de pedir corresponde al responsable de la empresa.
              </Texto>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
