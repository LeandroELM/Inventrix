import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Presionable } from "@/animacion/Presionable";
import { AvatarProducto } from "@/components/AvatarProducto";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Encabezado } from "@/components/Encabezado";
import { Icono } from "@/components/Icono";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede } from "@/features/auth/permisos";
import { buscarPorCodigo } from "@/features/productos/api";
import { crearFiltroLecturas, normalizarCodigo, type DestinoEscaner } from "@/features/productos/escaner";
import type { Producto } from "@/features/productos/estado";
import { leerCodigoDeImagen, TIPOS_CODIGO } from "@/features/productos/leerImagen";
import { formatearCantidad } from "@/features/productos/unidades";
import { mensajeDeError } from "@/lib/errores";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const DESTINOS: readonly DestinoEscaner[] = ["existencias", "entrada", "salida", "baja", "nuevo"];

function destinoValido(valor: string | undefined): DestinoEscaner {
  return DESTINOS.find((d) => d === valor) ?? "existencias";
}

type Hoja =
  | null
  | { tipo: "encontrado"; producto: Producto }
  | { tipo: "no-encontrado"; codigo: string }
  | { tipo: "error"; mensaje: string };

const ESQUINA = 28;
const GROSOR = 4;

function BotonCamara({
  icono,
  etiqueta,
  onPress,
}: {
  icono: "cerrar" | "linterna";
  etiqueta: string;
  onPress: () => void;
}) {
  const { colores } = useTema();
  return (
    <Presionable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        borderRadius: RADIO.completo,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colores.velo,
      }}
    >
      <Icono nombre={icono} tamano={22} color={colores.sobrePrimario} />
    </Presionable>
  );
}

