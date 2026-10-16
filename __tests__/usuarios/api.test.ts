const mockInvoke = jest.fn();
const mockRpc = jest.fn();
const mockOrder = jest.fn();
const mockSelect = jest.fn(() => ({ order: mockOrder }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: (...a: unknown[]) => (mockFrom as (...x: unknown[]) => unknown)(...a),
  },
}));

import {
  cambiarEstado,
  cambiarRol,
  crearUsuario,
  listarUsuarios,
  restablecerContrasena,
} from "@/features/usuarios/api";
import { mensajeDeError } from "@/lib/errores";

beforeEach(() => jest.clearAllMocks());

describe("api de usuarios", () => {
  it("crearUsuario envía la acción y devuelve id y contraseña", async () => {
    mockInvoke.mockResolvedValue({ data: { id: "u9", password: "Xk7mPq2Rtz" }, error: null });
    await expect(
      crearUsuario({ usuario: "ana", nombre: "Ana", rol: "operativo" }),
    ).resolves.toEqual({
      id: "u9",
      password: "Xk7mPq2Rtz",
    });
    expect(mockInvoke).toHaveBeenCalledWith("admin-usuarios", {
      body: { accion: "crear", usuario: "ana", nombre: "Ana", rol: "operativo" },
    });
  });

  it("toma el código de error del cuerpo de la respuesta", async () => {
    const context = new Response(JSON.stringify({ error: "USUARIO_EXISTENTE" }), { status: 409 });
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Edge Function returned a non-2xx status code", context },
    });
    await expect(crearUsuario({ usuario: "ana", nombre: "Ana", rol: "operativo" })).rejects.toThrow(
      "USUARIO_EXISTENTE",
    );
  });

  it("sin cuerpo relanza el error original", async () => {
    const original = new Error("Network request failed");
    mockInvoke.mockResolvedValue({ data: null, error: original });
    await expect(restablecerContrasena("u1")).rejects.toBe(original);
  });

  it("sin red se informa como falta de conexión", async () => {
    const error = Object.assign(new Error("Failed to send a request to the Edge Function"), {
      name: "FunctionsFetchError",
      context: new TypeError("Network request failed"),
    });
    mockInvoke.mockResolvedValue({ data: null, error });
    const fallo = await restablecerContrasena("u1").catch((e: unknown) => e);
    expect(mensajeDeError(fallo)).toBe("Sin conexión. Revisa tu internet e intenta de nuevo.");
  });

  it("restablecerContrasena envía el id", async () => {
    mockInvoke.mockResolvedValue({ data: { password: "Xk7mPq2Rtz" }, error: null });
    await expect(restablecerContrasena("u1")).resolves.toEqual({ password: "Xk7mPq2Rtz" });
    expect(mockInvoke).toHaveBeenCalledWith("admin-usuarios", {
      body: { accion: "restablecer", id: "u1" },
    });
  });

  it("cambiarRol llama a la RPC y propaga su código", async () => {
    mockRpc.mockResolvedValueOnce({ error: null });
    await cambiarRol("u1", "admin");
    expect(mockRpc).toHaveBeenCalledWith("cambiar_rol_usuario", { p_id: "u1", p_rol: "admin" });
    mockRpc.mockResolvedValueOnce({ error: { message: "ACCION_SOBRE_SI_MISMO" } });
    await expect(cambiarRol("u1", "admin")).rejects.toThrow("ACCION_SOBRE_SI_MISMO");
  });

  it("cambiarEstado llama a la RPC", async () => {
    mockRpc.mockResolvedValue({ error: null });
    await cambiarEstado("u1", false);
    expect(mockRpc).toHaveBeenCalledWith("cambiar_estado_usuario", { p_id: "u1", p_activo: false });
  });

  it("listarUsuarios lee perfiles ordenados por nombre", async () => {
    const filas = [{ id: "u1", usuario: "ana", nombre: "Ana", rol: "admin", activo: true }];
    mockOrder.mockResolvedValue({ data: filas, error: null });
    await expect(listarUsuarios()).resolves.toEqual(filas);
    expect(mockFrom).toHaveBeenCalledWith("perfiles");
    expect(mockSelect).toHaveBeenCalledWith("id,usuario,nombre,rol,activo");
    expect(mockOrder).toHaveBeenCalledWith("nombre");
  });
});
