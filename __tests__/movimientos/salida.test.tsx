import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Salida from "../../app/(app)/movimientos/salida";

const mockRegistrar = jest.fn();
let mockParams: { productoId?: string; motivo?: string } = {};
const producto = {
  id: "p1",
  nombre: "Tornillos",
  codigo: "TOR-001",
  unidad: "unidad",
  existencias: 5,
  punto_pedido: 2,
  activo: true,
};
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: jest.fn(async () => producto),
  listarProductos: jest.fn(async () => [producto]),
}));
jest.mock("@/features/movimientos/api", () => ({
  registrarMovimiento: (...args: unknown[]) => mockRegistrar(...args),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

async function renderizar() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <Salida />
    </QueryClientProvider>,
  );
}

describe("Salida", () => {
  beforeEach(() => {
    mockRegistrar.mockReset();
    mockParams = { productoId: "p1" };
  });

  it("rechaza una cantidad mayor a las existencias", async () => {
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad"), "6");
    expect(screen.getByText("La cantidad supera las existencias disponibles.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeDisabled();
  });

  it("deshabilita el botón sin motivo y lo habilita con motivo", async () => {
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.changeText(screen.getByLabelText("Cantidad"), "2");
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeEnabled();
  });

  it("preselecciona el motivo recibido por parámetro", async () => {
    mockParams = { productoId: "p1", motivo: "retiro_autorizado" };
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.changeText(screen.getByLabelText("Cantidad"), "1");
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeEnabled();
  });

  it("registra y muestra la confirmación con aviso de punto de pedido", async () => {
    mockRegistrar.mockResolvedValue({ existencias_antes: 5, existencias_despues: 2, cantidad: 3 });
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Consumo interno" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad"), "3");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar salida" }));
    expect(await screen.findByText("Movimiento registrado")).toBeTruthy();
    expect(mockRegistrar).toHaveBeenCalledWith({
      productoId: "p1",
      tipo: "salida",
      cantidad: 3,
      motivo: "consumo_interno",
    });
    expect(screen.getByText("El producto alcanzó su punto de pedido. Se notificó al administrador.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar otro movimiento" })).toBeTruthy();
  });

  it("muestra el error de existencias insuficientes del servidor", async () => {
    mockRegistrar.mockRejectedValue(new Error("EXISTENCIAS_INSUFICIENTES"));
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad"), "5");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar salida" }));
    expect(await screen.findByText("La cantidad supera las existencias disponibles.")).toBeTruthy();
  });
});
