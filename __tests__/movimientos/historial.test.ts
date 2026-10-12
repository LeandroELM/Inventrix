import { listarHistorial } from "@/features/movimientos/api";

const mockIn = jest.fn();
const mockEq = jest.fn();
const consulta: Record<string, unknown> = {};
for (const [nombre, fn] of Object.entries({ in: mockIn, eq: mockEq })) {
  consulta[nombre] = (...a: unknown[]) => {
    fn(...a);
    return consulta;
  };
}
consulta.or = () => consulta;
consulta.order = () => consulta;
consulta.range = () => Promise.resolve({ data: [], error: null });

jest.mock("@/lib/supabase", () => ({ supabase: { from: () => ({ select: () => consulta }) } }));

describe("listarHistorial", () => {
  beforeEach(() => jest.clearAllMocks());

  it("el filtro Salidas incluye las bajas", async () => {
    await listarHistorial({ tipo: "salida", pagina: 0 });
    expect(mockIn).toHaveBeenCalledWith("tipo", ["salida", "baja"]);
  });

  it("el filtro Entradas incluye las iniciales", async () => {
    await listarHistorial({ tipo: "entrada", pagina: 0 });
    expect(mockIn).toHaveBeenCalledWith("tipo", ["entrada", "inicial"]);
  });
});
