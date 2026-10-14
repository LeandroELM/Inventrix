import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { dividirEnFragmentos } from "../../scripts/chunks";

const RAIZ = join(__dirname, "..", "..");
const leerManual = (nombre: string) => readFileSync(join(RAIZ, "docs", "manuales", nombre), "utf8");

const OPERATIVO = leerManual("manual-operativo.md");
const ADMINISTRADOR = leerManual("manual-administrador.md");

function archivosFuente(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosFuente(ruta);
    return /\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

function textosCitados(manual: string): string[] {
  return [...manual.matchAll(/"([^"\n]{1,60})"/g)].map((m) => m[1]);
}

describe("manuales", () => {
  it("cada fragmento tiene encabezado", () => {
    const operativo = dividirEnFragmentos(OPERATIVO);
    const administrador = dividirEnFragmentos(ADMINISTRADOR);
    expect(operativo.length).toBeGreaterThanOrEqual(15);
    expect(administrador.length).toBeGreaterThanOrEqual(21);
    for (const f of [...operativo, ...administrador]) expect(f.seccion.trim()).not.toBe("");
  });

  it("los textos citados existen en la app", () => {
    const fuente = [...archivosFuente(join(RAIZ, "app")), ...archivosFuente(join(RAIZ, "src"))]
      .map((ruta) => readFileSync(ruta, "utf8"))
      .join("\n");
    const faltantes = [...new Set([...textosCitados(OPERATIVO), ...textosCitados(ADMINISTRADOR)])].filter(
      (texto) => !fuente.includes(texto),
    );
    expect(faltantes).toEqual([]);
  });

  it("el manual operativo no describe funciones del administrador", () => {
    const secciones = dividirEnFragmentos(OPERATIVO).map((f) => f.seccion);
    for (const prohibida of ["Dar de baja un producto", "Exportar a Excel", "Editar producto"]) {
      expect(secciones).not.toContain(prohibida);
    }
  });
});
