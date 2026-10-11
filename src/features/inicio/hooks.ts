import { useQuery } from "@tanstack/react-query";
import type { Rol } from "@/features/auth/permisos";
import { contarAlertasNoLeidas, obtenerInicio } from "@/features/inicio/api";

export function useInicio(rol: Rol) {
  return useQuery({ queryKey: ["inicio", rol], queryFn: () => obtenerInicio(rol) });
}

export function useAlertasNoLeidas(habilitado: boolean) {
  return useQuery({
    queryKey: ["inicio", "alertas", "no-leidas"],
    queryFn: contarAlertasNoLeidas,
    enabled: habilitado,
  });
}
