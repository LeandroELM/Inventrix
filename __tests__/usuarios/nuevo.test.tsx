import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NuevoUsuario from "../../app/(app)/administracion/usuarios/nuevo";
import { TemaProvider } from "@/tema/TemaProvider";
import { mensajeAcceso } from "@/features/usuarios/validacion";

const mockCrear = jest.fn();
const mockBack = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useIsFocused: () => true,
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "u1", usuario: "ana.lopez", nombre: "Ana López", rol: "admin" } }),
}));
jest.mock("@/features/usuarios/hooks", () => ({ useCrearUsuario: () => ({ mutateAsync: mockCrear }) }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const PISTA = "Minúsculas, números, punto o guion (3 a 30)";
const ERROR_USUARIO = "Usa de 3 a 30 minúsculas, números, punto o guion.";

async function montar() {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <NuevoUsuario />
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

const crearBoton = () => screen.getByRole("button", { name: "Crear usuario" });
const escribir = async (campo: string, texto: string) => fireEvent.changeText(screen.getByLabelText(campo), texto);

describe("Nuevo usuario", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCrear.mockResolvedValue({ id: "u9", password: "Xk7mPq2Rtz" });
  });

  it("el botón espera nombre y usuario válidos; un nombre de espacios no cuenta", async () => {
    await montar();
    expect(crearBoton().props.accessibilityState).toMatchObject({ disabled: true });
    await escribir("Nombre", "   ");
    await escribir("Usuario", "ana.lopez");
    expect(crearBoton().props.accessibilityState).toMatchObject({ disabled: true });
    await escribir("Nombre", "Ana");
    expect(crearBoton().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it("valida el usuario en vivo y muestra la pista mientras no hay error", async () => {
    await montar();
    expect(screen.getByText(PISTA)).toBeTruthy();
    await escribir("Usuario", "ab");
    expect(screen.getByText(ERROR_USUARIO)).toBeTruthy();
    expect(screen.queryByText(PISTA)).toBeNull();
  });

  it("normaliza usuario y nombre antes de enviar", async () => {
    await montar();
    await escribir("Nombre", "  Ana López ");
    await escribir("Usuario", "Ana.Lopez ");
    expect(screen.queryByText(ERROR_USUARIO)).toBeNull();
    await fireEvent.press(crearBoton());
    expect(mockCrear).toHaveBeenCalledWith({ usuario: "ana.lopez", nombre: "Ana López", rol: "operativo" });
  });

  it("elegir Administrador envía rol admin", async () => {
    await montar();
    await escribir("Nombre", "Ana");
    await escribir("Usuario", "ana");
    await fireEvent.press(screen.getByRole("tab", { name: "Administrador" }));
    await fireEvent.press(crearBoton());
    expect(mockCrear).toHaveBeenCalledWith({ usuario: "ana", nombre: "Ana", rol: "admin" });
  });

  it("USUARIO_EXISTENTE aparece en el campo y se borra al editar", async () => {
    mockCrear.mockRejectedValueOnce(new Error("USUARIO_EXISTENTE"));
    await montar();
    await escribir("Nombre", "Ana");
    await escribir("Usuario", "ana");
    await fireEvent.press(crearBoton());
    expect(await screen.findByText("Ya existe un usuario con ese nombre.")).toBeTruthy();
    await escribir("Usuario", "ana2");
    expect(screen.queryByText("Ya existe un usuario con ese nombre.")).toBeNull();
  });

  it("otros errores van en el aviso", async () => {
    mockCrear.mockRejectedValueOnce(new Error("Network request failed"));
    await montar();
    await escribir("Nombre", "Ana");
    await escribir("Usuario", "ana");
    await fireEvent.press(crearBoton());
    expect(await screen.findByText("Sin conexión. Revisa tu internet e intenta de nuevo.")).toBeTruthy();
  });

  it("doble toque crea una vez", async () => {
    let terminar: (v: unknown) => void = () => {};
    mockCrear.mockReturnValue(new Promise((r) => (terminar = r)));
    await montar();
    await escribir("Nombre", "Ana");
    await escribir("Usuario", "ana");
    const boton = crearBoton();
    await act(async () => {
      boton.props.onClick({ nativeEvent: {}, stopPropagation() {}, preventDefault() {} });
      boton.props.onClick({ nativeEvent: {}, stopPropagation() {}, preventDefault() {} });
    });
    expect(mockCrear).toHaveBeenCalledTimes(1);
    await act(async () => terminar({ id: "u9", password: "Xk7mPq2Rtz" }));
  });

  it("resultado con la contraseña temporal y compartir", async () => {
    const compartir = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    await montar();
    await escribir("Nombre", "Ana López");
    await escribir("Usuario", "ana.lopez");
    await fireEvent.press(crearBoton());
    expect(await screen.findByText("¡Usuario creado!")).toBeTruthy();
    expect(screen.getByText("Ana López ya puede entrar a Inventrix con esta contraseña temporal.")).toBeTruthy();
    expect(screen.getByText("@ana.lopez")).toBeTruthy();
    expect(screen.getByText("Operativo")).toBeTruthy();
    expect(screen.getByText("Xk7mPq2Rtz")).toBeTruthy();
    await fireEvent.press(screen.getByText("Compartir acceso"));
    expect(compartir).toHaveBeenCalledWith({ message: mensajeAcceso({ usuario: "ana.lopez", password: "Xk7mPq2Rtz" }) });
    await fireEvent.press(screen.getByText("Volver a Usuarios"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("Cerrar vuelve atrás", async () => {
    await montar();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    expect(mockBack).toHaveBeenCalled();
  });
});
