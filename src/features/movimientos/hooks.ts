import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registrarMovimiento, type DatosMovimiento } from "@/features/movimientos/api";

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
      ]),
  });
}
