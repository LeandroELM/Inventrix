const MS_DIA = 24 * 60 * 60 * 1000;

function inicioDelDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function diasEntre(fecha: Date, ahora: Date): number {
  return Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / MS_DIA);
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

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
