import { UNIDADES } from "@/features/productos/unidades";
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

export function nombreArchivoExistencias(fecha: Date): string {
  return `inventrix-existencias-${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}.xlsx`;
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
