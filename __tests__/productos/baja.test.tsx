import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import Baja from "../../app/(app)/administracion/baja";

const mockDarBaja = jest.fn();
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: jest.fn().mockResolvedValue({
    id: "p1", nombre: "Aceite", codigo: "F1", unidad: "unidad", existencias: 12, punto_pedido: 1, activo: true,
  }),
  darBajaProducto: (...args: unknown[]) => mockDarBaja(...args),
  listarProductos: jest.fn(),
  ultimosMovimientos: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ productoId: "p1" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: "admin" } }),
}));

async function abrir() {
  mockDarBaja.mockReset().mockResolvedValue({});
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={qc}>
      <Baja />
    </QueryClientProvider>,
  );
  await screen.findByText("Código: F1");
}

describe("Baja de producto", () => {
  it("muestra los cuatro motivos de la lista", async () => {
    await abrir();
    for (const m of ["Descontinuado", "Ya no se vende", "Error de registro", "Otro"]) {
      expect(screen.getByRole("button", { name: m })).toBeTruthy();
    }
  });

  it("pide detalle solo con Otro y deshabilita confirmar si está vacío", async () => {
    await abrir();
    expect(screen.queryByLabelText("Detalle")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Otro" }));
    expect(screen.getByLabelText("Detalle")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dar de baja" })).toBeDisabled();
  });

  it("advierte las existencias sin bloquear la baja", async () => {
    await abrir();
    expect(screen.getByText("Este producto aún tiene 12 unid.; quedarán en cero.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Descontinuado" }));
    expect(screen.getByRole("button", { name: "Dar de baja" })).not.toBeDisabled();
  });

  it("confirma con un motivo de la lista", async () => {
    await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Descontinuado" }));
    await fireEvent.press(screen.getByRole("button", { name: "Dar de baja" }));
    await fireEvent.press(screen.getByText("Confirmar baja"));
    await screen.findByText("Producto dado de baja correctamente");
    expect(mockDarBaja).toHaveBeenCalledWith("p1", "descontinuado", undefined);
  });

  it("confirma con Otro y detalle", async () => {
    await abrir();
    await fireEvent.press(screen.getByRole("button", { name: "Otro" }));
    await fireEvent.changeText(screen.getByLabelText("Detalle"), "Cerró el proveedor");
    await fireEvent.press(screen.getByRole("button", { name: "Dar de baja" }));
    await fireEvent.press(screen.getByText("Confirmar baja"));
    await screen.findByText("Producto dado de baja correctamente");
    expect(mockDarBaja).toHaveBeenCalledWith("p1", "otro", "Cerró el proveedor");
  });
});
