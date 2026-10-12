type Rgba = { r: number; g: number; b: number; a: number };

function analizar(color: string): Rgba {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color.trim());
  if (hex) {
    return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16), a: 1 };
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(color.trim());
  if (rgba) {
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: rgba[4] === undefined ? 1 : Number(rgba[4]) };
  }
  throw new Error(`Color no soportado: ${color}`);
}

function componer(frente: Rgba, base: Rgba): Rgba {
  const mezcla = (f: number, b: number) => f * frente.a + b * (1 - frente.a);
  return { r: mezcla(frente.r, base.r), g: mezcla(frente.g, base.g), b: mezcla(frente.b, base.b), a: 1 };
}

function luminancia({ r, g, b }: Rgba): number {
  const lineal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Razón de contraste WCAG. Un color con alfa se compone sobre `base` (blanco por defecto). */
export function contraste(frente: string, fondo: string, base = "#FFFFFF"): number {
  const fondoBase = componer(analizar(base), { r: 255, g: 255, b: 255, a: 1 });
  const fondoRgb = componer(analizar(fondo), fondoBase);
  const frenteRgb = componer(analizar(frente), fondoRgb);
  const l1 = luminancia(frenteRgb);
  const l2 = luminancia(fondoRgb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
