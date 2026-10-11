// Ingesta los manuales (docs/manuales/*.md) en la tabla manual_fragmentos con embeddings gte-small.
// Uso: npx tsx --env-file=.env scripts/ingestar-manuales.ts
// Requiere SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.
// La primera vez descarga el modelo Supabase/gte-small (~35 MB) a la caché local.
// Para ingestar en local: SUPABASE_URL=http://127.0.0.1:54321 y la service_role de `npx supabase status`.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "@huggingface/transformers";
import { createClient } from "@supabase/supabase-js";
import { dividirEnFragmentos } from "./chunks";

const PERFILES = ["admin", "operativo"] as const;
const MANUALES = join(__dirname, "..", "docs", "manuales");

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) {
    console.error("Faltan SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL) y/o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log("Cargando modelo Supabase/gte-small…");
  const extractor = await pipeline("feature-extraction", "Supabase/gte-small");

  for (const perfil of PERFILES) {
    const markdown = await readFile(join(MANUALES, `manual-${perfil === "admin" ? "administrador" : "operativo"}.md`), "utf8");
    const fragmentos = dividirEnFragmentos(markdown);
    if (fragmentos.length === 0) throw new Error(`El manual de ${perfil} no tiene secciones.`);

    const filas = [];
    for (const f of fragmentos) {
      const salida = await extractor(`${f.seccion}\n${f.contenido}`, { pooling: "mean", normalize: true });
      filas.push({ perfil, seccion: f.seccion, contenido: f.contenido, embedding: JSON.stringify(Array.from(salida.data)) });
    }

    const { error: errorBorrar } = await supabase.from("manual_fragmentos").delete().eq("perfil", perfil);
    if (errorBorrar) throw new Error(`No se pudo borrar (${perfil}): ${errorBorrar.message}`);
    const { error: errorInsertar } = await supabase.from("manual_fragmentos").insert(filas);
    if (errorInsertar) throw new Error(`No se pudo insertar (${perfil}): ${errorInsertar.message}`);
    console.log(`${perfil}: ${filas.length} fragmentos`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "Error desconocido");
  process.exit(1);
});
