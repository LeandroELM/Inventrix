import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useRegistrarMovimiento } from "@/features/movimientos/hooks";
import { useActualizarProducto } from "@/features/productos/hooks";

jest.mock("@/features/movimientos/api", () => ({
  registrarMovimiento: jest.fn().mockResolvedValue({}),
  listarHistorial: jest.fn(),
  TAMANO_PAGINA: 20,
}));
jest.mock("@/features/productos/api", () => ({
  actualizarProducto: jest.fn().mockResolvedValue({ id: "p1" }),
}));

function envoltorio() {
  const qc = new QueryClient();
  const espia = jest.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const claves = () => espia.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey[0]);
  return { wrapper, claves };
}

describe("invalidación de consultas", () => {
  it("registrar movimiento invalida a-pedir y alertas", async () => {
    const { wrapper, claves } = envoltorio();
    const { result } = await renderHook(() => useRegistrarMovimiento(), { wrapper });
    await act(() => result.current.mutateAsync({ productoId: "p1", tipo: "salida", cantidad: 1 } as never));
    expect(claves()).toEqual(expect.arrayContaining(["productos", "inicio", "historial", "a-pedir", "alertas"]));
  });

  it("actualizar producto invalida a-pedir, alertas e historial", async () => {
    const { wrapper, claves } = envoltorio();
    const { result } = await renderHook(() => useActualizarProducto("p1"), { wrapper });
    await act(() => result.current.mutateAsync({ nombre: "A", unidad: "unidad", puntoPedido: 1 }));
    expect(claves()).toEqual(expect.arrayContaining(["productos", "inicio", "a-pedir", "alertas", "historial", "producto"]));
  });
});
