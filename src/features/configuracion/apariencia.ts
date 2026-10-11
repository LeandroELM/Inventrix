import * as SecureStore from "expo-secure-store";

export type Apariencia = "claro" | "oscuro" | "sistema";
export const CLAVE_APARIENCIA = "apariencia";
export const APARIENCIAS: readonly Apariencia[] = ["claro", "oscuro", "sistema"];

function esApariencia(v: unknown): v is Apariencia {
  return typeof v === "string" && (APARIENCIAS as readonly string[]).includes(v);
}

/** Lee la preferencia guardada; "sistema" si no existe, es inválida o falla la lectura. */
export async function leerApariencia(): Promise<Apariencia> {
  try {
    const v = await SecureStore.getItemAsync(CLAVE_APARIENCIA);
    return esApariencia(v) ? v : "sistema";
  } catch {
    return "sistema";
  }
}

export async function guardarApariencia(valor: Apariencia): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_APARIENCIA, valor);
}
