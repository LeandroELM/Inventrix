/// <reference types="node" />
import fs from "fs";
import path from "path";

const RAIZ = path.resolve(__dirname, "../..");
const PANTALLAS = path.join(RAIZ, "app", "(app)");

const LISTA = [
  "app/(app)/(tabs)/index.tsx",
  "app/(app)/(tabs)/buscar.tsx",
  "app/(app)/(tabs)/nuevo.tsx",
  "app/(app)/(tabs)/configuracion.tsx",
  "app/(app)/(tabs)/administracion.tsx",
  "src/features/movimientos/PantallaHistorial.tsx",
  "app/(app)/administracion/pedir.tsx",
  "app/(app)/administracion/producto/[id].tsx",
  "app/(app)/administracion/producto/[id]/editar.tsx",
  "app/(app)/administracion/reportes.tsx",
  "app/(app)/administracion/baja.tsx",
  "app/(app)/administracion/usuarios/index.tsx",
  "app/(app)/administracion/usuarios/[id].tsx",
  "src/features/movimientos/FormularioMovimiento.tsx",
];

const leer = (relativa: string) => fs.readFileSync(path.join(RAIZ, relativa), "utf8");

function archivosTsx(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return archivosTsx(ruta);
    return e.name.endsWith(".tsx") ? [ruta] : [];
  });
}

// Usa <Pantalla> (que ya suma el espacio) o guarda useEspacioInferior() en una variable que llega
// a algún paddingBottom.
function reservaEspacio(contenido: string): boolean {
  if (contenido.includes("<Pantalla")) return true;
  const variable = /const (\w+) = useEspacioInferior\(\)/.exec(contenido)?.[1];
  if (!variable) return false;
  return new RegExp(`paddingBottom:[^,}]*\\b${variable}\\b`).test(contenido);
}

// Esta prueba solo ve que el espacio se lee y se aplica en algún paddingBottom, no dónde. Los pies
// fijos fuera del scroll (Buscar) y las hojas (HojaInferior) tienen sus propias pruebas de render.
describe("espacio final de las pantallas de la app", () => {
  it("toda pantalla de pestaña reserva el espacio final", () => {
    for (const archivo of LISTA) {
      expect({ archivo, reserva: reservaEspacio(leer(archivo)) }).toEqual({ archivo, reserva: true });
    }
  });

  it("la lista cubre todas las pantallas de pestaña", () => {
    const enLista = new Set(LISTA.map((a) => path.join(RAIZ, a)));
    const sinCubrir = archivosTsx(PANTALLAS)
      .filter((ruta) => path.basename(ruta) !== "_layout.tsx")
      .filter((ruta) => !fs.readFileSync(ruta, "utf8").includes("<Redirect"))
      .filter((ruta) => !enLista.has(ruta))
      .filter((ruta) => !fs.readFileSync(ruta, "utf8").includes("FormularioMovimiento"))
      .filter((ruta) => !fs.readFileSync(ruta, "utf8").includes("<PantallaHistorial"))
      .map((ruta) => path.relative(RAIZ, ruta));
    expect(sinCubrir).toEqual([]);
  });
});
