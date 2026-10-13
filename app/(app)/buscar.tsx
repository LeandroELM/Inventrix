import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Skeleton } from "@/animacion/Skeleton";
import { AvisoRecarga } from "@/components/AvisoRecarga";
import { Boton } from "@/components/Boton";
import { ChipsFiltro } from "@/components/ChipsFiltro";
import { EntradaTexto } from "@/components/EntradaTexto";
import { Encabezado } from "@/components/Encabezado";
import { EstadoError } from "@/components/EstadoError";
import { FilaProducto } from "@/components/FilaProducto";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede } from "@/features/auth/permisos";
import { estadoInventario, type Estado } from "@/features/productos/estado";
import { listarTodosProductos } from "@/features/productos/api";
import { useProductos } from "@/features/productos/hooks";
import { detalleProducto, formatearCantidad } from "@/features/productos/unidades";
import { exportarExcel, filasExistencias, nombreArchivoExistencias } from "@/features/reportes/excel";
import { mensajeDeError } from "@/lib/errores";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Filtro = "todos" | Estado;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: "todos", texto: "Todos" },
  { valor: "disponible", texto: "Disponible" },
  { valor: "bajo", texto: "Bajo" },
  { valor: "sin", texto: "Sin stock" },
];

export default function Buscar() {
  const { colores } = useTema();
  const router = useRouter();
  const { perfil } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [total, setTotal] = useState<number | null>(null);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);
  const estado = filtro === "todos" ? undefined : filtro;

  useEffect(() => {
    const t = setTimeout(() => setTexto(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const { data, isLoading, isError, refetch } = useProductos({ texto, estado });

  // El subtitulo cuenta los productos activos: solo se actualiza sin filtros.
  const sinFiltros = texto.trim() === "" && estado === undefined;
  if (sinFiltros && data && data.length !== total) setTotal(data.length);

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

  const hayFiltros = !sinFiltros;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado
        variante="pantalla"
        titulo="Existencias"
        subtitulo={total !== null ? `${total} ${total === 1 ? "producto activo" : "productos activos"}` : undefined}
        accion={{
          icono: "escanear",
          etiqueta: "Escanear código de barras",
          onPress: () => router.push("/escaner?destino=existencias"),
        }}
      />
      <View style={{ padding: ESPACIO.l, gap: ESPACIO.m, flex: 1 }}>
        <EntradaTexto
          accessibilityLabel="Buscar producto"
          placeholder="Buscar por nombre o código"
          value={busqueda}
          onChangeText={setBusqueda}
          style={{
            borderWidth: 1.5,
            borderColor: colores.borde,
            borderRadius: RADIO.campo,
            backgroundColor: colores.superficie,
            padding: 8,
          }}
        />
        <ChipsFiltro etiqueta="Filtrar por estado" opciones={FILTROS} valor={filtro} onCambio={setFiltro} />
        {data && isError ? <AvisoRecarga onReintentar={() => void refetch()} /> : null}
        {data ? (
          <FlatList
            style={{ flex: 1 }}
            data={data}
            keyExtractor={(p) => p.id}
            ListEmptyComponent={
              <Texto tono="secundario">
                {hayFiltros ? "No hay productos que coincidan." : "Aún no hay productos registrados."}
              </Texto>
            }
            renderItem={({ item }) => (
              <FilaProducto
                nombre={item.nombre}
                detalle={detalleProducto(item.codigo, item.unidad)}
                cantidad={formatearCantidad(item.existencias, item.unidad)}
                estado={estadoInventario(item.existencias, item.punto_pedido)}
                onPress={() => router.push(`/administracion/producto/${item.id}`)}
              />
            )}
          />
        ) : isLoading ? (
          <View style={{ gap: ESPACIO.m }}>
            <Skeleton.Fila />
            <Skeleton.Fila />
            <Skeleton.Fila />
          </View>
        ) : isError ? (
          <EstadoError mensaje="No se pudieron cargar los productos." onReintentar={() => void refetch()} />
        ) : null}
        {errorExportar ? <Texto tono="peligro">{errorExportar}</Texto> : null}
        {perfil && puede(perfil.rol, "exportar_existencias") ? (
          <Boton
            titulo="Exportar a Excel"
            onPress={() => void exportar()}
            disabled={!data || data.length === 0}
            loading={exportando}
          />
        ) : null}
      </View>
    </View>
  );
}
