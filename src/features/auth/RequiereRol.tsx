import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Rol } from "@/features/auth/permisos";

export function RequiereRol({ rol, children }: { rol: Rol; children: ReactNode }) {
  const { perfil } = useAuth();
  if (perfil?.rol !== rol) return <Redirect href="/" />;
  return <>{children}</>;
}
