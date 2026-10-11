import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarAlertas, listarAPedir, marcarLeidas } from "@/features/alertas/api";
import { contarAlertasNoLeidas } from "@/features/inicio/api";

// Misma clave que usa el panel de inicio: una sola fuente de verdad para el conteo.
export function useAlertasNoLeidas(): number {
  const { data } = useQuery({ queryKey: ["inicio", "alertas", "no-leidas"], queryFn: contarAlertasNoLeidas });
  return data ?? 0;
}

export function useAlertas() {
  return useQuery({ queryKey: ["alertas"], queryFn: listarAlertas });
}

export function useAPedir() {
  return useQuery({ queryKey: ["a-pedir"], queryFn: listarAPedir });
}

export function useMarcarLeidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marcarLeidas,
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: ["inicio"] }), qc.invalidateQueries({ queryKey: ["alertas"] })]),
  });
}
