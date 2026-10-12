import { useQuery } from "@tanstack/react-query";
import { obtenerDashboard } from "@/features/reportes/api";
import { rangoDePeriodo, type PeriodoDashboard } from "@/features/reportes/dashboard";

export function useDashboard(periodo: PeriodoDashboard) {
  const { desde, hasta } = rangoDePeriodo(periodo, new Date());
  return useQuery({
    queryKey: ["dashboard", periodo, desde, hasta],
    queryFn: () => obtenerDashboard(desde, hasta),
  });
}
