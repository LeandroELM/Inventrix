import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Login from "../../app/login";
import { TemaProvider } from "@/tema/TemaProvider";

const mockIniciarSesion = jest.fn();
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ iniciarSesion: mockIniciarSesion }),
}));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function montar() {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <Login />
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

async function llenar(usuario = "ana.lopez", password = "x") {
  await fireEvent.changeText(screen.getByLabelText("Usuario"), usuario);
  await fireEvent.changeText(screen.getByLabelText("Contraseña"), password);
}

describe("Login", () => {
  beforeEach(() => mockIniciarSesion.mockReset());

  it("envía las credenciales", async () => {
    mockIniciarSesion.mockResolvedValue(undefined);
    await montar();
    await llenar("  ana.lopez ", " clave 1 ");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(mockIniciarSesion).toHaveBeenCalledWith("ana.lopez", " clave 1 "));
  });

  it("deshabilita el envío con campos vacíos", async () => {
    await montar();
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(mockIniciarSesion).not.toHaveBeenCalled();
  });

  it("muestra el error y lo borra al editar", async () => {
    const mensaje = "No fue posible iniciar sesión. Verifica tus datos.";
    mockIniciarSesion.mockRejectedValue(new Error(mensaje));
    await montar();
    await llenar("ana.lopez", "mala");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByText(mensaje)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Usuario"), "ana");
    expect(screen.queryByText(mensaje)).toBeNull();
  });

  it("el ojo alterna secureTextEntry y su etiqueta", async () => {
    await montar();
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(false);
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
  });

  it("la tecla Enviar inicia sesión", async () => {
    mockIniciarSesion.mockResolvedValue(undefined);
    await montar();
    await llenar();
    await fireEvent(screen.getByLabelText("Contraseña"), "submitEditing");
    await waitFor(() => expect(mockIniciarSesion).toHaveBeenCalledTimes(1));
  });

  it("doble envío llama una sola vez", async () => {
    mockIniciarSesion.mockReturnValue(new Promise(() => {}));
    await montar();
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    await fireEvent(screen.getByLabelText("Contraseña"), "submitEditing");
    expect(mockIniciarSesion).toHaveBeenCalledTimes(1);
  });

  it("muestra la marca y la ayuda de contraseña", async () => {
    await montar();
    expect(screen.getByText("Inventrix")).toBeTruthy();
    expect(screen.getByText("Control de inventario")).toBeTruthy();
    expect(screen.getByText("¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.")).toBeTruthy();
  });
});
