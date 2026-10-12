import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { Presionable } from "@/animacion/Presionable";
import { entradaEscalonada } from "@/animacion/entradaEscalonada";
import { Skeleton } from "@/animacion/Skeleton";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { FilaMovimiento } from "@/components/FilaMovimiento";
import { FilaProducto } from "@/components/FilaProducto";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaIndicador } from "@/components/TarjetaIndicador";
import { TarjetaPrincipal } from "@/components/TarjetaPrincipal";
import { Texto } from "@/components/Texto";
import { useAlertasNoLeidas } from "@/features/alertas/hooks";
import type { Rol } from "@/features/auth/permisos";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Inicio as DatosInicio, ResumenUnidad } from "@/features/inicio/api";
import { useInicio } from "@/features/inicio/hooks";
import { estadoInventario } from "@/features/productos/estado";
import { formatearCantidad, UNIDADES } from "@/features/productos/unidades";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export default function Inicio() {
  const { perfil } = useAuth();
  if (!perfil) return null;
  return <PanelInicio nombre={perfil.nombre} rol={perfil.rol} />;
}

const ORDEN_UNIDADES = Object.keys(UNIDADES);

function ordenarResumen(resumen: ResumenUnidad[]): ResumenUnidad[] {
  return [...resumen].sort((a, b) => ORDEN_UNIDADES.indexOf(a.unidad) - ORDEN_UNIDADES.indexOf(b.unidad));
}

