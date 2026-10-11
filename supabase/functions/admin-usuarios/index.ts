import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { obtenerPerfil } from "../_shared/auth.ts";
import { emailDeUsuario, validarAltaUsuario } from "./logica.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METODO_NO_PERMITIDO" }, 405);

  try {
    const perfil = await obtenerPerfil(req);
    if (perfil.rol !== "admin") return json({ error: "NO_AUTORIZADO" }, 403);

    let alta;
    try {
      alta = validarAltaUsuario(await req.json());
    } catch {
      return json({ error: "DATOS_INVALIDOS" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await admin.auth.admin.createUser({
      email: emailDeUsuario(alta.usuario),
      password: alta.password,
      email_confirm: true,
      user_metadata: { usuario: alta.usuario, nombre: alta.nombre, rol: alta.rol },
    });
    if (error) {
      if (/already (been )?registered|already exists/i.test(error.message) || error.code === "email_exists") {
        return json({ error: "USUARIO_EXISTENTE" }, 409);
      }
      return json({ error: "ERROR_INTERNO" }, 500);
    }
    return json({ id: data.user.id }, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: "ERROR_INTERNO" }, 500);
  }
});
