import { useQuery } from "@tanstack/react-query";
import { listarProductos, obtenerProducto, type FiltroProductos } from "@/features/productos/api";

export function useProductos(filtro: FiltroProductos) {
  return useQuery({ queryKey: ["productos", filtro], queryFn: () => listarProductos(filtro) });
}

export function useProducto(id: string) {
  return useQuery({ queryKey: ["producto", id], queryFn: () => obtenerProducto(id) });
}
