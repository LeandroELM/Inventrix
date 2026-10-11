import { supabase } from "@/lib/supabase";
import { mensajeDeError } from "@/lib/errores";

export type MensajeChat = { rol: "usuario" | "asistente"; texto: string };
export type RespuestaSoporte = { respuesta: string; resuelto: boolean };

export const MAX_MENSAJES = 20;
export const MAX_CARACTERES = 2000;

/** Últimos MAX_MENSAJES mensajes, sin turnos iniciales del asistente: la API de Claude exige empezar con el usuario. */
export function ventana(mensajes: MensajeChat[]): MensajeChat[] {
  const recientes = mensajes.slice(-MAX_MENSAJES);
  const primero = recientes.findIndex((m) => m.rol === "usuario");
  return primero === -1 ? [] : recientes.slice(primero);
}

async function respuestaDelCuerpo(error: unknown): Promise<string | null> {
  const contexto = (error as { context?: unknown } | null)?.context;
  if (!(contexto instanceof Response)) return null;
  try {
    const cuerpo: unknown = await contexto.json();
    const texto = (cuerpo as { respuesta?: unknown } | null)?.respuesta;
    return typeof texto === "string" && texto.length > 0 ? texto : null;
  } catch {
    return null;
  }
}

/** Nunca lanza: ante cualquier fallo devuelve `resuelto: false` para ofrecer WhatsApp. */
export async function enviarPregunta(mensajes: MensajeChat[]): Promise<RespuestaSoporte> {
  try {
    const { data, error } = await supabase.functions.invoke("soporte-chat", {
      body: { mensajes: ventana(mensajes) },
    });
    if (error) {
      return { respuesta: (await respuestaDelCuerpo(error)) ?? mensajeDeError(error), resuelto: false };
    }
    const d = data as Partial<RespuestaSoporte> | null;
    if (!d || typeof d.respuesta !== "string") return { respuesta: mensajeDeError(null), resuelto: false };
    return { respuesta: d.respuesta, resuelto: d.resuelto === true };
  } catch (e) {
    return { respuesta: mensajeDeError(e), resuelto: false };
  }
}
