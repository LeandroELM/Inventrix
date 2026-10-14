import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Entrada from "../../app/(app)/movimientos/entrada";
import { EspacioInferiorContext } from "@/components/BarraInferior";
import { TemaProvider } from "@/tema/TemaProvider";

const mockRegistrar = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockPuedeVolver = true;
let mockParams: { productoId?: string } = {};
const producto = {
  id: "p1",
  nombre: "Harina",
  codigo: "750123",
  unidad: "libra",
  existencias: 60,
  punto_pedido: 10,
  activo: true,
};
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: jest.fn(async () => producto),
  listarProductos: jest.fn(async () => [producto]),
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

async function renderizar(conEspacio = false) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { retry: false, gcTime: 0 } } });
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: conEspacio ? 24 : 0 } }}
    >
      <TemaProvider>
        <QueryClientProvider client={qc}>
          <EspacioInferiorContext.Provider value={conEspacio}>
            <Entrada />
          </EspacioInferiorContext.Provider>
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

describe("Entrada", () => {
  beforeEach(() => {
    mockRegistrar.mockReset();
    mockReplace.mockReset();
    mockBack.mockReset();
    mockPuedeVolver = true;
    mockParams = {};
  });

  it("sin producto muestra el buscador y la píldora de ingreso", async () => {
    await renderizar();
    expect(await screen.findByLabelText("Buscar producto por nombre o código")).toBeTruthy();
    expect(screen.getByText("+ Ingreso")).toBeTruthy();
  });

  it("deja espacio final para la barra y Trix", async () => {
    mockParams = { productoId: "p1" };
    await renderizar(true);
    await screen.findByText("Harina");
    const estilo = StyleSheet.flatten(screen.getByTestId("contenido-principal").props.contentContainerStyle);
    expect(estilo.paddingBottom).toBe(16 + 162);
  });

  it("proyecta las existencias, registra y muestra el resultado", async () => {
    mockParams = { productoId: "p1" };
    mockRegistrar.mockResolvedValue(resultadoServidor(60, 70, 10));
    await renderizar();
    await screen.findByText("Harina");
    expect(screen.getByText("Solo se permiten cantidades positivas.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Cantidad a ingresar"), "10");
    expect(screen.getByText("70 lb")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Registrar entrada" }));
    expect(await screen.findByText("¡Entrada registrada!")).toBeTruthy();
    expect(mockRegistrar).toHaveBeenCalledWith({ productoId: "p1", tipo: "entrada", cantidad: 10 });
    expect(screen.getByText("+10 lb")).toBeTruthy();
    expect(screen.getByText("Código 750123")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar otra entrada" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Volver al inicio" }));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("Registrar otra entrada vuelve al buscador", async () => {
    mockParams = { productoId: "p1" };
    mockRegistrar.mockResolvedValue(resultadoServidor(60, 61, 1));
    await renderizar();
    await screen.findByText("Harina");
    await fireEvent.changeText(screen.getByLabelText("Cantidad a ingresar"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar entrada" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Registrar otra entrada" }));
    expect(await screen.findByLabelText("Buscar producto por nombre o código")).toBeTruthy();
  });
});