export default function Escaner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colores } = useTema();
  const { perfil } = useAuth();
  const { destino: destinoParam } = useLocalSearchParams<{ destino?: string }>();
  const destino = destinoValido(destinoParam);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [linterna, setLinterna] = useState(false);
  const [manual, setManual] = useState(false);
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [hoja, setHoja] = useState<Hoja>(null);
  const filtro = useRef(crearFiltroLecturas(1500));
  const ocupado = useRef(false);

  const esAdmin = perfil ? puede(perfil.rol, "registrar_producto") : false;

  async function procesar(bruto: string) {
    const codigo = normalizarCodigo(bruto);
    if (!codigo || ocupado.current) return;
    ocupado.current = true;
    setMensaje(null);
    try {
      if (destino === "nuevo") {
        router.dismissTo({ pathname: "/nuevo", params: { codigo } });
        return;
      }
      setBuscando(true);
      const producto = await buscarPorCodigo(codigo);
      setHoja(producto ? { tipo: "encontrado", producto } : { tipo: "no-encontrado", codigo });
    } catch (e) {
      setHoja({ tipo: "error", mensaje: mensajeDeError(e) });
    } finally {
      setBuscando(false);
      ocupado.current = false;
    }
  }

  function alLeer({ data }: BarcodeScanningResult) {
    const codigo = normalizarCodigo(data);
    if (!codigo || !filtro.current(codigo, Date.now())) return;
    void procesar(codigo);
  }

  function escanearDeNuevo() {
    setHoja(null);
    filtro.current.reiniciar();
  }

  // Con la hoja abierta, el botón atrás de Android la cierra en lugar de salir del escáner.
  const hojaAbierta = hoja !== null;
  useEffect(() => {
    if (!hojaAbierta) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setHoja(null);
      filtro.current.reiniciar();
      return true;
    });
    return () => sub.remove();
  }, [hojaAbierta]);

  function usarProducto(productoId: string) {
    if (destino === "existencias") {
      router.replace({ pathname: "/administracion/producto/[id]", params: { id: productoId } });
    } else if (destino === "entrada") {
      router.replace({ pathname: "/movimientos/entrada", params: { productoId } });
    } else if (destino === "salida") {
      router.replace({ pathname: "/movimientos/salida", params: { productoId } });
    } else {
      router.replace({ pathname: "/administracion/baja", params: { productoId } });
    }
  }

  function registrar(codigo: string) {
    router.replace({ pathname: "/nuevo", params: { codigo } });
  }

  async function leerDesdeImagen() {
    setMensaje(null);
    try {
      const r = await leerCodigoDeImagen();
      if (r.estado === "cancelado") return;
      if (r.estado === "sin-codigo") {
        setMensaje("No se encontró ningún código en la imagen.");
        return;
      }
      await procesar(r.codigo);
    } catch (e) {
      setMensaje(mensajeDeError(e));
    }
  }

  if (!permiso) {
    return (
      <Pantalla>
        <Texto>Cargando…</Texto>
      </Pantalla>
    );
  }

  const aviso = mensaje ? (
    <Texto accessibilityRole="alert" tono="peligro">
      {mensaje}
    </Texto>
  ) : null;

  // Mientras la hoja está abierta, lo que queda detrás no se lee ni se puede tocar.
  const detras = hoja
    ? ({ importantForAccessibility: "no-hide-descendants", accessibilityElementsHidden: true } as const)
    : {};
  const toqueDetras = { pointerEvents: hoja ? "none" : "auto" } as const;

  const panel = hoja ? (
    <PanelHoja hoja={hoja} esAdmin={esAdmin} onUsar={usarProducto} onRegistrar={registrar} onOtraVez={escanearDeNuevo} />
  ) : null;

  if (!permiso.granted && !manual) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <View {...detras} style={[{ flex: 1 }, toqueDetras]}>
          <Encabezado variante="pantalla" titulo="Escanear código" onAtras={() => router.back()} />
          <View style={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
            <Tarjeta>
              <View style={{ gap: ESPACIO.m }}>
                <Texto>
                  Inventrix necesita acceso a la cámara para escanear los códigos de barras y QR de tus productos.
                </Texto>
                {aviso}
                <Boton titulo="Permitir cámara" icono="camara" onPress={() => void pedirPermiso()} />
                <Boton titulo="Escribir el código manualmente" variante="secundario" onPress={() => setManual(true)} />
                <Boton titulo="Leer desde imagen" variante="secundario" onPress={() => void leerDesdeImagen()} />
              </View>
            </Tarjeta>
            <Boton titulo="Cerrar" variante="fantasma" onPress={() => router.back()} />
          </View>
        </View>
        {panel}
      </View>
    );
  }

  if (manual) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <View {...detras} style={[{ flex: 1 }, toqueDetras]}>
          <Encabezado variante="pantalla" titulo="Escanear código" onAtras={() => router.back()} />
          <View style={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
            <Tarjeta>
              <View style={{ gap: ESPACIO.m }}>
                <Campo label="Código" value={texto} onChangeText={setTexto} autoCapitalize="none" autoCorrect={false} />
                {aviso}
                <Boton
                  titulo="Buscar"
                  loading={buscando}
                  disabled={!normalizarCodigo(texto)}
                  onPress={() => void procesar(texto)}
                />
              </View>
            </Tarjeta>
            <Boton titulo="Usar la cámara" variante="secundario" onPress={() => setManual(false)} />
          </View>
        </View>
        {panel}
      </View>
    );
  }

  const esquina = { position: "absolute" as const, width: ESQUINA, height: ESQUINA, borderColor: colores.marcaAcento };

  return (
    <View style={{ flex: 1, backgroundColor: colores.primario }}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={linterna}
        barcodeScannerSettings={{ barcodeTypes: [...TIPOS_CODIGO] }}
        onBarcodeScanned={buscando || hoja ? undefined : alLeer}
      />
      <View {...detras} style={[{ flex: 1 }, toqueDetras]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: insets.top + ESPACIO.m,
            paddingHorizontal: ESPACIO.l,
          }}
        >
          <BotonCamara icono="cerrar" etiqueta="Cerrar lector" onPress={() => router.back()} />
          <Texto accessibilityRole="header" variante="subtitulo" tono="sobrePrimario">
            Escanear código
          </Texto>
          <BotonCamara
            icono="linterna"
            etiqueta={linterna ? "Apagar linterna" : "Encender linterna"}
            onPress={() => setLinterna((v) => !v)}
          />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: ESPACIO.xl }}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 240, height: 240 }}>
            <View style={[esquina, { top: 0, left: 0, borderTopWidth: GROSOR, borderLeftWidth: GROSOR, borderTopLeftRadius: RADIO.campo }]} />
            <View style={[esquina, { top: 0, right: 0, borderTopWidth: GROSOR, borderRightWidth: GROSOR, borderTopRightRadius: RADIO.campo }]} />
            <View style={[esquina, { bottom: 0, left: 0, borderBottomWidth: GROSOR, borderLeftWidth: GROSOR, borderBottomLeftRadius: RADIO.campo }]} />
            <View style={[esquina, { bottom: 0, right: 0, borderBottomWidth: GROSOR, borderRightWidth: GROSOR, borderBottomRightRadius: RADIO.campo }]} />
          </View>
          <Texto tono="sobrePrimario" style={{ textAlign: "center", paddingHorizontal: ESPACIO.xxl }}>
            Coloca el código de barras o QR dentro del marco. Se detecta automáticamente.
          </Texto>
          {buscando ? (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.s }}>
              <ActivityIndicator color={colores.sobrePrimario} />
              <Texto tono="sobrePrimario">Buscando…</Texto>
            </View>
          ) : null}
          {mensaje ? (
            <Texto
              accessibilityRole="alert"
              tono="sobrePrimario"
              style={{ textAlign: "center", paddingHorizontal: ESPACIO.xxl }}
            >
              {mensaje}
            </Texto>
          ) : null}
        </View>
        <View style={{ padding: ESPACIO.l, paddingBottom: insets.bottom + ESPACIO.l, gap: ESPACIO.s }}>
          <Boton titulo="Escribir el código manualmente" variante="secundario" onPress={() => setManual(true)} />
          <Boton titulo="Leer desde imagen" variante="secundario" onPress={() => void leerDesdeImagen()} />
        </View>
      </View>
      {panel}
    </View>
  );
}

