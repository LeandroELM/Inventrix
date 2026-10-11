import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { useProductos } from "@/features/productos/hooks";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

export function BuscadorProducto({
  onElegir,
  escanearDestino,
}: {
  onElegir: (id: string, nombre: string) => void;
  // Si se indica, muestra el botón Escanear hacia /escaner?destino=...
  escanearDestino?: string;
}) {
  const router = useRouter();
  const { colores } = useTema();
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
      {escanearDestino ? <Boton titulo="Escanear" onPress={() => router.push(`/escaner?destino=${escanearDestino}`)} /> : null}
      {isLoading ? <ActivityIndicator color={colores.interactivo} /> : null}
      {(data ?? []).slice(0, 20).map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={p.nombre}
          onPress={() => onElegir(p.id, p.nombre)}
          style={{ paddingVertical: 8, borderBottomWidth: 1 }}
        >
          <Texto>{p.nombre}</Texto>
          <Texto>{p.codigo}</Texto>
        </Pressable>
      ))}
    </View>
  );
}
