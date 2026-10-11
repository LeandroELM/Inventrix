export type Periodo = "hoy" | "7d" | "30d" | "personalizado";

export type Rango = { desde?: Date; hasta?: Date };

function inicioDelDia(f: Date, desplazamiento = 0): Date {
  return new Date(f.getFullYear(), f.getMonth(), f.getDate() + desplazamiento);
}

// `hasta` es exclusivo en reporte_movimientos (created_at < p_hasta), por eso
// se usa la medianoche del día siguiente para incluir el día final completo.
export function rangoPeriodo(periodo: Periodo, ahora: Date, personalizado: Rango = {}): Rango {
  switch (periodo) {
    case "hoy":
      return { desde: inicioDelDia(ahora), hasta: inicioDelDia(ahora, 1) };
    case "7d":
      return { desde: inicioDelDia(ahora, -6), hasta: inicioDelDia(ahora, 1) };
    case "30d":
      return { desde: inicioDelDia(ahora, -29), hasta: inicioDelDia(ahora, 1) };
    case "personalizado": {
      const r: Rango = {};
      if (personalizado.desde) r.desde = inicioDelDia(personalizado.desde);
      if (personalizado.hasta) r.hasta = inicioDelDia(personalizado.hasta, 1);
      return r;
    }
  }
}
