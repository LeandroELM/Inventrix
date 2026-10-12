import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { Boton } from "@/components/Boton";
import { Pantalla } from "@/components/Pantalla";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { BuscadorProducto } from "@/features/productos/BuscadorProducto";
import { filasDeReporte, obtenerReporte, type TipoReporte } from "@/features/reportes/api";
import { exportarExcel, nombreArchivoReporte } from "@/features/reportes/excel";
import { rangoPeriodo, type Periodo } from "@/features/reportes/rango";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

const REPORTES: { valor: TipoReporte; texto: string }[] = [
  { valor: "existencias", texto: "Existencias" },
  { valor: "a_pedir", texto: "A pedir" },
  { valor: "entradas", texto: "Entradas" },
  { valor: "salidas", texto: "Salidas" },
  { valor: "historial", texto: "Historial" },
];

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: "hoy", texto: "Hoy" },
  { valor: "7d", texto: "7 días" },
  { valor: "30d", texto: "30 días" },
  { valor: "personalizado", texto: "Personalizado" },
];

const esMovimientos = (t: TipoReporte) => t === "entradas" || t === "salidas" || t === "historial";

function Opcion({ texto, activa, onPress }: { texto: string; activa: boolean; onPress: () => void }) {
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ selected: activa }}
      onPress={onPress}
      style={{
        minHeight: 48,
        justifyContent: "center",
        padding: 8,
        borderWidth: 1,
        borderColor: activa ? colores.interactivo : colores.borde,
        backgroundColor: activa ? colores.interactivo : undefined,
      }}
    >
      <Texto tono={activa ? "sobreInteractivo" : "texto"}>{texto}</Texto>
    </Pressable>
  );
}

const fechaCorta = (f: Date) => f.toLocaleDateString("es");

function Reportes() {
  const { colores } = useTema();
  const [tipo, setTipo] = useState<TipoReporte>("existencias");
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [desde, setDesde] = useState<Date>(new Date());
  const [hasta, setHasta] = useState<Date>(new Date());
  const [selector, setSelector] = useState<"desde" | "hasta" | null>(null);
  const [producto, setProducto] = useState<{ id: string; nombre: string } | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  const movs = esMovimientos(tipo);
  const rango = movs ? rangoPeriodo(periodo, new Date(), { desde, hasta }) : {};
  const filtros = { desde: rango.desde, hasta: rango.hasta, productoId: movs ? producto?.id : undefined };
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reporte", tipo, rango.desde?.getTime(), rango.hasta?.getTime(), filtros.productoId],
    queryFn: async () => filasDeReporte(tipo, await obtenerReporte(tipo, filtros), new Date()),
  });

  async function exportar() {
    if (!data) return;
    setErrorExportar(null);
    setExportando(true);
    try {
      await exportarExcel(nombreArchivoReporte(tipo, new Date()), { Reporte: data });
    } catch (e) {
      setErrorExportar(mensajeDeError(e));
    } finally {
      setExportando(false);
    }
  }

  const columnas = data && data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {REPORTES.map((r) => (
          <Opcion key={r.valor} texto={r.texto} activa={tipo === r.valor} onPress={() => setTipo(r.valor)} />
        ))}
      </View>

      {movs ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {PERIODOS.map((p) => (
              <Opcion key={p.valor} texto={p.texto} activa={periodo === p.valor} onPress={() => setPeriodo(p.valor)} />
            ))}
          </View>
          {periodo === "personalizado" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Boton titulo={`Desde: ${fechaCorta(desde)}`} onPress={() => setSelector("desde")} />
              <Boton titulo={`Hasta: ${fechaCorta(hasta)}`} onPress={() => setSelector("hasta")} />
            </View>
          ) : null}
          {selector ? (
            <DateTimePicker
              value={selector === "desde" ? desde : hasta}
              mode="date"
              onChange={(_, f) => {
                const cual = selector;
                setSelector(null);
                if (!f) return;
                if (cual === "desde") setDesde(f);
                else setHasta(f);
              }}
            />
          ) : null}
          <Texto>Producto: {producto ? producto.nombre : "Todos"}</Texto>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Boton titulo={eligiendo ? "Cerrar búsqueda" : "Filtrar por producto"} onPress={() => setEligiendo(!eligiendo)} />
            {producto ? <Boton titulo="Quitar filtro" onPress={() => setProducto(null)} /> : null}
          </View>
          {eligiendo ? (
            <BuscadorProducto
              onElegir={(id, nombre) => {
                setProducto({ id, nombre });
                setEligiendo(false);
              }}
            />
          ) : null}
        </View>
      ) : null}

      {isLoading ? <ActivityIndicator color={colores.interactivo} /> : null}
      {error ? (
        <View>
          <Texto accessibilityRole="alert" tono="peligro">{mensajeDeError(error)}</Texto>
          <Boton titulo="Reintentar" onPress={() => refetch()} />
        </View>
      ) : null}
      {data ? (
        <>
          <Texto>Total de registros: {data.length}</Texto>
          {data.length === 0 ? <Texto>No hay registros para mostrar.</Texto> : null}
          <ScrollView horizontal>
            <View>
              {columnas.length > 0 ? (
                <View style={{ flexDirection: "row" }}>
                  {columnas.map((c) => (
                    <Texto key={c} style={{ width: 130, fontWeight: "bold", padding: 4 }}>
                      {c}
                    </Texto>
                  ))}
                </View>
              ) : null}
              {data.map((fila, i) => (
                <View key={i} style={{ flexDirection: "row", borderTopWidth: 1, borderColor: colores.linea }}>
                  {columnas.map((c) => (
                    <Texto key={c} style={{ width: 130, padding: 4 }}>
                      {String(fila[c])}
                    </Texto>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : null}
      {errorExportar ? <Texto accessibilityRole="alert" tono="peligro">{errorExportar}</Texto> : null}
      <Boton titulo="Exportar a Excel" onPress={exportar} disabled={!data || data.length === 0} loading={exportando} />
    </ScrollView>
  );
}

export default function PantallaReportes() {
  return (
    <RequiereRol rol="admin">
      <Pantalla>
        <Reportes />
      </Pantalla>
    </RequiereRol>
  );
}