function PanelHoja({
  hoja,
  esAdmin,
  onUsar,
  onRegistrar,
  onOtraVez,
}: {
  hoja: NonNullable<Hoja>;
  esAdmin: boolean;
  onUsar: (productoId: string) => void;
  onRegistrar: (codigo: string) => void;
  onOtraVez: () => void;
}) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityViewIsModal
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        gap: ESPACIO.m,
        padding: ESPACIO.l,
        paddingBottom: insets.bottom + ESPACIO.l,
        backgroundColor: colores.fondo,
        borderTopLeftRadius: RADIO.encabezado,
        borderTopRightRadius: RADIO.encabezado,
      }}
    >
      {hoja.tipo === "encontrado" ? (
        <>
          <Texto variante="etiqueta" tono="exito" accessibilityLiveRegion="polite">
            CÓDIGO RECONOCIDO
          </Texto>
          <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.m }}>
            <AvatarProducto nombre={hoja.producto.nombre} tamano={48} />
            <View style={{ flex: 1 }}>
              <Texto variante="subtitulo" numberOfLines={2}>
                {hoja.producto.nombre}
              </Texto>
              <Texto tono="secundario">
                {`${hoja.producto.codigo} · ${formatearCantidad(hoja.producto.existencias, hoja.producto.unidad)} disponibles`}
              </Texto>
            </View>
          </View>
          <Boton titulo="Usar este producto" onPress={() => onUsar(hoja.producto.id)} />
          <Boton titulo="Escanear de nuevo" variante="secundario" onPress={onOtraVez} />
        </>
      ) : hoja.tipo === "no-encontrado" ? (
        <>
          <Texto variante="titulo" accessibilityLiveRegion="polite">
            Producto no encontrado
          </Texto>
          <Texto variante="subtitulo">{hoja.codigo}</Texto>
          <Texto tono="secundario">El código escaneado no corresponde a ningún producto registrado.</Texto>
          {esAdmin ? (
            <Boton titulo="Registrar producto" onPress={() => onRegistrar(hoja.codigo)} />
          ) : (
            <AvisoAdvertencia texto="Solo el administrador puede registrar productos nuevos. Pídele que lo agregue al catálogo." />
          )}
          <Boton titulo="Escanear de nuevo" variante="secundario" onPress={onOtraVez} />
        </>
      ) : (
        <>
          <AvisoAdvertencia tono="peligro" alerta texto={hoja.mensaje} />
          <Boton titulo="Escanear de nuevo" variante="secundario" onPress={onOtraVez} />
        </>
      )}
    </View>
  );
}
