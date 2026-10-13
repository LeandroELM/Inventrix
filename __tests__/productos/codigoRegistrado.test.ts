const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
jest.mock("@/lib/supabase", () => ({ supabase: { from: (...a: unknown[]) => (mockFrom as any)(...a) } }));

import { codigoRegistrado } from "@/features/productos/api";

beforeEach(() => jest.clearAllMocks());

describe("codigoRegistrado", () => {
  it("recorta el código antes de consultar", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await codigoRegistrado("  750123  ");
    expect(mockFrom).toHaveBeenCalledWith("productos");
    expect(mockSelect).toHaveBeenCalledWith("nombre, activo");
    expect(mockEq).toHaveBeenCalledTimes(1);
    expect(mockEq).toHaveBeenCalledWith("codigo", "750123");
    expect(mockEq).not.toHaveBeenCalledWith("activo", expect.anything());
  });

  it("devuelve nombre y activo", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { nombre: "Tornillo", activo: false }, error: null });
    await expect(codigoRegistrado("1")).resolves.toEqual({ nombre: "Tornillo", activo: false });
  });

  it("null si no existe", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(codigoRegistrado("1")).resolves.toBeNull();
  });

  it("propaga el error", async () => {
    const error = new Error("fallo");
    mockMaybeSingle.mockResolvedValue({ data: null, error });
    await expect(codigoRegistrado("1")).rejects.toBe(error);
  });
});
