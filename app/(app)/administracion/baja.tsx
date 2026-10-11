import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useDarBajaProducto, useProducto, useProductos } from "@/features/productos/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";

const MOTIVOS = ["Descontinuado", "Registro duplicado", "Otro"] as const;
type Motivo = (typeof MOTIVOS)[number];

function Buscador({ onElegir }: { onElegir: (id: string) => void }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTexto(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);
  const { data, isLoading } = useProductos({ texto });
  return (
    <View style={{ gap: 8 }}>
      <Campo label="Buscar producto" value={busqueda} onChangeText={setBusqueda} placeholder="Nombre o código" />
      <Boton titulo="Escanear" onPress={() => router.push("/escaner?destino=baja")} />
      {isLoading ? <ActivityIndicator /> : null}
      {(data ?? []).slice(0, 20).map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={p.nombre}
          onPress={() => onElegir(p.id)}
          style={{ paddingVertical: 8, borderBottomWidth: 1 }}
        >
          <Text>{p.nombre}</Text>
          <Text>{p.codigo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Baja() {
  const router = useRouter();
  const { productoId } = useLocalSearchParams<{ productoId?: string }>();
  // undefined: usa el producto recibido por parámetro; null: el usuario pidió elegir otro.
  const [elegido, setId] = useState<string | null | undefined>(undefined);
  const id = elegido === undefined ? (productoId ?? null) : elegido;
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [detalle, setDetalle] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const baja = useDarBajaProducto();
  const { data: p, isLoading } = useProducto(id ?? "");

  if (hecho) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Text accessibilityRole="alert">Producto dado de baja correctamente</Text>
        <Boton titulo="Ver en Existencias" onPress={() => router.replace("/administracion/existencias")} />
      </View>
    );
  }

  if (!id) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Buscador onElegir={setId} />
      </ScrollView>
    );
  }
  if (isLoading || !p) return <ActivityIndicator />;

  const motivoTexto = motivo === "Otro" ? `Otro: ${detalle.trim()}` : (motivo ?? "");
  const motivoValido = motivo !== null && (motivo !== "Otro" || detalle.trim() !== "");

  async function confirmar() {
    if (!p) return;
    setError(null);
    try {
      await baja.mutateAsync({ id: p.id, motivo: motivoTexto });
      setConfirmando(false);
      setHecho(true);
    } catch (e) {
      setConfirmando(false);
      setError(mensajeDeError(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header">{p.nombre}</Text>
      <Text>Código: {p.codigo}</Text>
      <Text>Existencias: {formatearCantidad(p.existencias, p.unidad)}</Text>
      <Boton
        titulo="Elegir otro producto"
        onPress={() => {
          setId(null);
          setError(null);
        }}
      />
      {!p.activo ? (
        <Text accessibilityRole="alert">El producto ya está dado de baja.</Text>
      ) : p.existencias > 0 ? (
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert">
            Primero regulariza las existencias (registra una salida con motivo Retiro autorizado).
          </Text>
          <Boton
            titulo="Regularizar"
            onPress={() =>
              router.push(`/movimientos/salida?productoId=${encodeURIComponent(p.id)}&motivo=retiro_autorizado`)
            }
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text>Motivo de la baja</Text>
          {MOTIVOS.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={m}
              accessibilityState={{ selected: motivo === m }}
              onPress={() => setMotivo(m)}
              style={{ borderWidth: 1, padding: 8, opacity: motivo === m ? 1 : 0.5 }}
            >
              <Text>{m}</Text>
            </Pressable>
          ))}
          {motivo === "Otro" ? <Campo label="Detalle del motivo" value={detalle} onChangeText={setDetalle} /> : null}
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
          <Boton titulo="Dar de baja" disabled={!motivoValido} onPress={() => setConfirmando(true)} />
        </View>
      )}
      <Modal visible={confirmando} transparent animationType="fade" onRequestClose={() => setConfirmando(false)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, gap: 12 }}>
            <Text>{`¿Dar de baja "${p.nombre}"? Dejará de aparecer en Existencias.`}</Text>
            <Boton titulo="Confirmar baja" loading={baja.isPending} onPress={() => void confirmar()} />
            <Boton titulo="Cancelar" onPress={() => setConfirmando(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function BajaProducto() {
  return (
    <RequiereRol rol="admin">
      <Baja />
    </RequiereRol>
  );
}
