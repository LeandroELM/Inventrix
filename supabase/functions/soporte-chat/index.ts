import Anthropic from "npm:@anthropic-ai/sdk@0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { obtenerPerfil } from "../_shared/auth.ts";
import {
  aMensajesClaude,
  contexto,
  instrucciones,
  leerRespuesta,
  opcionesFallback,
  RESPUESTA_DERIVACION,
  respuestaSinConfigurar,
  validarEntrada,
} from "./logica.ts";

// `Supabase.ai` lo provee el Edge Runtime de Supabase.
declare const Supabase: {
  ai: { Session: new (modelo: string) => { run: (texto: string, opts: { mean_pool: boolean; normalize: boolean }) => Promise<number[]> } };
};

const ESQUEMA_RESPUESTA = {
  type: "object",
  additionalProperties: false,
  required: ["respuesta", "resuelto"],
  properties: { respuesta: { type: "string" }, resuelto: { type: "boolean" } },
} as const;

const derivacion = () => json({ respuesta: RESPUESTA_DERIVACION, resuelto: false }, 503);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METODO_NO_PERMITIDO" }, 405);

  try {
    const perfil = await obtenerPerfil(req);

    let mensajes;
    try {
      mensajes = validarEntrada(await req.json());
    } catch {
      return json({ error: "DATOS_INVALIDOS" }, 400);
    }

    if (!Deno.env.get("ANTHROPIC_API_KEY")) return json(respuestaSinConfigurar());

    const pregunta = mensajes[mensajes.length - 1].texto;
    const embedding = await new Supabase.ai.Session("gte-small").run(pregunta, {
      mean_pool: true,
      normalize: true,
    });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: fragmentos, error } = await admin.rpc("buscar_manual", {
      p_embedding: embedding,
      p_perfil: perfil.rol,
      p_cantidad: 5,
    });
    if (error) return json({ error: "ERROR_INTERNO" }, 500);

    const client = new Anthropic(); // ANTHROPIC_API_KEY desde secretos
    const modelo = (Deno.env.get("ANTHROPIC_MODEL") ?? "").trim() || "claude-opus-5-5";
    try {
      const r = await client.beta.messages.create({
        model: modelo,
        max_tokens: 2000,
        ...opcionesFallback(modelo),
        output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA_RESPUESTA } },
        system: [{ type: "text", text: instrucciones(perfil.rol), cache_control: { type: "ephemeral" } }],
        messages: aMensajesClaude(mensajes, contexto(fragmentos ?? [])),
      });
      return json(leerRespuesta(r.content, r.stop_reason));
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return derivacion();
      if (e instanceof Anthropic.APIError) return derivacion();
      if (e instanceof Error && e.message === "RESPUESTA_INVALIDA") return derivacion();
      if (e instanceof SyntaxError) return derivacion();
      throw e;
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: "ERROR_INTERNO" }, 500);
  }
});
