import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Skeleton } from "@/animacion/Skeleton";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { ChipsFiltro } from "@/components/ChipsFiltro";
import { Encabezado } from "@/components/Encabezado";
import { FilaLista } from "@/components/FilaLista";
import { GraficoBarras } from "@/components/GraficoBarras";
import { Icono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { TarjetaIndicador } from "@/components/TarjetaIndicador";
import { Texto } from "@/components/Texto";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { filasResumen } from "@/features/inicio/api";
import { useInicio } from "@/features/inicio/hooks";
import { formatearCantidad } from "@/features/productos/unidades";
import { filasDeReporte, obtenerReporte, type TipoReporte } from "@/features/reportes/api";
import type { PeriodoDashboard, ProductoVendido } from "@/features/reportes/dashboard";
import { exportarExcel, nombreArchivoReporte } from "@/features/reportes/excel";
import { HojaExportar } from "@/features/reportes/HojaExportar";
import { useDashboard } from "@/features/reportes/hooks";
import { mensajeDeError } from "@/lib/errores";
import { useEspacioInferior } from "@/components/BarraInferior";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const PERIODOS: { valor: PeriodoDashboard; texto: string }[] = [
  { valor: "7d", texto: "7 días" },
  { valor: "30d", texto: "30 días" },
  { valor: "mes", texto: "Este mes" },
];

type TipoDirecto = "existencias" | "a_pedir";
type TipoHoja = "entradas" | "salidas" | "historial";

const EXPORTACIONES: { tipo: TipoReporte; titulo: string; detalle: string }[] = [
  { tipo: "existencias", titulo: "Existencias", detalle: "Productos activos con su estado" },
  { tipo: "a_pedir", titulo: "A pedir", detalle: "Productos en su punto de pedido" },
  { tipo: "entradas", titulo: "Entradas", detalle: "Por periodo y producto" },
  { tipo: "salidas", titulo: "Salidas", detalle: "Por periodo y producto" },
  { tipo: "historial", titulo: "Historial", detalle: "Todos los movimientos por periodo y producto" },
];

const esDirecto = (t: TipoReporte): t is TipoDirecto => t === "existencias" || t === "a_pedir";

function datoVendido(titulo: string, v: ProductoVendido | null) {
  return {
    variante: "dato" as const,
    titulo,
    valor: v ? v.nombre : "—",
    detalle: v ? formatearCantidad(v.cantidad, v.unidad) : "Sin ventas en el periodo",
    style: { flex: 1 },
  };
}

type Aviso = { texto: string; tono: "advertencia" | "peligro" };

function Reportes() {
  const { colores } = useTema();
  const espacio = useEspacioInferior();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("7d");
  const [hoja, setHoja] = useState<TipoHoja | null>(null);
  const [exportando, setExportando] = useState<TipoReporte | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const enCurso = useRef(false);

  const dashboard = useDashboard(periodo);
  const inicio = useInicio("admin");
  // El indicador solo refleja el tirón manual, no los refrescos en segundo plano.
  const [refrescandoManual, setRefrescandoManual] = useState(false);
  const refrescar = () => {
    setRefrescandoManual(true);
    void Promise.allSettled([
      queryClient.refetchQueries({ queryKey: ["dashboard"], type: "active" }),
      queryClient.refetchQueries({ queryKey: ["inicio"], type: "active" }),
    ]).then(() => setRefrescandoManual(false));
  };

  async function exportarDirecto(tipo: TipoDirecto) {
    if (enCurso.current) return;
    enCurso.current = true;
    setAviso(null);
    setExportando(tipo);
    try {
      const ahora = new Date();
      const filas = filasDeReporte(tipo, await obtenerReporte(tipo), ahora);
      if (filas.length === 0) {
        setAviso({ texto: "No hay registros para exportar.", tono: "advertencia" });
        return;
      }
      await exportarExcel(nombreArchivoReporte(tipo, ahora), { Reporte: filas });
    } catch (e) {
      setAviso({ texto: mensajeDeError(e), tono: "peligro" });
    } finally {
      enCurso.current = false;
      setExportando(null);
    }
  }

  const datos = dashboard.data;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado
        variante="pantalla"
        titulo="Reportes"
        onAtras={() => (router.canGoBack() ? router.back() : router.replace("/administracion"))}
      />
      <ScrollView
        contentContainerStyle={{ padding: ESPACIO.l, paddingBottom: ESPACIO.l + espacio, gap: ESPACIO.l }}
        refreshControl={<RefreshControl refreshing={refrescandoManual} onRefresh={refrescar} />}
      >
        <ChipsFiltro etiqueta="Periodo" opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} />

        {datos ? (
          <>
            <View style={{ gap: ESPACIO.m }}>
              <View style={{ flexDirection: "row", gap: ESPACIO.m }}>
                <TarjetaIndicador {...datoVendido("Más vendido", datos.masVendido)} />
                <TarjetaIndicador {...datoVendido("Menos vendido", datos.menosVendido)} />
              </View>
              <View style={{ flexDirection: "row", gap: ESPACIO.m }}>
                <TarjetaIndicador
                  variante="dato"
                  titulo="En punto de pedido"
                  valor={String(datos.enPuntoPedido)}
                  detalle="productos"
                  onPress={() => router.push("/administracion/pedir")}
                  style={{ flex: 1 }}
                />
                <TarjetaIndicador
                  variante="dato"
                  titulo="Movimientos"
                  valor={String(datos.totalMovimientos)}
                  detalle="en el periodo"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
            <Tarjeta>
              <View style={{ gap: ESPACIO.m }}>
                <Texto variante="subtitulo">Entradas y salidas</Texto>
                <GraficoBarras serie={datos.serie} periodo={periodo} />
              </View>
            </Tarjeta>
          </>
        ) : dashboard.isError ? (
          <View style={{ gap: ESPACIO.m }}>
            <AvisoAdvertencia tono="peligro" texto={mensajeDeError(dashboard.error)} alerta />
            <Boton titulo="Reintentar" onPress={() => void dashboard.refetch()} />
          </View>
        ) : (
          <View style={{ gap: ESPACIO.m }}>
            <Skeleton.Tarjeta />
            <Skeleton.Tarjeta />
          </View>
        )}

        {inicio.data ? (
          <TarjetaIndicador
            variante="lista"
            titulo="Inventario actual"
            filas={[
              { valor: String(inicio.data.productosActivos), etiqueta: "productos registrados" },
              ...filasResumen(inicio.data.resumen),
            ]}
          />
        ) : null}

        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="subtitulo">Exportar a Excel</Texto>
          <Tarjeta>
            {EXPORTACIONES.map((e) => (
              <FilaLista
                key={e.tipo}
                titulo={e.titulo}
                detalle={e.detalle}
                valor={exportando === e.tipo ? "Exportando…" : undefined}
                izquierda={<Icono nombre="subida" tamano={24} color={colores.primario} />}
                onPress={() => (esDirecto(e.tipo) ? void exportarDirecto(e.tipo) : setHoja(e.tipo as TipoHoja))}
              />
            ))}
          </Tarjeta>
          {aviso ? <AvisoAdvertencia texto={aviso.texto} tono={aviso.tono} alerta /> : null}
        </View>
      </ScrollView>
      {hoja ? <HojaExportar tipo={hoja} onCerrar={() => setHoja(null)} /> : null}
    </View>
  );
}

export default function PantallaReportes() {
  return (
    <RequiereRol rol="admin">
      <Reportes />
    </RequiereRol>
  );
}
