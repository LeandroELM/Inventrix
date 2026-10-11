import { ScrollView, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { useAlertas, useMarcarLeidas } from "@/features/alertas/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

function fechaLegible(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export default function Notificaciones() {
  const { data, isLoading, isError } = useAlertas();
  const marcar = useMarcarLeidas();
  const hayNoLeidas = data?.some((a) => !a.leida) ?? false;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Boton
        titulo="Marcar todas como leídas"
        disabled={!hayNoLeidas}
        loading={marcar.isPending}
        onPress={() => marcar.mutate()}
      />
      {marcar.isError && <Text accessibilityRole="alert">{mensajeDeError(marcar.error)}</Text>}
      {isLoading && <Text>Cargando…</Text>}
      {isError && <Text accessibilityRole="alert">No se pudieron cargar las alertas.</Text>}
      {data?.length === 0 && <Text>No hay alertas.</Text>}
      {data?.map((a) => (
        <View key={a.id} style={{ borderWidth: 1, padding: 12, gap: 4 }}>
          <Text>{a.producto}</Text>
          <Text>{`Existencias: ${formatearCantidad(a.existencias, a.unidad)} · Punto de pedido: ${formatearCantidad(a.punto_pedido, a.unidad)}`}</Text>
          <Text>{fechaLegible(a.created_at)}</Text>
          <Text>{a.leida ? "Leída" : "No leída"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
