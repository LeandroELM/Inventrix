import { UNIDADES, formatearCantidad, type Unidad } from "@/features/productos/unidades";
import type { MotivoSalida, TipoMovimiento } from "@/features/movimientos/api";
import { ETIQUETAS_MOTIVO_SALIDA } from "@/features/movimientos/motivos";
import type { Producto } from "@/features/productos/estado";

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const dos = (n: number) => String(n).padStart(2, "0");

function formatearFecha(f: Date): string {
  return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

export function filasExistencias(productos: Producto[], generado: Date) {
  const fecha = formatearFecha(generado);
  return productos.map((p) => ({
    Código: p.codigo,
    Nombre: p.nombre,
    Unidad: UNIDADES[p.unidad].abreviatura,
    "Cantidad disponible": p.existencias,
    "Fecha de generación": fecha,
  }));
}

export function nombreArchivoReporte(tipo: string, fecha: Date): string {
  return `inventrix-${tipo}-${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}.xlsx`;
}

export function nombreArchivoExistencias(fecha: Date): string {
  return nombreArchivoReporte("existencias", fecha);
}

export type FilaMovimiento = {
  fecha: string;
  producto: string;
  codigo: string;
  unidad: Unidad;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: MotivoSalida | null;
  usuario: string;
  existencias_antes: number;
  existencias_despues: number;
};

const TIPOS = { inicial: "Inicial", entrada: "Entrada", salida: "Salida", baja: "Baja" } as const;

export function filasMovimientos(filas: FilaMovimiento[]) {
  return filas.map((m) => ({
    Fecha: formatearFecha(new Date(m.fecha)),
    Producto: m.producto,
    Código: m.codigo,
    Tipo: TIPOS[m.tipo],
    Cantidad: formatearCantidad(m.cantidad, m.unidad),
    Motivo: m.motivo ? ETIQUETAS_MOTIVO_SALIDA[m.motivo] : m.tipo === "baja" ? "" : "—",
    Usuario: m.usuario,
    "Existencias antes": formatearCantidad(m.existencias_antes, m.unidad),
    "Existencias después": formatearCantidad(m.existencias_despues, m.unidad),
  }));
}

export function filasAPedir(
  productos: { nombre: string; codigo: string | null; unidad: Unidad; existencias: number; punto_pedido: number }[],
) {
  return productos.map((p) => ({
    Producto: p.nombre,
    Código: p.codigo ?? "—",
    Existencias: formatearCantidad(p.existencias, p.unidad),
    "Punto de pedido": formatearCantidad(p.punto_pedido, p.unidad),
  }));
}

export async function exportarExcel(nombreArchivo: string, hojas: Record<string, object[]>): Promise<void> {
  const [XLSX, { File, Paths }, Sharing] = await Promise.all([
    import("xlsx"),
    import("expo-file-system"),
    import("expo-sharing"),
  ]);
  const libro = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas)) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), nombre);
  }
  const base64: string = XLSX.write(libro, { type: "base64", bookType: "xlsx" });
  const archivo = new File(Paths.cache, nombreArchivo);
  archivo.create({ overwrite: true });
  archivo.write(base64, { encoding: "base64" });
  await Sharing.shareAsync(archivo.uri, { mimeType: MIME_XLSX, dialogTitle: nombreArchivo });
}
