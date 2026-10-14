const MS_DIA = 24 * 60 * 60 * 1000;

function inicioDelDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function diasEntre(fecha: Date, ahora: Date): number {
  return Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / MS_DIA);
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export function horaLocal(iso: string): string {
  const fecha = new Date(iso);
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

export function fechaRelativa(iso: string, ahora: Date): string {
  const fecha = new Date(iso);
  const hora = `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
  const dias = diasEntre(fecha, ahora);
  if (dias === 0) return `Hoy ${hora}`;
  if (dias === 1) return `Ayer ${hora}`;
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}`;
}

export function grupoDia(iso: string, ahora: Date): "HOY" | "AYER" | "ANTERIORES" {
  const dias = diasEntre(new Date(iso), ahora);
  if (dias === 0) return "HOY";
  if (dias === 1) return "AYER";
  return "ANTERIORES";
}

export function fechaLocal(f: Date): string {
  return `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}/${f.getFullYear()}`;
}

export function fechaHoraLocal(iso: string): string {
  const f = new Date(iso);
  return `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}/${f.getFullYear()} ${horaLocal(iso)}`;
}

export type ElementoDia<T> =
  | { tipo: "dia"; clave: string; texto: string }
  | { tipo: "fila"; fila: T };

// Intercala un encabezado de día antes de cada cambio de día local; las filas deben venir ordenadas.
export function conEncabezadosDia<T extends { created_at: string }>(
  filas: T[],
  ahora: Date,
): ElementoDia<T>[] {
  const resultado: ElementoDia<T>[] = [];
  let claveActual = "";
  for (const fila of filas) {
    const f = new Date(fila.created_at);
    const clave = `${f.getFullYear()}-${dosDigitos(f.getMonth() + 1)}-${dosDigitos(f.getDate())}`;
    if (clave !== claveActual) {
      claveActual = clave;
      const grupo = grupoDia(fila.created_at, ahora);
      const texto =
        grupo === "ANTERIORES" ? `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}` : grupo;
      resultado.push({ tipo: "dia", clave, texto });
    }
    resultado.push({ tipo: "fila", fila });
  }
  return resultado;
}
