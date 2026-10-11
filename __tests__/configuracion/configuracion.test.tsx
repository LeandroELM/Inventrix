import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Configuracion from "../../app/(app)/configuracion";

const mockUpdateUser = jest.fn();
const mockCerrarSesion = jest.fn();
const mockPush = jest.fn();
let mockRol: "admin" | "operativo" = "operativo";

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { updateUser: (...a: unknown[]) => mockUpdateUser(...a) } },
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}));
jest.mock("@/features/alertas/push", () => ({ registrarPush: jest.fn().mockResolvedValue("autorizado") }));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    perfil: { id: "1", usuario: "carlos.m", nombre: "Carlos M", rol: mockRol },
    cerrarSesion: mockCerrarSesion,
  }),
}));

describe("Configuración", () => {
  beforeEach(() => {
    mockRol = "operativo";
    mockUpdateUser.mockReset().mockResolvedValue({ error: null });
    mockCerrarSesion.mockReset();
    mockPush.mockReset();
  });

  it("contraseña de 7 caracteres muestra el mensaje sin llamar a la API", async () => {
    await render(<Configuracion />);
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await fireEvent.changeText(screen.getByLabelText("Nueva contraseña"), "1234567");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "1234567");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(await screen.findByText("La contraseña debe tener al menos 8 caracteres.")).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("contraseña válida llama a updateUser", async () => {
    await render(<Configuracion />);
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await fireEvent.changeText(screen.getByLabelText("Nueva contraseña"), "12345678");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "12345678");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ password: "12345678" }));
    expect(await screen.findByText("Contraseña actualizada.")).toBeTruthy();
  });

  it("oculta Notificaciones para operativo y la muestra para admin", async () => {
    const { unmount } = await render(<Configuracion />);
    expect(screen.queryByText("Notificaciones")).toBeNull();
    await unmount();
    mockRol = "admin";
    await render(<Configuracion />);
    expect(await screen.findByText("Permiso: Permitido")).toBeTruthy();
    expect(screen.getByText("Notificaciones")).toBeTruthy();
  });

  it("Cerrar sesión llama a cerrarSesion y Soporte navega a /soporte", async () => {
    await render(<Configuracion />);
    await fireEvent.press(screen.getByRole("button", { name: "Abrir soporte" }));
    expect(mockPush).toHaveBeenCalledWith("/soporte");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(mockCerrarSesion).toHaveBeenCalledTimes(1);
  });
});
