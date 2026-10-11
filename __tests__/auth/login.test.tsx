import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Login from "../../app/login";

const mockIniciarSesion = jest.fn();
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ iniciarSesion: mockIniciarSesion }),
}));

describe("Login", () => {
  beforeEach(() => mockIniciarSesion.mockReset());

  it("envía las credenciales", async () => {
    mockIniciarSesion.mockResolvedValue(undefined);
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Usuario"), "ana.lopez");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "x");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(mockIniciarSesion).toHaveBeenCalledWith("ana.lopez", "x"));
  });

  it("deshabilita el envío con campos vacíos", async () => {
    await render(<Login />);
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(mockIniciarSesion).not.toHaveBeenCalled();
  });

  it("muestra el error si el inicio falla", async () => {
    mockIniciarSesion.mockRejectedValue(new Error("No fue posible iniciar sesión. Verifica tus datos."));
    await render(<Login />);
    await fireEvent.changeText(screen.getByLabelText("Usuario"), "ana.lopez");
    await fireEvent.changeText(screen.getByLabelText("Contraseña"), "mala");
    await fireEvent.press(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByText("No fue posible iniciar sesión. Verifica tus datos.")).toBeTruthy();
  });

  it("el botón de ojo alterna secureTextEntry", async () => {
    await render(<Login />);
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(screen.getByLabelText("Contraseña").props.secureTextEntry).toBe(true);
  });
});
