import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BuscadorProducto } from "@/features/productos/BuscadorProducto";
import { detalleProducto } from "@/features/productos/unidades";
import { TemaProvider } from "@/tema/TemaProvider";

const mockPush = jest.fn();
const mockUseProductos = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
}));
jest.mock("@/features/productos/hooks", () => ({ useProductos: (...a: unknown[]) => mockUseProductos(...a) }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const prod = (id: string, nombre: string, existencias: number) => ({
  id,
  nombre,
  codigo: `C-${id}`,
  unidad: "kilogramo" as const,
  existencias,
  punto_pedido: 5,
  activo: true,
});

async function montar(props: { escanearDestino?: string } = {}, onElegir = jest.fn()) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <BuscadorProducto onElegir={onElegir} {...props} />
      </TemaProvider>
    </SafeAreaProvider>,
  );
  return onElegir;
}

describe("BuscadorProducto", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUseProductos.mockReset();
    mockUseProductos.mockReturnValue({ data: [prod("a", "Harina", 20), prod("b", "Aceite", 5)], isLoading: false });
  });

  it("lista los productos como FilaProducto", async () => {
    await montar();
    expect(screen.getByText("Harina")).toBeTruthy();
    expect(screen.getByText(detalleProducto("C-a", "kilogramo"))).toBeTruthy();
  });

  it("al tocar un producto llama a onElegir", async () => {
    const onElegir = await montar();
    await fireEvent.press(screen.getByLabelText("Harina, 20 kg, Disponible"));
    expect(onElegir).toHaveBeenCalledWith("a", "Harina");
  });

  it("sin resultados muestra el mensaje", async () => {
    mockUseProductos.mockReturnValue({ data: [], isLoading: false });
    await montar();
    expect(screen.getByText("No hay productos que coincidan.")).toBeTruthy();
  });

  it("el campo tiene la etiqueta de la spec y busca con debounce", async () => {
    await montar();
    await fireEvent.changeText(screen.getByLabelText("Buscar producto por nombre o código"), "har");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(mockUseProductos).toHaveBeenLastCalledWith({ texto: "har" });
  });

  it("muestra solo 20 resultados", async () => {
    mockUseProductos.mockReturnValue({
      data: Array.from({ length: 25 }, (_, i) => prod(`p${i}`, `Prod${i}`, 10)),
      isLoading: false,
    });
    await montar();
    expect(screen.getByText("Prod19")).toBeTruthy();
    expect(screen.queryByText("Prod20")).toBeNull();
  });

  it("el botón de escanear abre el escáner con su destino", async () => {
    await montar({ escanearDestino: "salida" });
    await fireEvent.press(screen.getByLabelText("Escanear código"));
    expect(mockPush).toHaveBeenCalledWith("/escaner?destino=salida");
  });

  it("sin escanearDestino no hay botón de escanear", async () => {
    await montar();
    expect(screen.queryByLabelText("Escanear código")).toBeNull();
  });
});
