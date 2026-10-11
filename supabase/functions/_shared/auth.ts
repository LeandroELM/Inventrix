import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "./cors.ts";

export interface PerfilAutenticado {
  id: string;
  rol: "admin" | "operativo";
  activo: boolean;
}

/** Valida el JWT del llamador y devuelve su perfil. Lanza una `Response` 401/403. */
export async function obtenerPerfil(req: Request): Promise<PerfilAutenticado> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) throw json({ error: "NO_AUTENTICADO" }, 401);

  const cliente = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
  );

  const { data: sesion, error } = await cliente.auth.getUser();
  if (error || !sesion.user) throw json({ error: "NO_AUTENTICADO" }, 401);

  const { data: perfil } = await cliente
    .from("perfiles")
    .select("id, rol, activo")
    .eq("id", sesion.user.id)
    .single();
  if (!perfil) throw json({ error: "NO_AUTENTICADO" }, 401);
  if (!perfil.activo) throw json({ error: "NO_AUTORIZADO" }, 403);

  return perfil as PerfilAutenticado;
}