function PanelInicio({ nombre, rol }: { nombre: string; rol: Rol }) {
  const router = useRouter();
  const { colores } = useTema();
  const esAdmin = rol === "admin";
  const inicio = useInicio(rol);
  const { data } = inicio;

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={{ paddingBottom: ESPACIO.l, gap: ESPACIO.l }}
      refreshControl={<RefreshControl refreshing={inicio.isRefetching} onRefresh={() => void inicio.refetch()} />}
    >
      {esAdmin ? (
        <EncabezadoAdmin nombre={nombre} onAlertas={() => router.push("/notificaciones")} />
      ) : (
        <Encabezado variante="inicio" nombre={nombre} rol="Usuario operativo" />
      )}
      <View style={{ paddingHorizontal: ESPACIO.l, gap: ESPACIO.l }}>
        {inicio.isError ? (
          <Tarjeta>
            <View style={{ gap: ESPACIO.m }}>
              <Texto>No se pudo cargar el inicio.</Texto>
              <Boton titulo="Reintentar" onPress={() => void inicio.refetch()} />
            </View>
          </Tarjeta>
        ) : data ? (
          <Contenido datos={data} esAdmin={esAdmin} />
        ) : (
          <View style={{ gap: ESPACIO.m }}>
            <Skeleton.Tarjeta />
            <Skeleton.Tarjeta />
            <Skeleton.Fila />
            <Skeleton.Fila />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function EncabezadoAdmin({ nombre, onAlertas }: { nombre: string; onAlertas: () => void }) {
  const noLeidas = useAlertasNoLeidas();
  return <Encabezado variante="inicio" nombre={nombre} rol="Administrador" alertas={noLeidas} onAlertas={onAlertas} />;
}

function Contenido({ datos, esAdmin }: { datos: DatosInicio; esAdmin: boolean }) {
  const router = useRouter();
  const resumen = ordenarResumen(datos.resumen);
  const aPedir = datos.aPedir;
  const chips = datos.hoy
    ? [
        { texto: `+${datos.hoy.entradas} entradas hoy`, tono: "exito" as const },
        { texto: `−${datos.hoy.salidas} salidas hoy`, tono: "neutro" as const },
      ]
    : undefined;

  return (
    <>
      <Animated.View entering={entradaEscalonada(0)}>
        <TarjetaPrincipal
          titulo="Productos registrados"
          valor={datos.productosActivos}
          sufijo="activos"
          chips={esAdmin ? chips : undefined}
          accesos={[
            { titulo: "Entrada", icono: "entrada", onPress: () => router.push("/movimientos/entrada") },
            { titulo: "Salida", icono: "salida", onPress: () => router.push("/movimientos/salida") },
            {
              titulo: "Escanear",
              icono: "escanear",
              destacado: true,
              onPress: () => router.push("/escaner?destino=existencias"),
            },
          ]}
        />
      </Animated.View>

      {esAdmin && aPedir ? (
        <Animated.View entering={entradaEscalonada(1)} style={{ flexDirection: "row", gap: ESPACIO.m }}>
          <View style={{ flex: 1 }}>
            <TarjetaIndicador
              variante="alerta"
              valor={aPedir.total}
              texto="Productos en punto de pedido"
              onPress={() => router.push("/administracion/pedir")}
            />
          </View>
          <View style={{ flex: 1 }}>
            <TarjetaIndicador
              variante="lista"
              titulo="Existencias generales"
              filas={resumen.map((r) => {
                const [valor, ...resto] = formatearCantidad(r.total, r.unidad).split(" ");
                return { valor, etiqueta: resto.join(" ") };
              })}
            />
          </View>
        </Animated.View>
      ) : null}

      {!esAdmin ? (
        <Animated.View entering={entradaEscalonada(1)}>
          <Seccion titulo="Resumen de existencias">
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: ESPACIO.m }}>
              {resumen.map((r) => (
                <View key={r.unidad} style={{ width: "33.33%", gap: ESPACIO.xs, paddingRight: ESPACIO.s }}>
                  <Texto variante="cuerpoFuerte">{formatearCantidad(r.total, r.unidad)}</Texto>
                  <Texto variante="pequeno" tono="secundario">
                    {UNIDADES[r.unidad].nombre}
                  </Texto>
                </View>
              ))}
            </View>
          </Seccion>
        </Animated.View>
      ) : null}

      {esAdmin && aPedir && aPedir.primeros.length > 0 ? (
        <Animated.View entering={entradaEscalonada(2)}>
          <Seccion
            titulo="Productos próximos a agotarse"
            enlace="Ver todos"
            onEnlace={() => router.push("/administracion/pedir")}
          >
            {aPedir.primeros.map((p, i) => (
              <Animated.View key={p.id} entering={entradaEscalonada(i + 3)}>
                <FilaProducto
                  nombre={p.nombre}
                  detalle={p.codigo ?? UNIDADES[p.unidad].nombre}
                  cantidad={formatearCantidad(p.existencias, p.unidad)}
                  estado={estadoInventario(p.existencias, p.punto_pedido)}
                  onPress={() => router.push(`/administracion/producto/${p.id}`)}
                />
              </Animated.View>
            ))}
          </Seccion>
        </Animated.View>
      ) : null}

      {datos.recientes.length === 0 ? (
        <Texto tono="secundario">Aún no hay movimientos.</Texto>
      ) : (
        <Animated.View entering={entradaEscalonada(3)}>
          <Seccion
            titulo={esAdmin ? "Movimientos recientes" : "Últimos movimientos"}
            enlace={esAdmin ? "Historial" : undefined}
            onEnlace={() => router.push("/movimientos")}
          >
            {datos.recientes.map((m, i) => (
              <Animated.View key={m.id} entering={entradaEscalonada(i + 4)}>
                <FilaMovimiento
                  producto={m.producto}
                  tipo={m.tipo}
                  motivo={m.motivo}
                  fecha={m.created_at}
                  cantidad={m.cantidad}
                  unidad={m.unidad}
                  usuario={m.usuario}
                />
              </Animated.View>
            ))}
          </Seccion>
        </Animated.View>
      )}
    </>
  );
}

function Seccion({
  titulo,
  enlace,
  onEnlace,
  children,
}: {
  titulo: string;
  enlace?: string;
  onEnlace?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: ESPACIO.s }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Texto variante="subtitulo">{titulo}</Texto>
        {enlace && onEnlace ? (
          <Presionable
            accessibilityRole="link"
            accessibilityLabel={enlace}
            onPress={onEnlace}
            style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: ESPACIO.s }}
          >
            <Texto variante="etiqueta" tono="interactivo">
              {enlace}
            </Texto>
          </Presionable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
