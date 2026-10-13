export type DestinoEscaner = "existencias" | "entrada" | "salida" | "baja" | "nuevo";

export function normalizarCodigo(raw: string): string {
  return raw.replace(/\s+/g, "");
}

export type FiltroLecturas = ((codigo: string, ahora: number) => boolean) & { reiniciar: () => void };

// Devuelve true si la lectura debe procesarse; ignora repeticiones del mismo código dentro de `ms`.
// `reiniciar` olvida el último código (p. ej. al volver a escanear tras cerrar la hoja).
export function crearFiltroLecturas(ms: number): FiltroLecturas {
  let ultimoCodigo: string | null = null;
  let ultimoInstante = 0;
  const filtro = (codigo: string, ahora: number) => {
    if (codigo === ultimoCodigo && ahora - ultimoInstante < ms) return false;
    ultimoCodigo = codigo;
    ultimoInstante = ahora;
    return true;
  };
  filtro.reiniciar = () => {
    ultimoCodigo = null;
    ultimoInstante = 0;
  };
  return filtro;
}
