/** Ruta interna del payload de una notificación push, o null si no es segura. */
export function rutaDeNotificacion(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("ruta" in data)) return null;
  const ruta = (data as { ruta: unknown }).ruta;
  if (typeof ruta !== "string" || !ruta.startsWith("/") || ruta.startsWith("//")) return null;
  return ruta;
}
