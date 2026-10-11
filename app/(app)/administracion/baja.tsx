import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useDarBajaProducto, useProducto } from "@/features/productos/hooks";
import { BuscadorProducto } from "@/features/productos/BuscadorProducto";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

const MOTIVOS = ["Descontinuado", "Registro duplicado", "Otro"] as const;
type Motivo = (typeof MOTIVOS)[number];

function Baja() {
  const { colores } = useTema();
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
        <Texto accessibilityRole="alert" tono="exito">Producto dado de baja correctamente</Texto>
        <Boton titulo="Ver en Existencias" onPress={() => router.replace("/buscar")} />
      </View>
    );
  }

  if (!id) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <BuscadorProducto escanearDestino="baja" onElegir={setId} />
      </ScrollView>
    );
  }
  if (isLoading || !p) return <ActivityIndicator color={colores.interactivo} />;

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
      <Texto accessibilityRole="header" variante="subtitulo">{p.nombre}</Texto>
      <Texto>Código: {p.codigo}</Texto>
      <Texto>Existencias: {formatearCantidad(p.existencias, p.unidad)}</Texto>
      <Boton
        titulo="Elegir otro producto"
        onPress={() => {
          setId(null);
          setError(null);
        }}
      />
      {!p.activo ? (
        <Texto accessibilityRole="alert" tono="peligro">El producto ya está dado de baja.</Texto>
      ) : p.existencias > 0 ? (
        <View style={{ gap: 8 }}>
          <Texto accessibilityRole="alert" tono="peligro">
            Primero regulariza las existencias (registra una salida con motivo Retiro autorizado).
          </Texto>
          <Boton
            titulo="Regularizar"
            onPress={() =>
              router.push(`/movimientos/salida?productoId=${encodeURIComponent(p.id)}&motivo=retiro_autorizado`)
            }
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Texto>Motivo de la baja</Texto>
          {MOTIVOS.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={m}
              accessibilityState={{ selected: motivo === m }}
              onPress={() => setMotivo(m)}
              style={{ borderWidth: 1, padding: 8, opacity: motivo === m ? 1 : 0.5 }}
            >
              <Texto>{m}</Texto>
            </Pressable>
          ))}
          {motivo === "Otro" ? <Campo label="Detalle del motivo" value={detalle} onChangeText={setDetalle} /> : null}
          {error ? <Texto accessibilityRole="alert" tono="peligro">{error}</Texto> : null}
          <Boton titulo="Dar de baja" disabled={!motivoValido} onPress={() => setConfirmando(true)} />
        </View>
      )}
      <Modal visible={confirmando} transparent animationType="fade" onRequestClose={() => setConfirmando(false)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "#fff", padding: 16, gap: 12 }}>
            <Texto>{`¿Dar de baja "${p.nombre}"? Dejará de aparecer en Existencias.`}</Texto>
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
