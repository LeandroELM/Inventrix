import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Skeleton } from "@/animacion/Skeleton";
import { AvatarProducto } from "@/components/AvatarProducto";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { ChipsFiltro } from "@/components/ChipsFiltro";
import { Encabezado } from "@/components/Encabezado";
import { EstadoError } from "@/components/EstadoError";
import { HojaInferior } from "@/components/HojaInferior";
import { PantallaResultado } from "@/components/PantallaResultado";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { BuscadorProducto } from "@/features/productos/BuscadorProducto";
import { useDarBajaProducto, useProducto } from "@/features/productos/hooks";
import { ETIQUETAS_MOTIVO_BAJA, MOTIVOS_BAJA, type MotivoBaja } from "@/features/productos/motivosBaja";
import { detalleProducto, formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";
import { fechaLocal } from "@/lib/fechaRelativa";
import { useEspacioInferior } from "@/components/BarraInferior";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const MOTIVOS = MOTIVOS_BAJA.map((valor) => ({ valor, texto: ETIQUETAS_MOTIVO_BAJA[valor] }));

type Resultado = { nombre: string; detalle: string; retiradas: string; fecha: string };

function Baja() {
  const { colores } = useTema();
  const espacio = useEspacioInferior();
  const router = useRouter();
  const { productoId } = useLocalSearchParams<{ productoId?: string }>();
  // undefined: usa el producto recibido por parámetro; null: el usuario pidió elegir otro.
  const [elegido, setId] = useState<string | null | undefined>(undefined);
  const id = elegido === undefined ? (productoId ?? null) : elegido;
  const [motivo, setMotivo] = useState<MotivoBaja | null>(null);
  const [detalle, setDetalle] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const enCurso = useRef(false);
  const baja = useDarBajaProducto();
  const { data: p, isLoading, error: errorCarga, refetch } = useProducto(id ?? "");

  function volver() {
    if (router.canGoBack()) router.back();
    else router.replace("/administracion");
  }

  function reiniciar() {
    setId(null);
    setMotivo(null);
    setDetalle("");
    setError(null);
  }

  if (resultado) {
    return (
      <PantallaResultado
        titulo="Producto dado de baja"
        frase={`${resultado.nombre} ya no aparecerá en Existencias. Su historial se conserva.`}
        producto={{ nombre: resultado.nombre, detalle: resultado.detalle }}
        datos={[
          { etiqueta: "Existencias retiradas", valor: resultado.retiradas },
          { etiqueta: "Fecha", valor: resultado.fecha },
        ]}
        principal={{ titulo: "Ver en Existencias", onPress: () => router.dismissTo("/buscar") }}
        secundario={{ titulo: "Volver a Administración", onPress: () => router.dismissTo("/administracion") }}
      />
    );
  }

  const encabezado = <Encabezado variante="pantalla" titulo="Dar de baja producto" onAtras={volver} />;

  if (!id) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        {encabezado}
        <ScrollView contentContainerStyle={{ padding: ESPACIO.l, paddingBottom: ESPACIO.l + espacio, gap: ESPACIO.m }} keyboardShouldPersistTaps="handled">
          <BuscadorProducto escanearDestino="baja" onElegir={setId} />
        </ScrollView>
      </View>
    );
  }

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        {encabezado}
        <View style={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
          {isLoading ? (
            <>
              <Skeleton.Fila />
              <Skeleton.Fila />
              <Skeleton.Fila />
            </>
          ) : (
            <EstadoError
              mensaje={errorCarga ? mensajeDeError(errorCarga) : "No se pudo cargar el producto."}
              onReintentar={() => void refetch()}
            />
          )}
        </View>
      </View>
    );
  }

  const motivoValido = motivo !== null && (motivo !== "otro" || detalle.trim() !== "");

  async function confirmar() {
    if (!p || !motivo || enCurso.current) return;
    enCurso.current = true;
    setError(null);
    // El producto se invalida al terminar la mutación: se guardan ya los datos del resultado.
    const previo: Resultado = {
      nombre: p.nombre,
      detalle: `Motivo: ${ETIQUETAS_MOTIVO_BAJA[motivo]}${motivo === "otro" ? ` · ${detalle.trim()}` : ""}`,
      retiradas: p.existencias > 0 ? formatearCantidad(p.existencias, p.unidad) : "0",
      fecha: fechaLocal(new Date()),
    };
    try {
      await baja.mutateAsync({ id: p.id, motivo, ...(motivo === "otro" ? { detalle: detalle.trim() } : {}) });
      setConfirmando(false);
      setResultado(previo);
    } catch (e) {
      setConfirmando(false);
      setError(mensajeDeError(e));
    } finally {
      enCurso.current = false;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      {encabezado}
      <ScrollView contentContainerStyle={{ padding: ESPACIO.l, paddingBottom: ESPACIO.l + espacio, gap: ESPACIO.m }} keyboardShouldPersistTaps="handled">
        <Tarjeta>
          <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.m }}>
            <AvatarProducto nombre={p.nombre} tamano={48} />
            <View style={{ flex: 1, gap: ESPACIO.xs }}>
              <Texto variante="subtitulo" numberOfLines={2}>
                {p.nombre}
              </Texto>
              <Texto tono="secundario">{detalleProducto(p.codigo, p.unidad)}</Texto>
              <Texto tono="secundario">{`Existencias: ${formatearCantidad(p.existencias, p.unidad)}`}</Texto>
            </View>
          </View>
        </Tarjeta>
        <Boton titulo="Elegir otro producto" variante="fantasma" onPress={reiniciar} />
        {!p.activo ? (
          <AvisoAdvertencia tono="peligro" alerta texto="El producto ya está dado de baja." />
        ) : (
          <>
            {p.existencias > 0 ? (
              <AvisoAdvertencia
                texto={`Este producto aún tiene ${formatearCantidad(p.existencias, p.unidad)} en existencia; al darlo de baja quedarán en cero y el historial lo registrará.`}
              />
            ) : null}
            <Tarjeta style={{ gap: ESPACIO.m }}>
              <Texto variante="etiqueta" tono="secundario">
                Motivo de la baja
              </Texto>
              <ChipsFiltro
                opciones={MOTIVOS}
                valor={motivo}
                onCambio={(m) => {
                  setMotivo(m);
                  setError(null);
                }}
                etiqueta="Motivo de la baja"
              />
              {motivo === "otro" ? (
                <Campo
                  label="Detalle"
                  value={detalle}
                  onChangeText={(t) => {
                    setDetalle(t);
                    setError(null);
                  }}
                  maxLength={200}
                />
              ) : null}
            </Tarjeta>
            {error ? <AvisoAdvertencia tono="peligro" alerta texto={error} /> : null}
            <Boton titulo="Dar de baja" variante="peligro" disabled={!motivoValido} onPress={() => setConfirmando(true)} />
          </>
        )}
      </ScrollView>
      {confirmando ? (
        // La hoja no se puede cerrar mientras la baja está en curso.
        <HojaInferior bloqueado={baja.isPending} onCerrar={() => setConfirmando(false)}>
          <View style={{ padding: ESPACIO.xl, gap: ESPACIO.l }}>
            <Texto variante="subtitulo">
              {`¿Dar de baja "${p.nombre}"? Dejará de aparecer en Existencias y no podrá usarse en movimientos nuevos.`}
            </Texto>
            <View style={{ gap: ESPACIO.s }}>
              <Boton titulo="Confirmar baja" variante="peligro" loading={baja.isPending} onPress={() => void confirmar()} />
              <Boton
                titulo="Cancelar"
                variante="secundario"
                disabled={baja.isPending}
                onPress={() => setConfirmando(false)}
              />
            </View>
          </View>
        </HojaInferior>
      ) : null}
    </View>
  );
}

export default function BajaProducto() {
  return (
    <RequiereRol rol="admin">
      <Baja />
    </RequiereRol>
  );
}
