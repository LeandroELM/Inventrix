import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Editar from "../../app/(app)/administracion/producto/[id]/editar";

const mockActualizar = jest.fn();
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: jest.fn().mockResolvedValue({
    id: "p1", nombre: "Aceite", codigo: "F1", unidad: "litro", existencias: 2.5, punto_pedido: 1, activo: true,
  }),
  actualizarProducto: (...args: unknown[]) => mockActualizar(...args),
  listarProductos: jest.fn(),
  ultimosMovimientos: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "p1" }),
  useRouter: () => ({ back: jest.fn() }),
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: "admin" } }),
}));

describe("Editar producto", () => {
  it("rechaza pasar a unidad entera con existencias fraccionarias", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await render(
      <QueryClientProvider client={qc}>
        <Editar />
      </QueryClientProvider>,
    );
    await screen.findByText("Código: F1");
    await fireEvent.press(screen.getByRole("button", { name: "Unidad" }));
    await fireEvent.press(screen.getByText("Guardar cambios"));
    expect(await screen.findByText(/unidad entera/)).toBeTruthy();
    expect(mockActualizar).not.toHaveBeenCalled();
  });
});
