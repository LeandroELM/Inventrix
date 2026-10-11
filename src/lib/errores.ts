const MENSAJES: Record<string, string> = {
  NO_AUTORIZADO: "No tienes permiso para realizar esta acción.",
  CANTIDAD_INVALIDA: "La cantidad ingresada no es válida.",
  EXISTENCIAS_INSUFICIENTES: "La cantidad supera las existencias disponibles.",
  PRODUCTO_INACTIVO: "El producto está dado de baja.",
  PRODUCTO_NO_ENCONTRADO: "No se encontró el producto.",
  CODIGO_DUPLICADO: "Ya existe un producto con ese código.",
  TIENE_EXISTENCIAS: "No se puede dar de baja un producto que aún tiene existencias.",
  MOTIVO_REQUERIDO: "Debes indicar el motivo de la salida.",
  DATOS_INVALIDOS: "Los datos ingresados no son válidos.",
};

const GENERICO = "Ocurrió un error. Intenta de nuevo.";
const SIN_CONEXION = "Sin conexión. Revisa tu internet e intenta de nuevo.";
const LOGIN_INVALIDO = "No fue posible iniciar sesión. Verifica tus datos.";

function textoDe(e: unknown): string | null {
  if (typeof e === "string") return e;
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message: unknown }).message;
    return typeof m === "string" ? m : null;
  }
  return null;
}

export function mensajeDeError(e: unknown): string {
  const texto = textoDe(e)?.trim();
  if (!texto) return GENERICO;
  if (/network request failed|failed to fetch/i.test(texto)) return SIN_CONEXION;
  if (/invalid login credentials/i.test(texto) || texto === LOGIN_INVALIDO) return LOGIN_INVALIDO;
  if (Object.hasOwn(MENSAJES, texto)) return MENSAJES[texto];
  const codigo = Object.keys(MENSAJES).find((c) => texto.includes(c));
  return codigo ? MENSAJES[codigo] : GENERICO;
}
