import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Salida from "../../app/(app)/movimientos/salida";
import { TemaProvider } from "@/tema/TemaProvider";

const mockRegistrar = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockPuedeVolver = true;
let mockParams: { productoId?: string; motivo?: string } = {};
let mockProducto: Record<string, unknown> = {};
const base = {
  id: "p1",
  nombre: "Tornillos",
  codigo: "TOR-001",
  unidad: "unidad",
  existencias: 5,
  punto_pedido: 2,
  activo: true,
};
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
const mockObtener = jest.fn();
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: (...args: unknown[]) => mockObtener(...args),
  listarProductos: jest.fn(async () => [mockProducto]),
}));
jest.mock("@/features/movimientos/api", () => ({
  registrarMovimiento: (...args: unknown[]) => mockRegistrar(...args),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack, canGoBack: () => mockPuedeVolver }),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

async function renderizar() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <QueryClientProvider client={qc}>
          <Salida />
        </QueryClientProvider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

const resultadoServidor = (antes: number, despues: number, cantidad: number) => ({
  existencias_antes: antes,
  existencias_despues: despues,
  cantidad,
  created_at: new Date(2026, 9, 12, 9, 15).toISOString(),
});

describe("Salida", () => {
  beforeEach(() => {
    mockRegistrar.mockReset();
    mockReplace.mockReset();
    mockBack.mockReset();
    mockPuedeVolver = true;
    mockParams = { productoId: "p1" };
    mockProducto = { ...base };
    mockObtener.mockReset();
    mockObtener.mockImplementation(async () => mockProducto);
  });

  it("rechaza una cantidad mayor a las existencias", async () => {
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "6");
    expect(screen.getByRole("alert")).toHaveTextContent("La cantidad supera las existencias disponibles (5 unid.).");
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeDisabled();
  });

  it("formatea las existencias decimales en el error", async () => {
    mockProducto = { ...base, unidad: "kilogramo", existencias: 2.5 };
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "3");
    expect(screen.getByText("La cantidad supera las existencias disponibles (2.5 kg).")).toBeTruthy();
  });

  it("deshabilita el botón sin motivo y lo habilita con motivo", async () => {
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "2");
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeEnabled();
  });

  it("preselecciona el motivo recibido por parámetro", async () => {
    mockParams = { productoId: "p1", motivo: "caducidad" };
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "1");
    expect(screen.getByRole("button", { name: "Registrar salida" })).toBeEnabled();
  });

  it("avisa antes de registrar si la salida llega al punto de pedido", async () => {
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "3");
    expect(
      screen.getByText("Con esta salida el producto llegará a su punto de pedido y se enviará una alerta al administrador."),
    ).toBeTruthy();
  });

  it("registra y muestra el resultado con alerta", async () => {
    mockRegistrar.mockResolvedValue(resultadoServidor(5, 2, 3));
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Daño" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "3");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar salida" }));
    expect(await screen.findByText("¡Salida registrada!")).toBeTruthy();
    expect(mockRegistrar).toHaveBeenCalledWith({ productoId: "p1", tipo: "salida", cantidad: 3, motivo: "dano" });
    expect(screen.getByText("−3 unid.")).toBeTruthy();
    expect(screen.getByText("2 unid.")).toBeTruthy();
    expect(screen.getByText(/^Motivo: Daño · \d{2}:\d{2}$/)).toBeTruthy();
    expect(screen.getByText("El producto alcanzó su punto de pedido. Se generó una alerta de reabastecimiento.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar otra salida" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("no muestra el aviso de alerta cuando no corresponde", async () => {
    mockRegistrar.mockResolvedValue(resultadoServidor(5, 4, 1));
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar salida" }));
    expect(await screen.findByText("¡Salida registrada!")).toBeTruthy();
    expect(screen.queryByText(/Se generó una alerta de reabastecimiento/)).toBeNull();
  });

  it("registra una sola vez ante un doble toque", async () => {
    mockRegistrar.mockReturnValue(new Promise(() => {}));
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "1");
    const boton = screen.getByRole("button", { name: "Registrar salida" });
    await fireEvent.press(boton);
    await fireEvent.press(boton);
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
  });

  it("muestra el error de existencias insuficientes del servidor y conserva la cantidad", async () => {
    mockRegistrar.mockRejectedValue(new Error("EXISTENCIAS_INSUFICIENTES"));
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "5");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar salida" }));
    expect(await screen.findByText("La cantidad supera las existencias disponibles.")).toBeTruthy();
    expect(screen.getByLabelText("Cantidad a salir").props.value).toBe("5");
  });

  it("indica que el producto está dado de baja y no permite registrar", async () => {
    mockProducto = { ...base, activo: false };
    await renderizar();
    expect(await screen.findByText("El producto está dado de baja.")).toBeTruthy();
    expect(screen.queryByLabelText("Cantidad a salir")).toBeNull();
    expect(screen.queryByRole("button", { name: "Registrar salida" })).toBeNull();
  });

  it("no muestra el aviso previo cuando la cantidad supera las existencias", async () => {
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "6");
    expect(screen.getByText("La cantidad supera las existencias disponibles (5 unid.).")).toBeTruthy();
    expect(screen.queryByText(/Con esta salida el producto llegará a su punto de pedido/)).toBeNull();
  });

  it("el error de registro se borra al cambiar la cantidad o el motivo", async () => {
    mockRegistrar.mockRejectedValue(new Error("fallo de red"));
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Venta" }));
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar salida" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Cantidad a salir"), "2");
    expect(screen.queryByRole("alert")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Registrar salida" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Daño" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si el producto no carga muestra el error, reintenta y conserva volver", async () => {
    mockObtener.mockRejectedValue(new Error("fallo de red"));
    await renderizar();
    expect(await screen.findByText("No se pudo cargar el producto.")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Registrar salida" })).toBeTruthy();
    mockObtener.mockResolvedValue(mockProducto);
    await fireEvent.press(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Tornillos")).toBeTruthy();
    expect(mockObtener).toHaveBeenCalledTimes(2);
  });

  it("volver regresa atrás o al inicio si no hay historial", async () => {
    await renderizar();
    await screen.findByText("Tornillos");
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockPuedeVolver = false;
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("volver está disponible en el buscador", async () => {
    mockParams = {};
    await renderizar();
    await screen.findByLabelText("Buscar producto por nombre o código");
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
