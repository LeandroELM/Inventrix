import { contraste } from "@/tema/contraste";
import { PALETAS, type Esquema } from "@/tema/tokens";

test("contraste conocido", () => {
  expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  expect(contraste("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
});

describe.each<Esquema>(["claro", "oscuro"])("paleta %s", (esquema) => {
  const c = PALETAS[esquema];
  test.each([
    ["texto", "fondo"], ["texto", "superficie"], ["textoSecundario", "superficie"],
    ["textoSecundario", "fondo"], ["textoExito", "superficie"], ["peligro", "superficie"],
    ["interactivo", "superficie"], ["sobrePrimario", "primario"],
  ] as const)("%s sobre %s ≥ 4.5", (a, b) => {
    expect(contraste(c[a], c[b])).toBeGreaterThanOrEqual(4.5);
  });
  test("textoPeligro sobre peligroSuave ≥ 4.5", () => {
    expect(contraste(c.textoPeligro, c.peligroSuave, c.superficie)).toBeGreaterThanOrEqual(4.5);
  });
  test.each([["borde", "superficie"], ["exito", "superficie"]] as const)("%s sobre %s ≥ 3", (a, b) => {
    expect(contraste(c[a], c[b])).toBeGreaterThanOrEqual(3);
  });
  test("hay 6 avatares y cada uno contrasta ≥ 4.5 con texto", () => {
    expect(c.avatares).toHaveLength(6);
    for (const a of c.avatares) {
      expect(contraste(c.texto, a)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
