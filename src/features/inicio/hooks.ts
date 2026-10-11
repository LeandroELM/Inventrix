import { useQuery } from "@tanstack/react-query";
import type { Rol } from "@/features/auth/permisos";
import { obtenerInicio } from "@/features/inicio/api";

export function useInicio(rol: Rol) {
  return useQuery({ queryKey: ["inicio", rol], queryFn: () => obtenerInicio(rol) });
}
