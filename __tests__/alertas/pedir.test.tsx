import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import Pedir from "../../app/(app)/administracion/pedir";

const mockPush = jest.fn();
const mockListar = jest.fn();
jest.mock("@/features/alertas/api", () => ({
  listarAPedir: (...args: unknown[]) => mockListar(...args),
}));
jest.mock("@/features/inicio/api", () => ({ contarAlertasNoLeidas: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
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

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <SafeAreaProvider initialMetrics={METRICAS}>
        <Pedir />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

function anchoDe(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style).width;
}

describe("Productos a pedir", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockListar.mockResolvedValue([
      {
        id: "p1",
        nombre: "Harina",
        codigo: "H1",
        unidad: "kilogramo",
        existencias: 1.5,
        punto_pedido: 2,
      },
      {
        id: "p2",
        nombre: "Aceite",
        codigo: null,
        unidad: "litro",
        existencias: 0,
        punto_pedido: 3,
      },
      {
        id: "p3",
        nombre: "Sal",
        codigo: "S1",
        unidad: "unidad",
        existencias: 1000,
        punto_pedido: 1200,
      },
    ]);
  });

  it("muestra el resumen, las filas formateadas y la nota", async () => {
    await renderizar();
    expect(await screen.findByText("Harina")).toBeTruthy();
    expect(screen.getByText("Productos a pedir")).toBeTruthy();
    expect(screen.getByText("3 productos")).toBeTruthy();
    expect(screen.getByText("Alcanzaron o están por debajo de su punto de pedido.")).toBeTruthy();
    expect(screen.getAllByText("Existencias").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Punto de pedido").length).toBeGreaterThan(0);
    expect(screen.getByText("1.5 kg")).toBeTruthy();
    expect(screen.getByText("2 kg")).toBeTruthy();
    expect(screen.getByText("0 L")).toBeTruthy();
    expect(screen.getByText("1,000 unid.")).toBeTruthy();
    expect(screen.getByText("1,200 unid.")).toBeTruthy();
    expect(
      screen.getByText(
        "Esta versión no genera órdenes de compra. La decisión de pedir corresponde al responsable de la empresa.",
      ),
    ).toBeTruthy();
  });

  it("dibuja una barra por fila con el ancho proporcional", async () => {
    await renderizar();
    await screen.findByText("Harina");
    expect(screen.getAllByTestId(/^barra-/)).toHaveLength(3);
    expect(anchoDe("barra-p1")).toBe("75%");
    expect(anchoDe("barra-p2")).toBe("0%");
  });

  it("usa singular con un solo producto", async () => {
    mockListar.mockResolvedValue([
      {
        id: "p1",
        nombre: "Harina",
        codigo: null,
        unidad: "kilogramo",
        existencias: 1,
        punto_pedido: 2,
      },
    ]);
    await renderizar();
    expect(await screen.findByText("1 producto")).toBeTruthy();
  });

  it("con punto de pedido 0 la barra está al 100 %", async () => {
    mockListar.mockResolvedValue([
      {
        id: "p9",
        nombre: "Azúcar",
        codigo: null,
        unidad: "kilogramo",
        existencias: 0,
        punto_pedido: 0,
      },
    ]);
    await renderizar();
    await screen.findByText("Azúcar");
    expect(anchoDe("barra-p9")).toBe("100%");
  });

  it("muestra el estado vacío", async () => {
    mockListar.mockResolvedValue([]);
    await renderizar();
    expect(await screen.findByText("Ningún producto está en su punto de pedido.")).toBeTruthy();
  });

  it("al tocar una fila abre la ficha del producto", async () => {
    await renderizar();
    await fireEvent.press(await screen.findByRole("button", { name: "Aceite" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/administracion/producto/[id]",
      params: { id: "p2" },
    });
  });
});
