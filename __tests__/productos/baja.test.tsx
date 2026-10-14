import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Baja from "../../app/(app)/administracion/baja";
import { formatearCantidad } from "@/features/productos/unidades";
import { TemaProvider } from "@/tema/TemaProvider";

const mockDarBaja = jest.fn();
const mockReplace = jest.fn();
const mockObtener = jest.fn();
const base = {
  id: "p1", nombre: "Aceite", codigo: "F1", unidad: "unidad", existencias: 12, punto_pedido: 1, activo: true,
};
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: (...args: unknown[]) => mockObtener(...args),
  darBajaProducto: (...args: unknown[]) => mockDarBaja(...args),
  listarProductos: jest.fn(),
  ultimosMovimientos: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ productoId: "p1" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
  useIsFocused: () => true,
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: "admin" } }),
}));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

async function abrir(producto: Record<string, unknown> = base) {
  mockDarBaja.mockReset().mockResolvedValue({});
  mockReplace.mockReset();
  mockObtener.mockReset().mockResolvedValue(producto);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <QueryClientProvider client={qc}>
          <Baja />
        </QueryClientProvider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText("Aceite");
}

const chip = (nombre: string) => screen.getByRole("button", { name: nombre });

describe("Baja de producto", () => {
  it("muestra los cuatro motivos sin ninguno elegido y la baja deshabilitada", async () => {
    await abrir();
    for (const m of ["Descontinuado", "Ya no se vende", "Error de registro", "Otro"]) {
      expect(chip(m).props.accessibilityState?.selected).toBe(false);
    }
    expect(chip("Dar de baja")).toBeDisabled();
  });

  it("pide detalle solo con Otro y mantiene deshabilitado si está vacío", async () => {
    await abrir();
    expect(screen.queryByLabelText("Detalle")).toBeNull();
    await fireEvent.press(chip("Otro"));
    expect(screen.getByLabelText("Detalle")).toBeTruthy();
    expect(chip("Dar de baja")).toBeDisabled();
  });

  it("advierte las existencias sin bloquear la baja", async () => {
    await abrir();
    expect(
      screen.getByText(
        `Este producto aún tiene ${formatearCantidad(12, "unidad")} en existencia; al darlo de baja quedarán en cero y el historial lo registrará.`,
      ),
    ).toBeTruthy();
    await fireEvent.press(chip("Descontinuado"));
    expect(chip("Dar de baja")).not.toBeDisabled();
  });

  it("pide confirmación y da de baja con un motivo de la lista", async () => {
    await abrir();
    await fireEvent.press(chip("Descontinuado"));
    await fireEvent.press(chip("Dar de baja"));
    expect(
      screen.getByText('¿Dar de baja "Aceite"? Dejará de aparecer en Existencias y no podrá usarse en movimientos nuevos.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText("Confirmar baja"));
    await screen.findByText("Producto dado de baja");
    expect(mockDarBaja).toHaveBeenCalledWith("p1", "descontinuado", undefined);
    expect(screen.getByText("Motivo: Descontinuado")).toBeTruthy();
    expect(screen.getByText("Existencias retiradas")).toBeTruthy();
    expect(screen.getByText(formatearCantidad(12, "unidad"))).toBeTruthy();
  });

  it("un doble toque en Confirmar baja llama a la mutación una sola vez", async () => {
    await abrir();
    mockDarBaja.mockImplementation(() => new Promise((r) => setTimeout(() => r({}), 20)));
    await fireEvent.press(chip("Descontinuado"));
    await fireEvent.press(chip("Dar de baja"));
    const confirmar = screen.getByText("Confirmar baja");
    await fireEvent.press(confirmar);
    await fireEvent.press(confirmar);
    await screen.findByText("Producto dado de baja");
    expect(mockDarBaja).toHaveBeenCalledTimes(1);
  });

  it("con Otro envía el detalle y lo muestra en el resultado", async () => {
    await abrir();
    await fireEvent.press(chip("Otro"));
    await fireEvent.changeText(screen.getByLabelText("Detalle"), "Ya no llega");
    await fireEvent.press(chip("Dar de baja"));
    await fireEvent.press(screen.getByText("Confirmar baja"));
    await screen.findByText("Producto dado de baja");
    expect(mockDarBaja).toHaveBeenCalledWith("p1", "otro", "Ya no llega");
    expect(screen.getByText("Motivo: Otro · Ya no llega")).toBeTruthy();
  });

  it("el resultado vuelve a Administración", async () => {
    await abrir();
    await fireEvent.press(chip("Descontinuado"));
    await fireEvent.press(chip("Dar de baja"));
    await fireEvent.press(screen.getByText("Confirmar baja"));
    await screen.findByText("Producto dado de baja");
    await fireEvent.press(screen.getByText("Volver a Administración"));
    expect(mockReplace).toHaveBeenCalledWith("/administracion");
  });

  it("si la baja falla cierra la hoja, muestra el error y conserva el motivo", async () => {
    await abrir();
    mockDarBaja.mockRejectedValue(new Error("NO_AUTORIZADO"));
    await fireEvent.press(chip("Descontinuado"));
    await fireEvent.press(chip("Dar de baja"));
    await fireEvent.press(screen.getByText("Confirmar baja"));
    await screen.findByText("No tienes permiso para realizar esta acción.");
    await waitFor(() => expect(screen.queryByText("Confirmar baja")).toBeNull());
    expect(chip("Descontinuado").props.accessibilityState?.selected).toBe(true);
  });

  it("un producto inactivo solo muestra el aviso", async () => {
    await abrir({ ...base, activo: false });
    expect(screen.getByText("El producto ya está dado de baja.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dar de baja" })).toBeNull();
  });
});
