import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { entradaEscalonada } from "@/animacion/entradaEscalonada";
import { Presionable } from "@/animacion/Presionable";
import { Skeleton } from "@/animacion/Skeleton";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { Texto } from "@/components/Texto";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useAlertas, useMarcarLeidas } from "@/features/alertas/hooks";
import type { Alerta } from "@/features/alertas/api";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";
import { grupoDia } from "@/lib/fechaRelativa";
import { ESPACIO, RADIO, sombra } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Grupo = "HOY" | "AYER" | "ANTERIORES";
const GRUPOS: Grupo[] = ["HOY", "AYER", "ANTERIORES"];

const dos = (n: number) => String(n).padStart(2, "0");

// Hora (HH:mm) para hoy y ayer; fecha (dd/MM) para anteriores.
function marcaDeTiempo(iso: string, grupo: Grupo): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (grupo === "ANTERIORES") return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}`;
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export default function Notificaciones() {
  return (
    <RequiereRol rol="admin">
      <ListaAlertas />
    </RequiereRol>
  );
}

function ListaAlertas() {
  const { colores, esquema } = useTema();
  const router = useRouter();
  const { data, isLoading, refetch } = useAlertas();
  const marcar = useMarcarLeidas();
  const hayNoLeidas = data?.some((a) => !a.leida) ?? false;
  const ahora = new Date();

  const porGrupo = new Map<Grupo, Alerta[]>();
  for (const a of data ?? []) {
    const g = grupoDia(a.created_at, ahora);
    porGrupo.set(g, [...(porGrupo.get(g) ?? []), a]);
  }

  let indice = 0;
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado
        variante="pantalla"
        titulo="Notificaciones"
        onAtras={() => router.back()}
        accion={{
          texto: "Marcar leídas",
          deshabilitado: !hayNoLeidas || marcar.isPending,
          onPress: () => marcar.mutate(),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
        {marcar.isError ? (
          <Texto accessibilityRole="alert" tono="peligro">
            {mensajeDeError(marcar.error)}
          </Texto>
        ) : null}
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
              No se pudieron cargar las alertas.
            </Texto>
            <Boton titulo="Reintentar" onPress={() => void refetch()} />
          </View>
        ) : null}
        {data?.length === 0 ? <Texto tono="secundario">No hay alertas.</Texto> : null}
        {GRUPOS.map((g) => {
          const alertas = porGrupo.get(g);
          if (!alertas) return null;
          return (
            <View key={g} style={{ gap: ESPACIO.s }}>
              <Texto variante="etiqueta" tono="secundario" accessibilityRole="header">
                {g}
              </Texto>
              {alertas.map((a) => {
                const titulo = `Reabastecer: ${a.producto}`;
                const detalle = `Quedan ${formatearCantidad(a.existencias, a.unidad)} y su punto de pedido es ${formatearCantidad(a.punto_pedido, a.unidad)}.`;
                const hora = marcaDeTiempo(a.created_at, g);
                return (
                  <Animated.View key={a.id} entering={entradaEscalonada(indice++)}>
                    <Presionable
                      accessibilityRole="button"
                      accessibilityLabel={`${a.leida ? "" : "No leída. "}${titulo}. ${detalle} ${hora}`}
                      onPress={() => router.push("/administracion/pedir")}
                      style={[
                        {
                          backgroundColor: a.leida ? colores.superficie : colores.primario,
                          borderRadius: RADIO.tarjeta,
                          padding: ESPACIO.l,
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: ESPACIO.m,
                        },
                        sombra("suave", esquema),
                      ]}
                    >
                      <View style={{ flex: 1, gap: ESPACIO.xs }}>
                        <Texto variante="cuerpoFuerte" tono={a.leida ? "texto" : "sobrePrimario"}>
                          {titulo}
                        </Texto>
                        <Texto tono={a.leida ? "secundario" : "sobrePrimario"}>{detalle}</Texto>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: ESPACIO.s }}>
                        <Texto variante="pequeno" tono={a.leida ? "secundario" : "sobrePrimario"}>
                          {hora}
                        </Texto>
                        {!a.leida ? (
                          <View
                            testID="punto-no-leida"
                            style={{ width: 10, height: 10, borderRadius: RADIO.completo, backgroundColor: colores.advertencia }}
                          />
                        ) : null}
                      </View>
                    </Presionable>
                  </Animated.View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
