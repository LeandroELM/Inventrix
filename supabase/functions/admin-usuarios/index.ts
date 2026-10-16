import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { obtenerPerfil } from "../_shared/auth.ts";
import { emailDeUsuario, generarContrasena, type Solicitud, validarSolicitud } from "./logica.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METODO_NO_PERMITIDO" }, 405);

  try {
    const perfil = await obtenerPerfil(req);
    if (perfil.rol !== "admin") return json({ error: "NO_AUTORIZADO" }, 403);

    let solicitud: Solicitud;
    try {
      solicitud = validarSolicitud(await req.json());
    } catch {
      return json({ error: "DATOS_INVALIDOS" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const password = generarContrasena();

    if (solicitud.accion === "crear") {
      const { data, error } = await admin.auth.admin.createUser({
        email: emailDeUsuario(solicitud.usuario),
        password,
        email_confirm: true,
        user_metadata: { usuario: solicitud.usuario, nombre: solicitud.nombre, rol: solicitud.rol },
      });
      if (error) {
        if (/already (been )?registered|already exists/i.test(error.message) || error.code === "email_exists") {
          return json({ error: "USUARIO_EXISTENTE" }, 409);
        }
        return json({ error: "ERROR_INTERNO" }, 500);
      }
      return json({ id: data.user.id, password }, 201);
    }

    // Restablecer: la contraseña propia se cambia en Configuración.
    if (solicitud.id === perfil.id) return json({ error: "ACCION_SOBRE_SI_MISMO" }, 409);
    const { data: destino, error: errorPerfil } = await admin
      .from("perfiles")
      .select("id")
      .eq("id", solicitud.id)
      .maybeSingle();
    if (errorPerfil) return json({ error: "ERROR_INTERNO" }, 500);
    if (!destino) return json({ error: "USUARIO_NO_ENCONTRADO" }, 404);
    const { error } = await admin.auth.admin.updateUserById(solicitud.id, { password });
    if (error) return json({ error: "ERROR_INTERNO" }, 500);
    return json({ password }, 200);
  } catch (e) {
    if (e instanceof Response) return e;
    return json({ error: "ERROR_INTERNO" }, 500);
  }
});
