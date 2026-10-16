import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Notificaciones from "../../app/notificaciones";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockListar = jest.fn();
const mockMarcar = jest.fn();
jest.mock("@/features/alertas/api", () => ({
  listarAlertas: (...args: unknown[]) => mockListar(...args),
  marcarLeidas: (...args: unknown[]) => mockMarcar(...args),
}));
jest.mock("@/features/inicio/api", () => ({
  contarAlertasNoLeidas: jest.fn().mockResolvedValue(1),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useIsFocused: () => true,
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: "admin" } }),
}));

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

let clienteActual: QueryClient;

function renderizar() {
  const qc = (clienteActual = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  }));
  return render(
    <QueryClientProvider client={qc}>
      <SafeAreaProvider initialMetrics={METRICAS}>
        <Notificaciones />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

const hoy = new Date().toISOString();
const hace3Dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

describe("Notificaciones", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockMarcar.mockReset().mockResolvedValue(undefined);
    mockListar.mockResolvedValue([
      {
        id: 2,
        producto: "Harina",
        unidad: "kilogramo",
        existencias: 1,
        punto_pedido: 2,
        leida: false,
        created_at: hoy,
      },
      {
        id: 1,
        producto: "Aceite",
        unidad: "litro",
        existencias: 0,
        punto_pedido: 3,
        leida: true,
        created_at: hace3Dias,
      },
    ]);
  });

  it("lista las alertas con producto, cantidades y estado", async () => {
    await renderizar();
    expect(await screen.findByText("Reabastecer: Harina")).toBeTruthy();
    expect(screen.getByText("Quedan 1 kg y su punto de pedido es 2 kg.")).toBeTruthy();
    expect(screen.getByText("Reabastecer: Aceite")).toBeTruthy();
    expect(screen.getByText("Quedan 0 L y su punto de pedido es 3 L.")).toBeTruthy();
    expect(screen.getAllByTestId("punto-no-leida")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^No leída\. Reabastecer: Harina/ })).toBeTruthy();
  });

  it("agrupa por día y omite los grupos vacíos", async () => {
    await renderizar();
    await screen.findByText("Reabastecer: Harina");
    expect(screen.getByText("HOY")).toBeTruthy();
    expect(screen.getByText("ANTERIORES")).toBeTruthy();
    expect(screen.queryByText("AYER")).toBeNull();
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeTruthy();
    expect(screen.getByText(/^\d{2}\/\d{2}$/)).toBeTruthy();
  });

  it("marca todas como leídas con la acción del encabezado", async () => {
    await renderizar();
    // La acción está deshabilitada hasta que cargan las alertas no leídas.
    await screen.findByText("Reabastecer: Harina");
    await fireEvent.press(screen.getByRole("button", { name: "Marcar leídas" }));
    await waitFor(() => expect(mockMarcar).toHaveBeenCalledTimes(1));
  });

  it("deshabilita Marcar leídas si no hay no leídas", async () => {
    mockListar.mockResolvedValue([
      {
        id: 1,
        producto: "Aceite",
        unidad: "litro",
        existencias: 0,
        punto_pedido: 3,
        leida: true,
        created_at: hoy,
      },
    ]);
    await renderizar();
    await screen.findByText("Reabastecer: Aceite");
    expect(screen.getByRole("button", { name: "Marcar leídas" })).toBeDisabled();
    expect(screen.queryByTestId("punto-no-leida")).toBeNull();
  });

  it("al tocar una alerta abre A pedir", async () => {
    await renderizar();
    await fireEvent.press(await screen.findByRole("button", { name: /Reabastecer: Aceite/ }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/administracion/pedir");
    expect(mockBack.mock.invocationCallOrder[0]).toBeLessThan(mockPush.mock.invocationCallOrder[0]);
  });

  it("error de primera carga muestra el mensaje y reintenta", async () => {
    mockListar.mockRejectedValue(new Error("falla"));
    await renderizar();
    expect(await screen.findByText("No se pudieron cargar las notificaciones.")).toBeTruthy();
    mockListar.mockResolvedValue([]);
    await fireEvent.press(screen.getByText("Reintentar"));
    expect(await screen.findByText("No hay alertas.")).toBeTruthy();
  });

  it("si falla una recarga conserva la lista y avisa", async () => {
    await renderizar();
    await screen.findByText("Reabastecer: Harina");
    mockListar.mockRejectedValue(new Error("falla"));
    await act(async () => {
      await clienteActual.refetchQueries({ queryKey: ["alertas"] });
    });
    expect(await screen.findByText("No se pudo actualizar.")).toBeTruthy();
    expect(screen.getByText("Reabastecer: Harina")).toBeTruthy();
  });

  it("muestra estado vacío", async () => {
    mockListar.mockResolvedValue([]);
    await renderizar();
    expect(await screen.findByText("No hay alertas.")).toBeTruthy();
  });
});
