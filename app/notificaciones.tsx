import { ScrollView, View } from "react-native";
import { Boton } from "@/components/Boton";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useAlertas, useMarcarLeidas } from "@/features/alertas/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

function fechaLegible(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export default function Notificaciones() {
  return (
    <RequiereRol rol="admin">
      <ListaAlertas />
    </RequiereRol>
  );
}

function ListaAlertas() {
  const { colores } = useTema();
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
      {marcar.isError && <Texto accessibilityRole="alert" tono="peligro">{mensajeDeError(marcar.error)}</Texto>}
      {isLoading && <Texto>Cargando…</Texto>}
      {isError && <Texto accessibilityRole="alert" tono="peligro">No se pudieron cargar las alertas.</Texto>}
      {data?.length === 0 && <Texto>No hay alertas.</Texto>}
      {data?.map((a) => (
        <View key={a.id} style={{ borderWidth: 1, borderColor: colores.linea, padding: 12, gap: 4 }}>
          <Texto>{a.producto}</Texto>
          <Texto>{`Existencias: ${formatearCantidad(a.existencias, a.unidad)} · Punto de pedido: ${formatearCantidad(a.punto_pedido, a.unidad)}`}</Texto>
          <Texto>{fechaLegible(a.created_at)}</Texto>
          <Texto>{a.leida ? "Leída" : "No leída"}</Texto>
        </View>
      ))}
    </ScrollView>
  );
}
