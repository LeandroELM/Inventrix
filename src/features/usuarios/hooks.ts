import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Rol } from "@/features/auth/permisos";
import {
  cambiarEstado,
  cambiarRol,
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
  restablecerContrasena,
} from "@/features/usuarios/api";

const CLAVE = ["usuarios"] as const;

export function useUsuarios() {
  return useQuery({ queryKey: CLAVE, queryFn: listarUsuarios });
}

export function useUsuario(id: string) {
  return useQuery({
    queryKey: [...CLAVE, id],
    queryFn: () => obtenerUsuario(id),
    enabled: id !== "",
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: CLAVE });
}

export function useCrearUsuario() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: crearUsuario, onSuccess: invalidar });
}

// No cambia nada que la lista muestre: no invalida.
export function useRestablecerContrasena() {
  return useMutation({ mutationFn: (id: string) => restablecerContrasena(id) });
}

export function useCambiarRol() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: Rol }) => cambiarRol(id, rol),
    onSuccess: invalidar,
  });
}

export function useCambiarEstado() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) => cambiarEstado(id, activo),
    onSuccess: invalidar,
  });
}
