import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { Boton } from "@/components/Boton";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede } from "@/features/auth/permisos";
import { ETIQUETA_ESTADO, estadoInventario, type Estado } from "@/features/productos/estado";
import { listarTodosProductos } from "@/features/productos/api";
import { useProductos } from "@/features/productos/hooks";
import { UNIDADES, formatearCantidad } from "@/features/productos/unidades";
import { exportarExcel, filasExistencias, nombreArchivoExistencias } from "@/features/reportes/excel";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";
import { EntradaTexto } from "@/components/EntradaTexto";
import { useTema } from "@/tema/TemaProvider";

const FILTROS: { titulo: string; estado?: Estado }[] = [
  { titulo: "Todos" },
  { titulo: "Disponible", estado: "disponible" },
  { titulo: "Bajo", estado: "bajo" },
  { titulo: "Sin existencias", estado: "sin" },
];

export default function Existencias() {
  const { colores } = useTema();
  const router = useRouter();
  const { perfil } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<Estado | undefined>(undefined);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTexto(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const { data, isLoading, error, refetch } = useProductos({ texto, estado });

  async function exportar() {
    setErrorExportar(null);
    setExportando(true);
    try {
      const ahora = new Date();
      // Paginado: la exportación no se corta en las 1000 filas del servidor.
      const todos = await listarTodosProductos({ texto, estado });
      await exportarExcel(nombreArchivoExistencias(ahora), { Existencias: filasExistencias(todos, ahora) });
    } catch (e) {
      setErrorExportar(mensajeDeError(e));
    } finally {
      setExportando(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <EntradaTexto
          accessibilityLabel="Buscar producto"
          placeholder="Buscar por nombre o código"
          value={busqueda}
          onChangeText={setBusqueda}
          style={{ flex: 1, borderWidth: 1, padding: 8 }}
        />
        <Boton titulo="Escanear" onPress={() => router.push("/escaner?destino=existencias")} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.titulo}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar: ${f.titulo}`}
            accessibilityState={{ selected: estado === f.estado }}
            onPress={() => setEstado(f.estado)}
            style={{ borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, opacity: estado === f.estado ? 1 : 0.5 }}
          >
            <Texto>{f.titulo}</Texto>
          </Pressable>
        ))}
      </View>
      {isLoading ? (
        <ActivityIndicator color={colores.interactivo} />
      ) : error ? (
        <View style={{ gap: 8 }}>
          <Texto>{mensajeDeError(error)}</Texto>
          <Boton titulo="Reintentar" onPress={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={data}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={<Texto>No hay productos.</Texto>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.nombre}
              onPress={() => router.push(`/administracion/producto/${item.id}`)}
              style={{ paddingVertical: 8, borderBottomWidth: 1 }}
            >
              <Texto>{item.nombre}</Texto>
              <Texto>
                {item.codigo} · {UNIDADES[item.unidad].abreviatura}
              </Texto>
              <Texto>
                {formatearCantidad(item.existencias, item.unidad)} ·{" "}
                {ETIQUETA_ESTADO[estadoInventario(item.existencias, item.punto_pedido)]}
              </Texto>
            </Pressable>
          )}
        />
      )}
      {errorExportar ? <Texto>{errorExportar}</Texto> : null}
      {perfil && puede(perfil.rol, "exportar_existencias") ? (
        <Boton
          titulo="Exportar a Excel"
          onPress={() => void exportar()}
          disabled={!data || data.length === 0}
          loading={exportando}
        />
      ) : null}
    </View>
  );
}
