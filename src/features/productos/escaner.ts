export type DestinoEscaner = "existencias" | "entrada" | "salida" | "baja" | "nuevo";

export function normalizarCodigo(raw: string): string {
  return raw.replace(/\s+/g, "");
}

// Devuelve true si la lectura debe procesarse; ignora repeticiones del mismo código dentro de `ms`.
export function crearFiltroLecturas(ms: number): (codigo: string, ahora: number) => boolean {
  let ultimoCodigo: string | null = null;
  let ultimoInstante = 0;
  return (codigo, ahora) => {
    if (codigo === ultimoCodigo && ahora - ultimoInstante < ms) return false;
    ultimoCodigo = codigo;
    ultimoInstante = ahora;
    return true;
  };
}
