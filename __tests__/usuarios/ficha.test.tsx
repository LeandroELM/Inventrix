import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import FichaUsuario from "../../app/(app)/administracion/usuarios/[id]";
import { TemaProvider } from "@/tema/TemaProvider";
import type { Usuario } from "@/features/usuarios/api";
import { mensajeAcceso } from "@/features/usuarios/validacion";

const mockUseUsuario = jest.fn();
const mockCambiarRol = jest.fn();
const mockCambiarEstado = jest.fn();
const mockRestablecer = jest.fn();
let mockId = "u2";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: mockId }),
  useIsFocused: () => true,
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "u1", usuario: "ana.lopez", nombre: "Ana López", rol: "admin" } }),
}));
jest.mock("@/features/usuarios/hooks", () => ({
  useUsuario: (id: string) => mockUseUsuario(id),
  useCambiarRol: () => ({ mutateAsync: mockCambiarRol }),
  useCambiarEstado: () => ({ mutateAsync: mockCambiarEstado }),
  useRestablecerContrasena: () => ({ mutateAsync: mockRestablecer }),
}));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const CARLOS: Usuario = { id: "u2", usuario: "carlos.m", nombre: "Carlos Mejía", rol: "operativo", activo: true };
const ANA: Usuario = { id: "u1", usuario: "ana.lopez", nombre: "Ana López", rol: "admin", activo: true };

async function montar(usuario: Usuario | null = CARLOS) {
  mockId = usuario?.id ?? "u404";
  mockUseUsuario.mockReturnValue({ data: usuario, isPending: false, isError: false, refetch: jest.fn() });
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <FichaUsuario />
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("Ficha de usuario", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCambiarRol.mockResolvedValue(undefined);
    mockCambiarEstado.mockResolvedValue(undefined);
    mockRestablecer.mockResolvedValue({ password: "Xk7mPq2Rtz" });
  });

  it("cabecera con nombre, usuario y estado", async () => {
    await montar();
    expect(screen.getByText("Carlos Mejía")).toBeTruthy();
    expect(screen.getByText("@carlos.m")).toBeTruthy();
    expect(screen.getByText("Activo")).toBeTruthy();
    expect(screen.getByLabelText("Carlos Mejía, usuario carlos.m, Operativo, activo")).toBeTruthy();
  });

  it("cambiar el rol pide confirmación y llama a la RPC", async () => {
    await montar();
    await fireEvent.press(screen.getByRole("tab", { name: "Administrador" }));
    expect(screen.getByText("¿Hacer administrador a Carlos Mejía?")).toBeTruthy();
    expect(
      screen.getByText("Podrá registrar y editar productos, dar de baja, ver reportes y alertas, y administrar usuarios."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText("Cancelar"));
    expect(mockCambiarRol).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("tab", { name: "Administrador" }));
    await fireEvent.press(screen.getByText("Cambiar rol"));
    expect(mockCambiarRol).toHaveBeenCalledWith({ id: "u2", rol: "admin" });
  });

  it("restablecer muestra la contraseña temporal y la comparte", async () => {
    const compartir = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await montar();
    await fireEvent.press(screen.getByText("Restablecer contraseña"));
    expect(screen.getByText("¿Restablecer la contraseña?")).toBeTruthy();
    expect(screen.getByText("Se generará una contraseña temporal y la actual dejará de funcionar.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Restablecer"));
    expect(mockRestablecer).toHaveBeenCalledWith("u2");
    expect(await screen.findByText("Xk7mPq2Rtz")).toBeTruthy();
    expect(screen.getByText("Contraseña temporal")).toBeTruthy();
    expect(screen.getByText("Compártela con Carlos Mejía. Podrá cambiarla en Configuración.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Compartir"));
    expect(compartir).toHaveBeenCalledWith({ message: mensajeAcceso({ usuario: "carlos.m", password: "Xk7mPq2Rtz" }) });
    await fireEvent.press(screen.getByText("Listo"));
    expect(screen.queryByText("Xk7mPq2Rtz")).toBeNull();
  });

  it("desactivar pide confirmación y llama a la RPC", async () => {
    await montar();
    await fireEvent.press(screen.getByText("Desactivar usuario"));
    expect(screen.getByText("¿Desactivar a Carlos Mejía?")).toBeTruthy();
    expect(screen.getByText("No podrá entrar ni ver el inventario. Su historial se conserva.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Desactivar"));
    expect(mockCambiarEstado).toHaveBeenCalledWith({ id: "u2", activo: false });
  });

  it("un usuario inactivo se reactiva", async () => {
    await montar({ ...CARLOS, activo: false });
    expect(screen.getByText("Inactivo")).toBeTruthy();
    expect(screen.queryByText("Desactivar usuario")).toBeNull();
    await fireEvent.press(screen.getByText("Reactivar usuario"));
    expect(screen.getByText("¿Reactivar a Carlos Mejía?")).toBeTruthy();
    expect(screen.getByText("Podrá volver a entrar con su contraseña actual.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Reactivar"));
    expect(mockCambiarEstado).toHaveBeenCalledWith({ id: "u2", activo: true });
  });

  it("la cuenta propia no tiene acciones", async () => {
    await montar(ANA);
    expect(screen.getByText("Tu cuenta se administra en Configuración.")).toBeTruthy();
    expect(screen.queryByText("Restablecer contraseña")).toBeNull();
    expect(screen.queryByText("Desactivar usuario")).toBeNull();
    expect(screen.queryByRole("tab", { name: "Administrador" })).toBeNull();
  });

  it("usuario inexistente", async () => {
    await montar(null);
    expect(screen.getByText("No se encontró el usuario.")).toBeTruthy();
  });

  it("doble toque en Desactivar llama una vez y la hoja queda bloqueada mientras tanto", async () => {
    let terminar: () => void = () => {};
    mockCambiarEstado.mockReturnValue(new Promise<void>((r) => (terminar = r)));
    await montar();
    await fireEvent.press(screen.getByText("Desactivar usuario"));
    const boton = screen.getByText("Desactivar");
    await fireEvent.press(boton);
    await fireEvent.press(boton);
    expect(mockCambiarEstado).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText("Cancelar"));
    expect(screen.getByText("¿Desactivar a Carlos Mejía?")).toBeTruthy();
    await act(async () => terminar());
  });

  it("si restablecer falla, la hoja sigue abierta con el error y permite reintentar", async () => {
    mockRestablecer.mockRejectedValueOnce(new Error("Network request failed"));
    await montar();
    await fireEvent.press(screen.getByText("Restablecer contraseña"));
    await fireEvent.press(screen.getByText("Restablecer"));
    expect(await screen.findByText("Sin conexión. Revisa tu internet e intenta de nuevo.")).toBeTruthy();
    expect(screen.getByText("¿Restablecer la contraseña?")).toBeTruthy();
    await fireEvent.press(screen.getByText("Restablecer"));
    expect(await screen.findByText("Xk7mPq2Rtz")).toBeTruthy();
    expect(mockRestablecer).toHaveBeenCalledTimes(2);
  });
});
