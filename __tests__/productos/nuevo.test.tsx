import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Nuevo from "../../app/(app)/nuevo";

const mockRegistrar = jest.fn();
let mockParams: { codigo?: string } = {};
jest.mock("@/features/productos/api", () => ({
  registrarProducto: (...args: unknown[]) => mockRegistrar(...args),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: "admin" } }),
}));

async function renderizar() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <Nuevo />
    </QueryClientProvider>,
  );
}

async function llenar() {
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "  Harina de trigo ");
  await fireEvent.changeText(screen.getByLabelText("Código"), "HAR-001");
  await fireEvent.press(screen.getByRole("button", { name: "Kilogramo" }));
  await fireEvent.changeText(screen.getByLabelText("Cantidad inicial"), "10,5");
  await fireEvent.changeText(screen.getByLabelText("Punto de pedido"), "2");
}

describe("Nuevo producto", () => {
  beforeEach(() => {
    mockRegistrar.mockReset();
    mockParams = {};
  });

  it("muestra la revisión con los 5 datos y permite volver conservándolos", async () => {
    await renderizar();
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
    expect(await screen.findByText("Harina de trigo")).toBeTruthy();
    expect(screen.getByText("HAR-001")).toBeTruthy();
    expect(screen.getByText("Kilogramo")).toBeTruthy();
    expect(screen.getByText("10.5 kg")).toBeTruthy();
    expect(screen.getByText("2 kg")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Editar información" }));
    expect(screen.getByLabelText("Nombre").props.value).toBe("  Harina de trigo ");
    expect(screen.getByLabelText("Código").props.value).toBe("HAR-001");
    expect(screen.getByLabelText("Cantidad inicial").props.value).toBe("10,5");
  });

  it("no pasa a la revisión con nombre en blanco ni cantidad inválida", async () => {
    await renderizar();
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "   ");
    await fireEvent.changeText(screen.getByLabelText("Código"), "HAR-001");
    await fireEvent.changeText(screen.getByLabelText("Cantidad inicial"), "1.5");
    await fireEvent.changeText(screen.getByLabelText("Punto de pedido"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
    expect(await screen.findByText("Ingresa el nombre.")).toBeTruthy();
    expect(screen.getByText("Esta unidad solo admite números enteros.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar registro" })).toBeNull();
  });

  it("confirma el registro y ofrece las opciones finales", async () => {
    mockRegistrar.mockResolvedValue({ id: "p1" });
    await renderizar();
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Confirmar registro" }));
    expect(await screen.findByText("Producto registrado correctamente")).toBeTruthy();
    expect(mockRegistrar).toHaveBeenCalledWith({
      nombre: "Harina de trigo",
      codigo: "HAR-001",
      unidad: "kilogramo",
      cantidadInicial: 10.5,
      puntoPedido: 2,
    });
    expect(screen.getByRole("button", { name: "Ver en Existencias" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar otro" })).toBeTruthy();
  });

  it("muestra CODIGO_DUPLICADO bajo el campo código", async () => {
    mockRegistrar.mockRejectedValue(new Error("CODIGO_DUPLICADO"));
    await renderizar();
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Confirmar registro" }));
    expect(await screen.findByText("Este código ya está registrado.")).toBeTruthy();
    expect(screen.getByLabelText("Código").props.value).toBe("HAR-001");
  });

  it("precarga el código recibido del escáner y lo actualiza al cambiar", async () => {
    mockParams = { codigo: "7501234" };
    const { rerender } = await renderizar();
    await waitFor(() => expect(screen.getByLabelText("Código").props.value).toBe("7501234"));
    mockParams = { codigo: "999888" };
    const qc = new QueryClient();
    await rerender(
      <QueryClientProvider client={qc}>
        <Nuevo />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByLabelText("Código").props.value).toBe("999888"));
  });
});
