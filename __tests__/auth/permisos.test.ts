import { puede, type Accion } from "@/features/auth/permisos";

const todas: Accion[] = [
  "registrar_producto", "editar_producto", "dar_baja", "ver_a_pedir", "ver_reportes",
  "ver_alertas", "registrar_movimiento", "ver_existencias", "exportar_existencias", "ver_historial",
];
const operativas: Accion[] = ["registrar_movimiento", "ver_existencias", "exportar_existencias", "ver_historial"];

describe("puede", () => {
  it("admin puede todo", () => {
    for (const a of todas) expect(puede("admin", a)).toBe(true);
  });
  it("operativo solo las acciones operativas", () => {
    for (const a of todas) expect(puede("operativo", a)).toBe(operativas.includes(a));
  });
});
