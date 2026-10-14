import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Reportes from "../../app/(app)/administracion/reportes";
import { obtenerInicio } from "@/features/inicio/api";
import { filasDeReporte, obtenerDashboard, obtenerReporte } from "@/features/reportes/api";
import { aFecha } from "@/features/reportes/dashboard";
import { exportarExcel } from "@/features/reportes/excel";
import { TemaProvider } from "@/tema/TemaProvider";

const mockPush = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "Ana", rol: "admin" } }),
}));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: jest.fn(() => false) };
});
jest.mock("@/features/reportes/api", () => ({
  obtenerDashboard: jest.fn(),
  obtenerReporte: jest.fn(),
  filasDeReporte: jest.fn(),
}));
jest.mock("@/features/inicio/api", () => ({
  ...jest.requireActual("@/features/inicio/api"),
  obtenerInicio: jest.fn(),
}));
jest.mock("@/features/reportes/excel", () => ({
  ...jest.requireActual("@/features/reportes/excel"),
  exportarExcel: jest.fn(),
}));
jest.mock("@react-native-community/datetimepicker", () => ({ __esModule: true, default: () => null }));
jest.mock("@/features/productos/BuscadorProducto", () => ({ BuscadorProducto: () => null }));

const DASHBOARD = {
  masVendido: { productoId: "p1", nombre: "Frijol rojo", unidad: "libra", cantidad: 120 },
  menosVendido: null,
  enPuntoPedido: 3,
  totalMovimientos: 42,
  serie: [{ fecha: "2026-10-13", entradas: 4, salidas: 2 }],
};

const INICIO = { productosActivos: 12, resumen: [{ unidad: "libra", total: 120 }], recientes: [] };

async function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <QueryClientProvider client={queryClient}>
        <TemaProvider>
          <Reportes />
        </TemaProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe("Reportes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (obtenerDashboard as jest.Mock).mockResolvedValue(DASHBOARD);
    (obtenerInicio as jest.Mock).mockResolvedValue(INICIO);
    (obtenerReporte as jest.Mock).mockResolvedValue([{ x: 1 }]);
    (filasDeReporte as jest.Mock).mockReturnValue([{ Producto: "Frijol rojo", Cantidad: 5 }]);
    (exportarExcel as jest.Mock).mockResolvedValue(undefined);
  });

  it("muestra indicadores del periodo", async () => {
    await montar();
    expect(await screen.findByText("Más vendido")).toBeTruthy();
    expect(screen.getByText("Frijol rojo")).toBeTruthy();
    expect(screen.getByText("120 lb")).toBeTruthy();
    expect(screen.getByText("Movimientos")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("en el periodo")).toBeTruthy();
  });

  it("sin ventas", async () => {
    (obtenerDashboard as jest.Mock).mockResolvedValue({ ...DASHBOARD, masVendido: null });
    await montar();
    expect(await screen.findAllByText("Sin ventas en el periodo")).toHaveLength(2);
  });

  it("En punto de pedido navega a A pedir", async () => {
    await montar();
    await fireEvent.press(await screen.findByRole("button", { name: /^En punto de pedido/ }));
    expect(mockPush).toHaveBeenCalledWith("/administracion/pedir");
  });

  it("cambiar a 30 días consulta otro rango", async () => {
    await montar();
    await screen.findByText("Más vendido");
    await fireEvent.press(screen.getByRole("button", { name: "30 días" }));
    const hoy = new Date();
    const esperado = aFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 29));
    await waitFor(() => expect(obtenerDashboard).toHaveBeenCalledWith(esperado, aFecha(hoy)));
  });

  it("inventario actual", async () => {
    await montar();
    expect(await screen.findByText("Inventario actual")).toBeTruthy();
    // La tarjeta de lista separa valor y etiqueta en dos textos.
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("productos registrados")).toBeTruthy();
  });

  it("error del dashboard deja exportar", async () => {
    (obtenerDashboard as jest.Mock).mockRejectedValue(new Error("sin conexión"));
    await montar();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Existencias/ })).toBeTruthy();
  });

  it("Existencias exporta directo una sola vez", async () => {
    let terminar: () => void = () => {};
    (exportarExcel as jest.Mock).mockReturnValue(new Promise<void>((r) => (terminar = r)));
    await montar();
    const fila = await screen.findByRole("button", { name: /Existencias/ });
    await fireEvent.press(fila);
    await fireEvent.press(fila);
    expect(await screen.findByText("Exportando…")).toBeTruthy();
    terminar();
    await waitFor(() => expect(screen.queryByText("Exportando…")).toBeNull());
    expect(exportarExcel).toHaveBeenCalledTimes(1);
    expect(obtenerReporte).toHaveBeenCalledWith("existencias");
  });

  it("Entradas abre la hoja", async () => {
    await montar();
    await fireEvent.press(await screen.findByRole("button", { name: /Entradas/ }));
    expect(screen.getByText("Exportar entradas")).toBeTruthy();
  });
});
