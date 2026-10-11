import type Anthropic from "npm:@anthropic-ai/sdk@0";

export type Rol = "admin" | "operativo";
export interface Mensaje {
  rol: "usuario" | "asistente";
  texto: string;
}
export interface Fragmento {
  seccion: string;
  contenido: string;
}
export interface RespuestaChat {
  respuesta: string;
  resuelto: boolean;
}

const MAX_MENSAJES = 20;
const MAX_CARACTERES = 2000;
const MODELO_SIN_FALLBACK = "claude-haiku-5-5";

export const RESPUESTA_REHUSO =
  "No puedo ayudarte con esa consulta. Puedes contactar a soporte por WhatsApp.";
/** Texto de derivación cuando la API falla. */
export const RESPUESTA_DERIVACION = RESPUESTA_REHUSO;

export function respuestaSinConfigurar(): RespuestaChat {
  return {
    respuesta: "El asistente virtual aún no está configurado. Puedes contactar a soporte por WhatsApp.",
    resuelto: false,
  };
}

export function instrucciones(perfil: Rol): string {
  const base = [
    "Eres el asistente virtual de soporte de Inventrix, una app de inventario.",
    "Responde solo con base en los fragmentos del manual entregados dentro de etiquetas <fragmento>. No inventes pantallas, botones ni funciones.",
    "Responde en español, con pasos numerados y breves.",
    "Nunca afirmes que un problema quedó resuelto y nunca ejecutes ni prometas cambios de inventario.",
    "Si los fragmentos no alcanzan para responder, dilo con claridad, sugiere contactar a soporte por WhatsApp y marca resuelto: false.",
    "Nunca pidas contraseñas ni otros datos de acceso.",
    "Devuelve siempre un JSON con respuesta (texto para el usuario) y resuelto (true solo si los fragmentos permiten responder la consulta por completo).",
  ];
  if (perfil === "operativo") {
    base.push(
      "El usuario tiene perfil Operativo. Si pregunta por funciones de administrador (registrar productos, dar de baja, reportes, puntos de pedido), explica que esas funciones corresponden al Administrador.",
    );
  } else {
    base.push("El usuario tiene perfil Administrador y puede usar todas las funciones de la app.");
  }
  return base.join("\n");
}

export function contexto(fragmentos: Fragmento[]): string {
  return fragmentos
    .map((f) => `<fragmento seccion="${f.seccion.replaceAll('"', "'")}">\n${f.contenido}\n</fragmento>`)
    .join("\n\n");
}

export function validarEntrada(body: unknown): Mensaje[] {
  const mensajes = (body as { mensajes?: unknown } | null)?.mensajes;
  if (!Array.isArray(mensajes) || mensajes.length < 1 || mensajes.length > MAX_MENSAJES) {
    throw new Error("DATOS_INVALIDOS");
  }
  const salida: Mensaje[] = mensajes.map((m) => {
    const rol = (m as { rol?: unknown })?.rol;
    const texto = (m as { texto?: unknown })?.texto;
    if ((rol !== "usuario" && rol !== "asistente") || typeof texto !== "string") {
      throw new Error("DATOS_INVALIDOS");
    }
    if (texto.trim().length === 0 || texto.length > MAX_CARACTERES) throw new Error("DATOS_INVALIDOS");
    return { rol, texto };
  });
  if (salida[salida.length - 1].rol !== "usuario") throw new Error("DATOS_INVALIDOS");
  return salida;
}

/** El contexto va en el último mensaje del usuario, antes de la pregunta. */
export function aMensajesClaude(mensajes: Mensaje[], ctx: string): Anthropic.MessageParam[] {
  const ultimo = mensajes.length - 1;
  return mensajes.map((m, i) => ({
    role: m.rol === "usuario" ? "user" : "assistant",
    content: i === ultimo && ctx ? `${ctx}\n\n${m.texto}` : m.texto,
  }));
}

/** Haiku no tiene fallback de servidor; los demás modelos sí. */
export function opcionesFallback(modelo: string): { betas?: string[]; fallbacks?: "default" } {
  if (modelo === MODELO_SIN_FALLBACK) return {};
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

/** Interpreta la respuesta de Claude. Lanza si no es un JSON `{respuesta, resuelto}` válido. */
export function leerRespuesta(content: ReadonlyArray<{ type: string; text?: string }>, stopReason: string | null): RespuestaChat {
  if (stopReason === "refusal") return { respuesta: RESPUESTA_REHUSO, resuelto: false };
  const bloque = content.find((b) => b.type === "text");
  if (!bloque || typeof bloque.text !== "string") throw new Error("RESPUESTA_INVALIDA");
  const datos = JSON.parse(bloque.text);
  if (typeof datos?.respuesta !== "string" || typeof datos?.resuelto !== "boolean") {
    throw new Error("RESPUESTA_INVALIDA");
  }
  return { respuesta: datos.respuesta, resuelto: datos.resuelto };
}
