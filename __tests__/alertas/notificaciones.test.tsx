import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import Notificaciones from "../../app/notificaciones";

const mockListar = jest.fn();
const mockMarcar = jest.fn();
jest.mock("@/features/alertas/api", () => ({
  listarAlertas: (...args: unknown[]) => mockListar(...args),
  marcarLeidas: (...args: unknown[]) => mockMarcar(...args),
}));
jest.mock("@/features/inicio/api", () => ({ contarAlertasNoLeidas: jest.fn().mockResolvedValue(1) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: "admin" } }),
}));

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <Notificaciones />
    </QueryClientProvider>,
  );
}

describe("Notificaciones", () => {
  beforeEach(() => {
    mockMarcar.mockReset().mockResolvedValue(undefined);
    mockListar.mockResolvedValue([
      { id: 2, producto: "Harina", unidad: "kilogramo", existencias: 1, punto_pedido: 2, leida: false, created_at: "2026-10-10T15:30:00Z" },
      { id: 1, producto: "Aceite", unidad: "litro", existencias: 0, punto_pedido: 3, leida: true, created_at: "2026-10-09T12:00:00Z" },
    ]);
  });

  it("lista las alertas con producto, cantidades y estado", async () => {
    await renderizar();
    expect(await screen.findByText("Harina")).toBeTruthy();
    expect(screen.getByText("Existencias: 1 kg · Punto de pedido: 2 kg")).toBeTruthy();
    expect(screen.getByText("No leída")).toBeTruthy();
    expect(screen.getByText("Leída")).toBeTruthy();
  });

  it("marca todas como leídas con el botón", async () => {
    await renderizar();
    // El botón está deshabilitado hasta que cargan las alertas no leídas.
    await screen.findByText("Harina");
    await fireEvent.press(screen.getByRole("button", { name: "Marcar todas como leídas" }));
    await waitFor(() => expect(mockMarcar).toHaveBeenCalledTimes(1));
  });

  it("muestra estado vacío", async () => {
    mockListar.mockResolvedValue([]);
    await renderizar();
    expect(await screen.findByText("No hay alertas.")).toBeTruthy();
  });
});
