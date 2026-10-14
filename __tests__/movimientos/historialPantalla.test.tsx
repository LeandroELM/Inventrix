import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Movimientos from "../../app/(app)/movimientos/index";
import type { FilaHistorial } from "@/features/movimientos/api";
import { TemaProvider } from "@/tema/TemaProvider";

const mockPush = jest.fn();
const mockListar = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush, setParams: jest.fn(), canGoBack: () => false, back: jest.fn() }),
  useIsFocused: () => true,
}));
jest.mock("@/features/movimientos/api", () => ({
  ...jest.requireActual("@/features/movimientos/api"),
  listarHistorial: (...a: unknown[]) => mockListar(...a),
}));
jest.mock("@/features/productos/hooks", () => ({ useProducto: () => ({ data: undefined }) }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const hoy = new Date();
const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1, 12, 0);

const FILA_HOY: FilaHistorial = {
  id: 2,
  created_at: hoy.toISOString(),
  producto_id: "p1",
  producto: "Frijol rojo",
  codigo: "F-1",
  unidad: "libra",
  tipo: "salida",
  cantidad: 5,
  motivo: "venta",
  existencias_antes: 60,
  existencias_despues: 55,
  usuario_id: "u1",
  usuario: "Carlos M.",
};
const FILA_AYER: FilaHistorial = {
  ...FILA_HOY,
  id: 1,
  created_at: ayer.toISOString(),
  producto_id: "p2",
  producto: "Arroz",
  tipo: "entrada",
  motivo: null,
  existencias_antes: 10,
  existencias_despues: 15,
};

async function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <QueryClientProvider client={qc}>
          <Movimientos />
        </QueryClientProvider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("Pantalla de Historial", () => {
  beforeEach(() => {
    mockListar.mockReset();
    mockPush.mockReset();
    mockListar.mockResolvedValue([FILA_HOY, FILA_AYER]);
  });

  it("muestra el encabezado y los encabezados de dia", async () => {
    await montar();
    expect(screen.getByRole("header", { name: "Historial de movimientos" })).toBeTruthy();
    expect(await screen.findByText("HOY")).toBeTruthy();
    expect(screen.getByText("AYER")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volver" })).toBeNull();
  });

  it("vacio sin filtros", async () => {
    mockListar.mockResolvedValue([]);
    await montar();
    expect(await screen.findByText("Sin movimientos.")).toBeTruthy();
  });

  it("Salidas filtra por salida", async () => {
    await montar();
    await screen.findByText("HOY");
    await fireEvent.press(screen.getByRole("button", { name: "Salidas" }));
    await screen.findByText("HOY");
    expect(mockListar).toHaveBeenCalledWith(expect.objectContaining({ tipo: "salida" }));
  });

  it("tocar una fila abre el detalle y Ver producto navega", async () => {
    await montar();
    await screen.findByText("HOY");
    await fireEvent.press(screen.getByText("Frijol rojo"));
    expect(await screen.findByText("60 lb → 55 lb")).toBeTruthy();
    await fireEvent.press(screen.getByText("Ver producto"));
    expect(mockPush).toHaveBeenCalledWith("/administracion/producto/p1");
    expect(screen.queryByText("60 lb → 55 lb")).toBeNull();
  });

  it("error con Reintentar", async () => {
    mockListar.mockRejectedValue(new Error("falla"));
    await montar();
    expect(await screen.findByText("No se pudo cargar el historial.")).toBeTruthy();
    const llamadas = mockListar.mock.calls.length;
    await fireEvent.press(screen.getByText("Reintentar"));
    await screen.findByText("No se pudo cargar el historial.");
    expect(mockListar.mock.calls.length).toBeGreaterThan(llamadas);
  });

  it("vacio con busqueda", async () => {
    mockListar.mockResolvedValue([]);
    await montar();
    await screen.findByText("Sin movimientos.");
    await fireEvent.changeText(screen.getByLabelText("Buscar por producto o código"), "zz");
    // El debounce de 300 ms vence con temporizadores reales antes de que findBy agote su espera.
    expect(await screen.findByText("No hay movimientos que coincidan.")).toBeTruthy();
    expect(mockListar).toHaveBeenLastCalledWith(expect.objectContaining({ texto: "zz" }));
  });
});
