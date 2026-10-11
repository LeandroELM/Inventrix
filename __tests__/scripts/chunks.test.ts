import { dividirEnFragmentos } from "../../scripts/chunks";

describe("dividirEnFragmentos", () => {
  it("genera un fragmento por encabezado ## e ignora el título #", () => {
    expect(dividirEnFragmentos("# M\n## Registrar entrada\nPaso 1\n## Salida\nPaso 2")).toEqual([
      { seccion: "Registrar entrada", contenido: "Paso 1" },
      { seccion: "Salida", contenido: "Paso 2" },
    ]);
  });

  it("parte por párrafos las secciones de más de 1500 caracteres", () => {
    const p1 = "a".repeat(900);
    const p2 = "b".repeat(900);
    const r = dividirEnFragmentos(`## Larga\n${p1}\n\n${p2}`);
    expect(r).toEqual([
      { seccion: "Larga", contenido: p1 },
      { seccion: "Larga", contenido: p2 },
    ]);
  });

  it("agrupa párrafos mientras no se supere el límite", () => {
    const parrafos = Array.from({ length: 10 }, (_, i) => String(i).repeat(400));
    const r = dividirEnFragmentos(`## S\n${parrafos.join("\n\n")}`);
    expect(r.length).toBeGreaterThan(1);
    for (const f of r) expect(f.contenido.length).toBeLessThanOrEqual(1500);
    expect(r.map((f) => f.contenido).join("\n\n")).toBe(parrafos.join("\n\n"));
  });

  it("omite secciones vacías y texto previo al primer ##", () => {
    expect(dividirEnFragmentos("Intro\n## Vacía\n\n## Con texto\nHola")).toEqual([
      { seccion: "Con texto", contenido: "Hola" },
    ]);
  });
});
