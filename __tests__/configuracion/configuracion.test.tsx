import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Configuracion from "../../app/(app)/(tabs)/configuracion";
import { guardarApariencia } from "@/features/configuracion/apariencia";
import { TemaProvider } from "@/tema/TemaProvider";

const mockUpdateUser = jest.fn();
const mockCerrarSesion = jest.fn();
const mockPush = jest.fn();
const mockPermisos = jest.fn();
let mockRol: "admin" | "operativo" = "operativo";

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { updateUser: (...a: unknown[]) => mockUpdateUser(...a) } },
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.0.0" }, executionEnvironment: "bare" },
  ExecutionEnvironment: { StoreClient: "storeClient" },
}));
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: (...a: unknown[]) => mockPermisos(...a),
}));
jest.mock("@/features/alertas/push", () => ({ registrarPush: jest.fn().mockResolvedValue("autorizado") }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: jest.fn().mockResolvedValue("claro"),
  guardarApariencia: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    perfil: { id: "1", usuario: "carlos.m", nombre: "Carlos M", rol: mockRol },
    cerrarSesion: mockCerrarSesion,
  }),
}));

function pantalla() {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <Configuracion />
      </TemaProvider>
    </SafeAreaProvider>
  );
}

describe("Configuración", () => {
  beforeEach(() => {
    mockRol = "operativo";
    mockUpdateUser.mockReset().mockResolvedValue({ error: null });
    mockCerrarSesion.mockReset().mockResolvedValue(undefined);
    mockPush.mockReset();
    mockPermisos.mockReset().mockResolvedValue({ status: "granted" });
    (guardarApariencia as jest.Mock).mockClear();
  });

  it("muestra el perfil y la versión", async () => {
    await render(pantalla());
    expect(screen.getByText("@carlos.m · Operativo")).toBeTruthy();
    expect(screen.getByText("Inventrix v1.0.0")).toBeTruthy();
  });

  it("Cambiar contraseña abre la hoja y al guardar muestra el aviso", async () => {
    await render(pantalla());
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await fireEvent.changeText(screen.getByLabelText("Nueva contraseña"), "12345678");
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), "12345678");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ password: "12345678" }));
    expect(await screen.findByText("Contraseña actualizada.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByLabelText("Confirmar contraseña")).toBeNull());
  });

  it("Notificaciones solo para el admin", async () => {
    const { unmount } = await render(pantalla());
    expect(screen.queryByText("Notificaciones")).toBeNull();
    await unmount();
    mockRol = "admin";
    await render(pantalla());
    expect(await screen.findByText("Permiso: Permitido")).toBeTruthy();
    expect(screen.getByText("Notificaciones")).toBeTruthy();
  });

  it("Reintentar solo si el permiso no es Permitido", async () => {
    mockRol = "admin";
    mockPermisos.mockResolvedValue({ status: "denied" });
    const { unmount } = await render(pantalla());
    expect(await screen.findByText("Permiso: Denegado")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar registro de notificaciones" })).toBeTruthy();
    await unmount();
    mockPermisos.mockResolvedValue({ status: "granted" });
    await render(pantalla());
    expect(await screen.findByText("Permiso: Permitido")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar registro de notificaciones" })).toBeNull();
  });

  it("el resultado del registro va debajo de la tarjeta de preferencias", async () => {
    mockRol = "admin";
    mockPermisos.mockResolvedValue({ status: "denied" });
    await render(pantalla());
    await fireEvent.press(await screen.findByRole("button", { name: "Reintentar registro de notificaciones" }));
    const mensaje = await screen.findByText("Dispositivo registrado.");
    expect(mensaje).toBeTruthy();
    expect(within(screen.getByTestId("tarjeta-preferencias")).queryByText("Dispositivo registrado.")).toBeNull();
  });

  it("Cerrar sesión pide confirmación", async () => {
    await render(pantalla());
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(screen.getByText("¿Cerrar sesión?")).toBeTruthy();
    expect(mockCerrarSesion).not.toHaveBeenCalled();
    const botones = screen.getAllByRole("button", { name: "Cerrar sesión" });
    await fireEvent.press(botones[botones.length - 1]);
    await waitFor(() => expect(mockCerrarSesion).toHaveBeenCalledTimes(1));
  });

  it("Hablar con Trix navega a /soporte", async () => {
    await render(pantalla());
    await fireEvent.press(screen.getByRole("button", { name: "Hablar con Trix" }));
    expect(mockPush).toHaveBeenCalledWith("/soporte");
  });

  it("el modo oscuro alterna desde la fila y desde el interruptor", async () => {
    await render(pantalla());
    await fireEvent.press(screen.getByRole("button", { name: "Modo oscuro" }));
    await waitFor(() => expect(guardarApariencia).toHaveBeenLastCalledWith("oscuro"));
    await fireEvent(screen.getByRole("switch", { name: "Modo oscuro" }), "valueChange", false);
    await waitFor(() => expect(guardarApariencia).toHaveBeenLastCalledWith("claro"));
  });
});
