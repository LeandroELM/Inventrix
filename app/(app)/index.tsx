import { Link, useRouter } from "expo-router";
import { RefreshControl, ScrollView, View } from "react-native";
import { Boton } from "@/components/Boton";
import { useAuth } from "@/features/auth/AuthProvider";
import { textoResumen } from "@/features/inicio/api";
import { useAlertasNoLeidas } from "@/features/alertas/hooks";
import { useInicio } from "@/features/inicio/hooks";
import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import { formatearCantidad } from "@/features/productos/unidades";
import { Texto } from "@/components/Texto";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTema } from "@/tema/TemaProvider";

export default function Inicio() {
  const { perfil } = useAuth();
  if (!perfil) return null;
  return <PanelInicio nombre={perfil.nombre} rol={perfil.rol} />;
}

function PanelInicio({ nombre, rol }: { nombre: string; rol: "admin" | "operativo" }) {
  const router = useRouter();
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const esAdmin = rol === "admin";
  const inicio = useInicio(rol);
  const { data } = inicio;

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={inicio.isRefetching} onRefresh={() => void inicio.refetch()} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Texto>{`Hola, ${nombre}`}</Texto>
          <Texto>{esAdmin ? "Administrador" : "Operativo"}</Texto>
        </View>
        {esAdmin && <CampanaAlertas />}
      </View>

      {inicio.isError && <Texto>No se pudo cargar el inicio. Desliza para reintentar.</Texto>}

      {data && (
        <>
          <View style={{ borderWidth: 1, borderColor: colores.linea, padding: 12, gap: 4 }}>
            <Texto>{`Productos activos: ${data.productosActivos}`}</Texto>
            {textoResumen(data.resumen).map((t) => (
              <Texto key={t}>{t}</Texto>
            ))}
          </View>

          {data.aPedir && (
            <View style={{ borderWidth: 1, borderColor: colores.linea, padding: 12, gap: 4 }}>
              <Texto>{`Productos en punto de pedido: ${data.aPedir.total}`}</Texto>
              <Texto>Productos próximos a agotarse</Texto>
              {data.aPedir.primeros.map((p) => (
                <Texto key={p.id}>{`${p.nombre} - ${formatearCantidad(p.existencias, p.unidad)}`}</Texto>
              ))}
              <Link href="/administracion/pedir" accessibilityRole="link">
                <Texto>Ver todos</Texto>
              </Link>
            </View>
          )}
        </>
      )}

      <Boton titulo="Entrada" onPress={() => router.push("/movimientos/entrada")} />
      <Boton titulo="Salida" onPress={() => router.push("/movimientos/salida")} />
      <Boton titulo="Escanear" onPress={() => router.push("/escaner?destino=existencias")} />

      <Texto>Movimientos recientes</Texto>
      {data?.recientes.length === 0 && <Texto>Sin movimientos</Texto>}
      {data?.recientes.map((m) => (
        <Texto key={m.id}>{`${m.producto}: ${etiquetaMovimiento(m.tipo, m.cantidad, m.unidad)} (${m.usuario})`}</Texto>
      ))}
    </ScrollView>
  );
}

function CampanaAlertas() {
  const noLeidas = useAlertasNoLeidas();
  return (
    <Link href="/notificaciones" accessibilityRole="link" accessibilityLabel="Alertas">
      <Texto>{`Alertas (${noLeidas})`}</Texto>
    </Link>
  );
}
