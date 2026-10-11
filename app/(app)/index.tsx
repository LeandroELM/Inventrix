import { Link, useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { useAuth } from "@/features/auth/AuthProvider";
import { textoResumen } from "@/features/inicio/api";
import { useAlertasNoLeidas } from "@/features/alertas/hooks";
import { useInicio } from "@/features/inicio/hooks";
import { etiquetaMovimiento } from "@/features/movimientos/calculo";
import { formatearCantidad } from "@/features/productos/unidades";

export default function Inicio() {
  const { perfil } = useAuth();
  if (!perfil) return null;
  return <PanelInicio nombre={perfil.nombre} rol={perfil.rol} />;
}

function PanelInicio({ nombre, rol }: { nombre: string; rol: "admin" | "operativo" }) {
  const router = useRouter();
  const esAdmin = rol === "admin";
  const inicio = useInicio(rol);
  const { data } = inicio;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={inicio.isRefetching} onRefresh={() => void inicio.refetch()} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text>{`Hola, ${nombre}`}</Text>
          <Text>{esAdmin ? "Administrador" : "Operativo"}</Text>
        </View>
        {esAdmin && <CampanaAlertas />}
      </View>

      {inicio.isError && <Text>No se pudo cargar el inicio. Desliza para reintentar.</Text>}

      {data && (
        <>
          <View style={{ borderWidth: 1, padding: 12, gap: 4 }}>
            <Text>{`Productos activos: ${data.productosActivos}`}</Text>
            {textoResumen(data.resumen).map((t) => (
              <Text key={t}>{t}</Text>
            ))}
          </View>

          {data.aPedir && (
            <View style={{ borderWidth: 1, padding: 12, gap: 4 }}>
              <Text>{`Productos en punto de pedido: ${data.aPedir.total}`}</Text>
              <Text>Productos próximos a agotarse</Text>
              {data.aPedir.primeros.map((p) => (
                <Text key={p.id}>{`${p.nombre} - ${formatearCantidad(p.existencias, p.unidad)}`}</Text>
              ))}
              <Link href="/administracion/pedir" accessibilityRole="link">
                <Text>Ver todos</Text>
              </Link>
            </View>
          )}
        </>
      )}

      <Boton titulo="Entrada" onPress={() => router.push("/movimientos/entrada")} />
      <Boton titulo="Salida" onPress={() => router.push("/movimientos/salida")} />
      <Boton titulo="Escanear" onPress={() => router.push("/escaner?destino=existencias")} />

      <Text>Movimientos recientes</Text>
      {data?.recientes.length === 0 && <Text>Sin movimientos</Text>}
      {data?.recientes.map((m) => (
        <Text key={m.id}>{`${m.producto}: ${etiquetaMovimiento(m.tipo, m.cantidad, m.unidad)} (${m.usuario})`}</Text>
      ))}
    </ScrollView>
  );
}

function CampanaAlertas() {
  const noLeidas = useAlertasNoLeidas();
  return (
    <Link href="/notificaciones" accessibilityRole="link" accessibilityLabel="Alertas">
      <Text>{`Alertas (${noLeidas})`}</Text>
    </Link>
  );
}
