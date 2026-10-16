import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import {
  useCambiarEstado,
  useCambiarRol,
  useCrearUsuario,
  useRestablecerContrasena,
} from "@/features/usuarios/hooks";
import { restablecerContrasena } from "@/features/usuarios/api";

jest.mock("@/features/usuarios/api", () => ({
  crearUsuario: jest.fn().mockResolvedValue({ id: "u9", password: "x" }),
  restablecerContrasena: jest.fn().mockResolvedValue({ password: "x" }),
  cambiarRol: jest.fn().mockResolvedValue(undefined),
  cambiarEstado: jest.fn().mockResolvedValue(undefined),
  listarUsuarios: jest.fn(),
  obtenerUsuario: jest.fn(),
}));

function envoltorio() {
  const qc = new QueryClient();
  const espia = jest.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper, espia };
}

describe("hooks de usuarios", () => {
  it.each([
    ["crear", () => useCrearUsuario(), { usuario: "ana", nombre: "Ana", rol: "operativo" }],
    ["cambiar rol", () => useCambiarRol(), { id: "u2", rol: "admin" }],
    ["cambiar estado", () => useCambiarEstado(), { id: "u2", activo: false }],
  ])("%s invalida la lista de usuarios", async (_n, hook, variables) => {
    const { wrapper, espia } = envoltorio();
    const { result } = await renderHook(
      hook as () => { mutateAsync: (v: never) => Promise<unknown> },
      { wrapper },
    );
    await act(() => result.current.mutateAsync(variables as never));
    expect(espia).toHaveBeenCalledWith({ queryKey: ["usuarios"] });
  });

  it("restablecer llama a la api con el id", async () => {
    const { wrapper } = envoltorio();
    const { result } = await renderHook(() => useRestablecerContrasena(), { wrapper });
    await act(() => result.current.mutateAsync("u2"));
    expect(restablecerContrasena).toHaveBeenCalledWith("u2");
  });
});
