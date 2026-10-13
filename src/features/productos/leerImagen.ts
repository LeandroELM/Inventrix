import { scanFromURLAsync } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { normalizarCodigo } from "@/features/productos/escaner";

export const TIPOS_CODIGO = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] as const;

export type ResultadoLecturaImagen =
  | { estado: "cancelado" }
  | { estado: "sin-codigo" }
  | { estado: "ok"; codigo: string };

export async function leerCodigoDeImagen(): Promise<ResultadoLecturaImagen> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (r.canceled || r.assets.length === 0) return { estado: "cancelado" };
  const lecturas = await scanFromURLAsync(r.assets[0].uri, [...TIPOS_CODIGO]);
  if (lecturas.length === 0) return { estado: "sin-codigo" };
  const codigo = normalizarCodigo(lecturas[0].data);
  // Una lectura que queda vacía al normalizar no sirve como código.
  if (!codigo) return { estado: "sin-codigo" };
  return { estado: "ok", codigo };
}
