import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listarHistorial,
  registrarMovimiento,
  TAMANO_PAGINA,
  type DatosMovimiento,
  type FiltroHistorial,
} from "@/features/movimientos/api";

export function useRegistrarMovimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (i: DatosMovimiento) => registrarMovimiento(i),
    onSuccess: (_m, i) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["productos"] }),
        qc.invalidateQueries({ queryKey: ["producto", i.productoId] }),
        qc.invalidateQueries({ queryKey: ["inicio"] }),
        qc.invalidateQueries({ queryKey: ["historial"] }),
        qc.invalidateQueries({ queryKey: ["a-pedir"] }),
        qc.invalidateQueries({ queryKey: ["alertas"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]),
  });
}

export function useHistorial(filtro: FiltroHistorial) {
  return useInfiniteQuery({
    queryKey: ["historial", filtro],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listarHistorial({ ...filtro, pagina: pageParam }),
    getNextPageParam: (ultima, todas) => (ultima.length < TAMANO_PAGINA ? undefined : todas.length),
    // Al cambiar búsqueda o tipo se conserva la lista anterior en vez de volver a Skeleton.
    placeholderData: keepPreviousData,
  });
}
