const mockRpc = jest.fn();
const mockConsulta: Record<string, jest.Mock> = {
  select: jest.fn(() => mockConsulta),
  eq: jest.fn(() => Promise.resolve({ count: 4, error: null })),
  limit: jest.fn(() => Promise.resolve({ data: [], count: 0, error: null })),
};
jest.mock("@/lib/supabase", () => ({ supabase: { from: () => mockConsulta, rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.mock("@/features/movimientos/api", () => ({ listarHistorial: jest.fn().mockResolvedValue([]) }));

import { obtenerInicio } from "@/features/inicio/api";

const ahora = new Date(2026, 9, 11, 10);
const dashboard = (serie: unknown[]) => ({
  mas_vendido: null,
  menos_vendido: null,
  en_punto_pedido: 0,
  total_movimientos: 0,
  serie,
});

function simular(dash: { data?: unknown; error?: unknown }) {
  mockRpc.mockImplementation((nombre: string) =>
    Promise.resolve(nombre === "dashboard_reportes" ? { data: dash.data ?? null, error: dash.error ?? null } : { data: [], error: null }),
  );
}

describe("obtenerInicio: entradas y salidas de hoy", () => {
  beforeEach(() => mockRpc.mockReset());

  it("admin: consulta el dashboard de hoy y expone entradas y salidas", async () => {
    simular({ data: dashboard([{ fecha: "2026-10-11", entradas: 18, salidas: 9 }]) });
    const inicio = await obtenerInicio("admin", ahora);
    expect(mockRpc).toHaveBeenCalledWith("dashboard_reportes", { p_desde: "2026-10-11", p_hasta: "2026-10-11" });
    expect(inicio.hoy).toEqual({ entradas: 18, salidas: 9 });
  });

  it("admin: si el dashboard falla, resuelve sin hoy", async () => {
    simular({ error: { message: "falla" } });
    const inicio = await obtenerInicio("admin", ahora);
    expect(inicio.hoy).toBeUndefined();
  });

  it("operativo: no llama al dashboard", async () => {
    simular({ data: dashboard([]) });
    const inicio = await obtenerInicio("operativo", ahora);
    expect(mockRpc).not.toHaveBeenCalledWith("dashboard_reportes", expect.anything());
    expect(inicio.hoy).toBeUndefined();
  });
});
