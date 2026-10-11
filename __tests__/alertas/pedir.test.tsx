import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Pedir from "../../app/(app)/administracion/pedir";

const mockPush = jest.fn();
const mockListar = jest.fn();
jest.mock("@/features/alertas/api", () => ({
  listarAPedir: (...args: unknown[]) => mockListar(...args),
}));
jest.mock("@/features/inicio/api", () => ({ contarAlertasNoLeidas: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: "admin" } }),
}));

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <Pedir />
    </QueryClientProvider>,
  );
}

describe("Productos a pedir", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockListar.mockResolvedValue([
      { id: "p1", nombre: "Harina", codigo: "H1", unidad: "kilogramo", existencias: 1.5, punto_pedido: 2 },
      { id: "p2", nombre: "Aceite", codigo: null, unidad: "litro", existencias: 0, punto_pedido: 3 },
      { id: "p3", nombre: "Sal", codigo: "S1", unidad: "unidad", existencias: 1000, punto_pedido: 1200 },
    ]);
  });

  it("muestra aviso, 3 filas formateadas y la nota", async () => {
    await renderizar();
    expect(await screen.findByText("Harina")).toBeTruthy();
    expect(screen.getByText("Estos productos alcanzaron su punto de pedido.")).toBeTruthy();
    expect(screen.getByText("1.5 kg")).toBeTruthy();
    expect(screen.getByText("2 kg")).toBeTruthy();
    expect(screen.getByText("0 L")).toBeTruthy();
    expect(screen.getByText("1,000 unid.")).toBeTruthy();
    expect(screen.getByText("1,200 unid.")).toBeTruthy();
    expect(screen.getByText("Esta versión no genera órdenes de compra.")).toBeTruthy();
  });

  it("al tocar una fila abre la ficha del producto", async () => {
    await renderizar();
    await fireEvent.press(await screen.findByRole("button", { name: "Aceite" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/administracion/producto/[id]", params: { id: "p2" } });
  });
});
