// Divide un manual en Markdown en fragmentos para la base vectorial.
// Función pura: un fragmento por encabezado `##`; si la sección supera
// LIMITE caracteres se parte por párrafos (líneas en blanco).
export type Fragmento = { seccion: string; contenido: string };

const LIMITE = 1500;

function partirPorParrafos(texto: string): string[] {
  if (texto.length <= LIMITE) return [texto];
  const partes: string[] = [];
  let actual = "";
  for (const parrafo of texto.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p !== "")) {
    if (actual !== "" && actual.length + 2 + parrafo.length > LIMITE) {
      partes.push(actual);
      actual = parrafo;
    } else {
      actual = actual === "" ? parrafo : `${actual}\n\n${parrafo}`;
    }
  }
  if (actual !== "") partes.push(actual);
  return partes;
}

export function dividirEnFragmentos(markdown: string): Fragmento[] {
  const secciones: { seccion: string; lineas: string[] }[] = [];
  for (const linea of markdown.split(/\r?\n/)) {
    const encabezado = /^##\s+(.+?)\s*$/.exec(linea);
    if (encabezado) secciones.push({ seccion: encabezado[1], lineas: [] });
    else secciones.at(-1)?.lineas.push(linea);
  }
  return secciones.flatMap(({ seccion, lineas }) => {
    const contenido = lineas.join("\n").trim();
    return contenido === "" ? [] : partirPorParrafos(contenido).map((c) => ({ seccion, contenido: c }));
  });
}
