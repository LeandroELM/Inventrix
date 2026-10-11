import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Campo } from "@/components/Campo";
import { useProductos } from "@/features/productos/hooks";

export function BuscadorProducto({ onElegir }: { onElegir: (id: string, nombre: string) => void }) {
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
      {isLoading ? <ActivityIndicator /> : null}
      {(data ?? []).slice(0, 20).map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={p.nombre}
          onPress={() => onElegir(p.id, p.nombre)}
          style={{ paddingVertical: 8, borderBottomWidth: 1 }}
        >
          <Text>{p.nombre}</Text>
          <Text>{p.codigo}</Text>
        </Pressable>
      ))}
    </View>
  );
}
