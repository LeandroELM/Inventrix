import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { configurarCierrePorNoAutorizado, queryClient } from "@/lib/queryClient";
import { emailDeUsuario } from "@/features/auth/usuario";
import type { Rol } from "@/features/auth/permisos";

export type Perfil = { id: string; usuario: string; nombre: string; rol: Rol };
type Estado = "cargando" | "anonimo" | "autenticado";

type AuthContexto = {
  estado: Estado;
  perfil: Perfil | null;
  iniciarSesion(usuario: string, password: string): Promise<void>;
  cerrarSesion(): Promise<void>;
};

const LOGIN_INVALIDO = "No fue posible iniciar sesión. Verifica tus datos.";
const Contexto = createContext<AuthContexto | null>(null);

async function cargarPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id,usuario,nombre,rol,activo")
    .eq("id", userId)
    .single();
  if (error || !data || !data.activo) return null;
  return { id: data.id, usuario: data.usuario, nombre: data.nombre, rol: data.rol };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setPerfil(null);
    setEstado("anonimo");
  }, []);

  // Sesión existente (arranque) y cambios posteriores (signOut remoto, etc.).
  useEffect(() => {
    let activo = true;
    const aplicar = async (userId: string | null) => {
      if (!userId) {
        if (activo) {
          setPerfil(null);
          setEstado("anonimo");
        }
        return;
      }
      const p = await cargarPerfil(userId).catch(() => null);
      if (!activo) return;
      if (!p) {
        await supabase.auth.signOut();
        setPerfil(null);
        setEstado("anonimo");
        return;
      }
      setPerfil(p);
      setEstado("autenticado");
    };

    void supabase.auth.getSession().then(({ data }) => aplicar(data.session?.user.id ?? null));
    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento, sesion) => {
      // No llamar a supabase de forma síncrona dentro del callback (riesgo de deadlock).
      if (evento === "SIGNED_OUT") setTimeout(() => void aplicar(null), 0);
      else if (evento === "SIGNED_IN") setTimeout(() => void aplicar(sesion?.user.id ?? null), 0);
    });
    return () => {
      activo = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    configurarCierrePorNoAutorizado(() => void cerrarSesion());
    return () => configurarCierrePorNoAutorizado(null);
  }, [cerrarSesion]);

  const iniciarSesion = useCallback(async (usuario: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailDeUsuario(usuario),
      password,
    });
    if (error) throw error;
    const p = await cargarPerfil(data.user.id).catch(() => null);
    if (!p) {
      await supabase.auth.signOut();
      throw new Error(LOGIN_INVALIDO);
    }
    setPerfil(p);
    setEstado("autenticado");
  }, []);

  const valor = useMemo(
    () => ({ estado, perfil, iniciarSesion, cerrarSesion }),
    [estado, perfil, iniciarSesion, cerrarSesion],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
