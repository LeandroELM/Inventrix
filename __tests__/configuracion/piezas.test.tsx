import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HojaCerrarSesion } from "@/features/configuracion/HojaCerrarSesion";
import { HojaContrasena } from "@/features/configuracion/HojaContrasena";
import { TarjetaPerfil } from "@/features/configuracion/TarjetaPerfil";
import { validarContrasenaNueva } from "@/features/configuracion/contrasena";
import { mensajeDeError } from "@/lib/errores";
import { TemaProvider } from "@/tema/TemaProvider";

const mockUpdateUser = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { updateUser: (...a: unknown[]) => mockUpdateUser(...a) } },
}));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("TarjetaPerfil", () => {
  it("TarjetaPerfil del admin", async () => {
    await montar(<TarjetaPerfil perfil={{ id: "1", usuario: "ana.lopez", nombre: "Ana López", rol: "admin" }} />);
    expect(screen.getByLabelText("Ana López, usuario ana.lopez, Administrador")).toBeTruthy();
    expect(screen.getByText("@ana.lopez · Administrador")).toBeTruthy();
  });

  it("TarjetaPerfil del operativo", async () => {
    await montar(<TarjetaPerfil perfil={{ id: "2", usuario: "carlos.m", nombre: "Carlos M", rol: "operativo" }} />);
    expect(screen.getByText("@carlos.m · Operativo")).toBeTruthy();
  });
});

describe("HojaContrasena", () => {
  const onCerrar = jest.fn();
  const onGuardada = jest.fn();

  beforeEach(() => {
    mockUpdateUser.mockReset().mockResolvedValue({ error: null });
    onCerrar.mockReset();
    onGuardada.mockReset();
  });

  async function escribir(nueva: string, confirmacion: string) {
    await fireEvent.changeText(screen.getByLabelText("Nueva contraseña"), nueva);
    await fireEvent.changeText(screen.getByLabelText("Confirmar contraseña"), confirmacion);
  }

  it("contraseña corta muestra el error sin llamar a la API", async () => {
    await montar(<HojaContrasena onCerrar={onCerrar} onGuardada={onGuardada} />);
    await escribir("1234567", "1234567");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(await screen.findByText(validarContrasenaNueva("1234567", "1234567") as string)).toBeTruthy();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("error del servidor conserva lo escrito", async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: "x" } });
    await montar(<HojaContrasena onCerrar={onCerrar} onGuardada={onGuardada} />);
    await escribir("12345678", "12345678");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Nueva contraseña").props.value).toBe("12345678");
    expect(onGuardada).not.toHaveBeenCalled();
  });

  it("el aviso se borra al editar", async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: "x" } });
    await montar(<HojaContrasena onCerrar={onCerrar} onGuardada={onGuardada} />);
    await escribir("12345678", "12345678");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Nueva contraseña"), "123456789");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("guardar correcto llama a onGuardada una vez", async () => {
    let resolver!: (v: { error: null }) => void;
    mockUpdateUser.mockReturnValue(new Promise((r) => (resolver = r)));
    await montar(<HojaContrasena onCerrar={onCerrar} onGuardada={onGuardada} />);
    await escribir("12345678", "12345678");
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    await fireEvent.press(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(mockUpdateUser).toHaveBeenCalledTimes(1);
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "12345678" });
    await act(async () => resolver({ error: null }));
    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1));
  });
});

describe("HojaCerrarSesion", () => {
  it("cerrar sesión confirma una vez", async () => {
    let resolver!: () => void;
    const onConfirmar = jest.fn().mockReturnValue(new Promise<void>((r) => (resolver = r)));
    await montar(<HojaCerrarSesion onCerrar={jest.fn()} onConfirmar={onConfirmar} />);
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    await act(async () => resolver());
  });

  it("fallo al cerrar sesión muestra el aviso y permite reintentar", async () => {
    const error = new Error("Sin conexión");
    const onConfirmar = jest.fn().mockRejectedValue(error);
    await montar(<HojaCerrarSesion onCerrar={jest.fn()} onConfirmar={onConfirmar} />);
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByText(mensajeDeError(error))).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledTimes(2));
  });

  it("Cancelar cierra", async () => {
    const onCerrar = jest.fn();
    await montar(<HojaCerrarSesion onCerrar={onCerrar} onConfirmar={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCerrar).toHaveBeenCalled();
  });
});
