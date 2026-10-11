import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, scanFromURLAsync, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Pantalla } from "@/components/Pantalla";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede } from "@/features/auth/permisos";
import { buscarPorCodigo } from "@/features/productos/api";
import { crearFiltroLecturas, normalizarCodigo, type DestinoEscaner } from "@/features/productos/escaner";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";

const TIPOS = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] as const;
const DESTINOS: readonly DestinoEscaner[] = ["existencias", "entrada", "salida", "baja", "nuevo"];

function destinoValido(valor: string | undefined): DestinoEscaner {
  return DESTINOS.find((d) => d === valor) ?? "existencias";
}

export default function Escaner() {
  const router = useRouter();
  const { perfil } = useAuth();
  const { destino: destinoParam } = useLocalSearchParams<{ destino?: string }>();
  const destino = destinoValido(destinoParam);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [linterna, setLinterna] = useState(false);
  const [manual, setManual] = useState(false);
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
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
      if (!producto) {
        setMensaje(
          esAdmin
            ? "Producto no encontrado."
            : "Producto no encontrado. Solo el administrador puede registrar productos nuevos.",
        );
        return;
      }
      const productoId = producto.id;
      if (destino === "existencias") {
        router.replace({ pathname: "/administracion/producto/[id]", params: { id: productoId } });
      } else if (destino === "entrada") {
        router.replace({ pathname: "/movimientos/entrada", params: { productoId } });
      } else if (destino === "salida") {
        router.replace({ pathname: "/movimientos/salida", params: { productoId } });
      } else {
        router.replace({ pathname: "/administracion/baja", params: { productoId } });
      }
    } catch (e) {
      setMensaje(mensajeDeError(e));
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

  async function leerDesdeImagen() {
    setMensaje(null);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (r.canceled || r.assets.length === 0) return;
      const lecturas = await scanFromURLAsync(r.assets[0].uri, [...TIPOS]);
      if (lecturas.length === 0) {
        setMensaje("No se encontró ningún código en la imagen.");
        return;
      }
      await procesar(lecturas[0].data);
    } catch (e) {
      setMensaje(mensajeDeError(e));
    }
  }

  if (!permiso) return <Pantalla><Texto>Cargando…</Texto></Pantalla>;

  if (!permiso.granted && !manual) {
    return (
      <Pantalla>
        <Texto>Inventrix necesita acceso a la cámara para escanear los códigos de barras y QR de tus productos.</Texto>
        <Boton titulo="Permitir cámara" onPress={() => void pedirPermiso()} />
        <Boton titulo="Escribir el código manualmente" onPress={() => setManual(true)} />
        <Boton titulo="Leer desde imagen" onPress={() => void leerDesdeImagen()} />
        {mensaje ? <Texto accessibilityRole="alert" tono="peligro">{mensaje}</Texto> : null}
        <Boton titulo="Cerrar" onPress={() => router.back()} />
      </Pantalla>
    );
  }

  if (manual) {
    return (
      <Pantalla>
        <Campo label="Código" value={texto} onChangeText={setTexto} autoCapitalize="none" autoCorrect={false} />
        <Boton titulo="Buscar" loading={buscando} disabled={!normalizarCodigo(texto)} onPress={() => void procesar(texto)} />
        {mensaje ? <Texto accessibilityRole="alert" tono="peligro">{mensaje}</Texto> : null}
        <Boton titulo="Usar la cámara" onPress={() => setManual(false)} />
      </Pantalla>
    );
  }

  return (
    <View style={styles.contenedor}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={linterna}
        barcodeScannerSettings={{ barcodeTypes: [...TIPOS] }}
        onBarcodeScanned={buscando ? undefined : alLeer}
      />
      <View style={styles.panel}>
        {mensaje ? <Texto accessibilityRole="alert" tono="peligro" style={styles.mensaje}>{mensaje}</Texto> : null}
        <Boton titulo={linterna ? "Apagar linterna" : "Encender linterna"} onPress={() => setLinterna((v) => !v)} />
        <Boton titulo="Escribir el código manualmente" onPress={() => setManual(true)} />
        <Boton titulo="Leer desde imagen" onPress={() => void leerDesdeImagen()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#000" },
  panel: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, gap: 8, backgroundColor: "#fff" },
  mensaje: { color: "#000" },
});
