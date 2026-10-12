import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useDashboard } from "@/features/reportes/hooks";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

function envoltorio() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Envoltorio({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useDashboard", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 11), advanceTimers: true });
    mockRpc.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it("llama al RPC con el rango del periodo y convierte el resultado", async () => {
    mockRpc.mockResolvedValue({
      data: {
        mas_vendido: { producto_id: "p1", nombre: "Arroz", unidad: "libra", cantidad: "42.50" },
        menos_vendido: null,
        en_punto_pedido: 3,
        total_movimientos: 57,
        serie: [{ fecha: "2026-10-05", entradas: 4, salidas: 9 }],
      },
      error: null,
    });
    const { result } = await renderHook(() => useDashboard("7d"), { wrapper: envoltorio() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRpc).toHaveBeenCalledWith("dashboard_reportes", { p_desde: "2026-10-05", p_hasta: "2026-10-11" });
    expect(result.current.data).toEqual({
      masVendido: { productoId: "p1", nombre: "Arroz", unidad: "libra", cantidad: 42.5 },
      menosVendido: null,
      enPuntoPedido: 3,
      totalMovimientos: 57,
      serie: [{ fecha: "2026-10-05", entradas: 4, salidas: 9 }],
    });
  });

  it("queda en error si el RPC falla", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { result } = await renderHook(() => useDashboard("30d"), { wrapper: envoltorio() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
