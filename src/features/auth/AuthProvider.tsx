import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { configurarCierrePorNoAutorizado, queryClient } from "@/lib/queryClient";
import { emailDeUsuario } from "@/features/auth/usuario";
import type { Rol } from "@/features/auth/permisos";

export type Perfil = { id: string; usuario: string; nombre: string; rol: Rol };
type Estado = "cargando" | "anonimo" | "autenticado" | "error";

type AuthContexto = {
  estado: Estado;
  perfil: Perfil | null;
  iniciarSesion(usuario: string, password: string): Promise<void>;
  cerrarSesion(): Promise<void>;
  reintentar(): Promise<void>;
};

type ResultadoPerfil =
  | { tipo: "ok"; perfil: Perfil }
  | { tipo: "sin_perfil" }
  | { tipo: "error"; error: unknown };

const LOGIN_INVALIDO = "No fue posible iniciar sesión. Verifica tus datos.";
const Contexto = createContext<AuthContexto | null>(null);

async function cargarPerfil(userId: string): Promise<ResultadoPerfil> {
  try {
    const { data, error } = await supabase
      .from("perfiles")
      .select("id,usuario,nombre,rol,activo")
      .eq("id", userId)
      .single();
    if (error) return error.code === "PGRST116" ? { tipo: "sin_perfil" } : { tipo: "error", error };
    if (!data || !data.activo) return { tipo: "sin_perfil" };
    return { tipo: "ok", perfil: { id: data.id, usuario: data.usuario, nombre: data.nombre, rol: data.rol } };
  } catch (error) {
    return { tipo: "error", error };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const perfilRef = useRef<Perfil | null>(null);
  const iniciandoRef = useRef(false);

  const fijarPerfil = useCallback((p: Perfil | null) => {
    perfilRef.current = p;
    setPerfil(p);
  }, []);

  const volverAnonimo = useCallback(() => {
    fijarPerfil(null);
    setEstado("anonimo");
  }, [fijarPerfil]);

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    volverAnonimo();
  }, [volverAnonimo]);

  // Carga el perfil de una sesión existente (arranque, listener, reintento).
  // Solo "sin_perfil" cierra sesión; un error de transporte conserva la sesión.
  const resolverSesion = useCallback(
    async (userId: string | null) => {
      if (!userId) return volverAnonimo();
      if (perfilRef.current?.id === userId) return;
      const r = await cargarPerfil(userId);
      if (r.tipo === "ok") {
        fijarPerfil(r.perfil);
        setEstado("autenticado");
      } else if (r.tipo === "sin_perfil") {
        await supabase.auth.signOut();
        volverAnonimo();
      } else {
        setEstado("error");
      }
    },
    [fijarPerfil, volverAnonimo],
  );

  const arrancar = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      await resolverSesion(data.session?.user.id ?? null);
    } catch {
      setEstado("error");
    }
  }, [resolverSesion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial asíncrona de la sesión
    void arrancar();
    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento, sesion) => {
      // No llamar a supabase de forma síncrona dentro del callback (riesgo de deadlock).
      if (evento === "SIGNED_OUT") setTimeout(() => void resolverSesion(null), 0);
      else if (evento === "SIGNED_IN" && !iniciandoRef.current) {
        setTimeout(() => void resolverSesion(sesion?.user.id ?? null), 0);
      }
    });
    return () => suscripcion.subscription.unsubscribe();
  }, [arrancar, resolverSesion]);

  useEffect(() => {
    configurarCierrePorNoAutorizado(() => void cerrarSesion());
    return () => configurarCierrePorNoAutorizado(null);
  }, [cerrarSesion]);

  // iniciarSesion es el único dueño de la carga durante el login: el listener ignora SIGNED_IN mientras tanto.
  const iniciarSesion = useCallback(
    async (usuario: string, password: string) => {
      iniciandoRef.current = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailDeUsuario(usuario),
          password,
        });
        if (error) throw error;
        const r = await cargarPerfil(data.user.id);
        if (r.tipo === "error") throw r.error;
        if (r.tipo === "sin_perfil") {
          await supabase.auth.signOut();
          throw new Error(LOGIN_INVALIDO);
        }
        fijarPerfil(r.perfil);
        setEstado("autenticado");
      } finally {
        iniciandoRef.current = false;
      }
    },
    [fijarPerfil],
  );

  const reintentar = useCallback(async () => {
    setEstado("cargando");
    await arrancar();
  }, [arrancar]);

  const valor = useMemo(
    () => ({ estado, perfil, iniciarSesion, cerrarSesion, reintentar }),
    [estado, perfil, iniciarSesion, cerrarSesion, reintentar],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): AuthContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
