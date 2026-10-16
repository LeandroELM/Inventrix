import { supabase } from "@/lib/supabase";
import type { Rol } from "@/features/auth/permisos";

export type Usuario = { id: string; usuario: string; nombre: string; rol: Rol; activo: boolean };

const COLUMNAS = "id,usuario,nombre,rol,activo";

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase.from("perfiles").select(COLUMNAS).order("nombre");
  if (error) throw error;
  return data;
}

export async function obtenerUsuario(id: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("perfiles")
    .select(COLUMNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// La Edge Function responde { error: CODIGO } con un estado no 2xx; supabase-js deja la respuesta
// en error.context.
async function codigoDelCuerpo(error: unknown): Promise<string | null> {
  const contexto = (error as { context?: unknown } | null)?.context;
  if (!(contexto instanceof Response)) return null;
  try {
    const cuerpo: unknown = await contexto.json();
    const codigo = (cuerpo as { error?: unknown } | null)?.error;
    return typeof codigo === "string" && codigo.length > 0 ? codigo : null;
  } catch {
    return null;
  }
}

async function invocar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("admin-usuarios", { body });
  if (error) {
    // Sin red supabase-js no devuelve el error de fetch sino uno propio con otro texto.
    if ((error as { name?: unknown }).name === "FunctionsFetchError")
      throw new Error("Network request failed");
    const codigo = await codigoDelCuerpo(error);
    throw codigo ? new Error(codigo) : error;
  }
  return data as T;
}

export function crearUsuario(d: {
  usuario: string;
  nombre: string;
  rol: Rol;
}): Promise<{ id: string; password: string }> {
  return invocar({ accion: "crear", ...d });
}

export function restablecerContrasena(id: string): Promise<{ password: string }> {
  return invocar({ accion: "restablecer", id });
}

export async function cambiarRol(id: string, rol: Rol): Promise<void> {
  const { error } = await supabase.rpc("cambiar_rol_usuario", { p_id: id, p_rol: rol });
  if (error) throw new Error(error.message);
}

export async function cambiarEstado(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.rpc("cambiar_estado_usuario", { p_id: id, p_activo: activo });
  if (error) throw new Error(error.message);
}
