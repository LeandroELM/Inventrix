import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarProducto,
  darBajaProducto,
  listarProductos,
  obtenerProducto,
  registrarProducto,
  ultimosMovimientos,
  type DatosAlta,
  type FiltroProductos,
} from "@/features/productos/api";
import type { MotivoBaja } from "@/features/productos/motivosBaja";

export function useProductos(filtro: FiltroProductos) {
  return useQuery({ queryKey: ["productos", filtro], queryFn: () => listarProductos(filtro) });
}

export function useProducto(id: string) {
  return useQuery({ queryKey: ["producto", id], queryFn: () => obtenerProducto(id), enabled: id !== "" });
}

export function useUltimosMovimientos(id: string) {
  return useQuery({ queryKey: ["producto", id, "movimientos"], queryFn: () => ultimosMovimientos(id) });
}

function useInvalidar() {
  const qc = useQueryClient();
  return (id?: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["productos"] }),
      qc.invalidateQueries({ queryKey: ["inicio"] }),
      qc.invalidateQueries({ queryKey: ["a-pedir"] }),
      qc.invalidateQueries({ queryKey: ["alertas"] }),
      qc.invalidateQueries({ queryKey: ["historial"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ...(id ? [qc.invalidateQueries({ queryKey: ["producto", id] })] : []),
    ]);
}

export function useRegistrarProducto() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: (i: DatosAlta) => registrarProducto(i), onSuccess: (p) => invalidar(p.id) });
}

export function useActualizarProducto(id: string) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (c: Parameters<typeof actualizarProducto>[1]) => actualizarProducto(id, c),
    onSuccess: () => invalidar(id),
  });
}

export function useDarBajaProducto() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (v: { id: string; motivo: MotivoBaja; detalle?: string }) =>
      darBajaProducto(v.id, v.motivo, v.detalle),
    onSuccess: (_p, v) => invalidar(v.id),
  });
}
