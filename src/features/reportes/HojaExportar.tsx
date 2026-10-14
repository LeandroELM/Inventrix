import DateTimePicker from "@react-native-community/datetimepicker";
import { useRef, useState } from "react";
import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { ChipsFiltro } from "@/components/ChipsFiltro";
import { Icono } from "@/components/Icono";
import { HojaInferior } from "@/components/HojaInferior";
import { Texto } from "@/components/Texto";
import { BuscadorProducto } from "@/features/productos/BuscadorProducto";
import { filasDeReporte, obtenerReporte } from "@/features/reportes/api";
import { exportarExcel, nombreArchivoReporte } from "@/features/reportes/excel";
import { rangoPeriodo, type Periodo } from "@/features/reportes/rango";
import { mensajeDeError } from "@/lib/errores";
import { useTema } from "@/tema/TemaProvider";

type Tipo = "entradas" | "salidas" | "historial";

type Props = {
  tipo: Tipo;
  onCerrar: () => void;
};

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: "hoy", texto: "Hoy" },
  { valor: "7d", texto: "7 días" },
  { valor: "30d", texto: "30 días" },
  { valor: "personalizado", texto: "Personalizado" },
];

const fechaCorta = (f: Date) => f.toLocaleDateString("es");

type Aviso = { texto: string; tono: "advertencia" | "peligro" };

export function HojaExportar({ tipo, onCerrar }: Props) {
  const { colores } = useTema();
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [desde, setDesde] = useState<Date>(() => new Date());
  const [hasta, setHasta] = useState<Date>(() => new Date());
  const [selector, setSelector] = useState<"desde" | "hasta" | null>(null);
  const [producto, setProducto] = useState<{ id: string; nombre: string } | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const enCurso = useRef(false);

  // `hasta` del rango es exclusivo (medianoche del día siguiente): desde >= hasta
  // equivale a que el día inicial sea posterior al final.
  const rango = rangoPeriodo(periodo, new Date(), { desde, hasta });
  const rangoInvertido =
    periodo === "personalizado" && !!rango.desde && !!rango.hasta && rango.desde.getTime() >= rango.hasta.getTime();

  async function exportar() {
    if (enCurso.current || rangoInvertido) return;
    enCurso.current = true;
    setAviso(null);
    setExportando(true);
    try {
      const ahora = new Date();
      const { desde: d, hasta: h } = rangoPeriodo(periodo, ahora, { desde, hasta });
      const datos = await obtenerReporte(tipo, { desde: d, hasta: h, productoId: producto?.id });
      const filas = filasDeReporte(tipo, datos, ahora);
      if (filas.length === 0) {
        setAviso({ texto: "No hay movimientos en el periodo elegido.", tono: "advertencia" });
        return;
      }
      await exportarExcel(nombreArchivoReporte(tipo, ahora), { Reporte: filas });
      onCerrar();
    } catch (e) {
      setAviso({ texto: mensajeDeError(e), tono: "peligro" });
    } finally {
      enCurso.current = false;
      setExportando(false);
    }
  }

  function cambiarFiltro(accion: () => void) {
    setAviso(null);
    accion();
  }

  return (
    <HojaInferior
      onCerrar={onCerrar}
      encabezado={(cerrar) => (
        <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 4 }}>
          <Texto variante="titulo" style={{ flex: 1 }} numberOfLines={1}>
            {`Exportar ${tipo}`}
          </Texto>
          <Presionable
            accessibilityRole="button"
            accessibilityLabel="Cerrar exportación"
            onPress={cerrar}
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Icono nombre="cerrar" tamano={20} color={colores.textoSecundario} />
          </Presionable>
        </View>
      )}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        {eligiendo ? (
          <>
            <BuscadorProducto
              onElegir={(id, nombre) =>
                cambiarFiltro(() => {
                  setProducto({ id, nombre });
                  setEligiendo(false);
                })
              }
            />
            <Boton titulo="Cancelar" variante="secundario" onPress={() => setEligiendo(false)} />
          </>
        ) : (
          <>
            <ChipsFiltro
              etiqueta="Periodo"
              opciones={PERIODOS}
              valor={periodo}
              onCambio={(p) => cambiarFiltro(() => setPeriodo(p))}
            />
            {periodo === "personalizado" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Boton titulo={`Desde: ${fechaCorta(desde)}`} variante="secundario" onPress={() => setSelector("desde")} />
                </View>
                <View style={{ flex: 1 }}>
                  <Boton titulo={`Hasta: ${fechaCorta(hasta)}`} variante="secundario" onPress={() => setSelector("hasta")} />
                </View>
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
                  cambiarFiltro(() => (cual === "desde" ? setDesde(f) : setHasta(f)));
                }}
              />
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Texto variante="cuerpoFuerte" style={{ flex: 1 }} numberOfLines={1}>
                {`Producto: ${producto ? producto.nombre : "Todos"}`}
              </Texto>
              <Boton titulo="Cambiar" variante="fantasma" onPress={() => setEligiendo(true)} />
              {producto ? (
                <Boton titulo="Quitar" variante="fantasma" onPress={() => cambiarFiltro(() => setProducto(null))} />
              ) : null}
            </View>
            {rangoInvertido ? (
              <AvisoAdvertencia texto="La fecha inicial no puede ser posterior a la final." alerta />
            ) : null}
            {aviso ? <AvisoAdvertencia texto={aviso.texto} tono={aviso.tono} alerta /> : null}
            <Boton titulo="Exportar a Excel" onPress={exportar} loading={exportando} disabled={rangoInvertido} />
          </>
        )}
      </View>
    </HojaInferior>
  );
}
