import { fireEvent, render, screen } from "@testing-library/react-native";
import Movimientos from "../../app/(app)/movimientos/index";
import { TemaProvider } from "@/tema/TemaProvider";

const mockUseHistorial = jest.fn();
const mockUseProducto = jest.fn();
const mockSetParams = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ setParams: mockSetParams, push: jest.fn() }),
  useIsFocused: () => true,
}));
jest.mock("@/features/movimientos/hooks", () => ({ useHistorial: (...a: unknown[]) => mockUseHistorial(...a) }));
jest.mock("@/features/productos/hooks", () => ({ useProducto: (...a: unknown[]) => mockUseProducto(...a) }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

const fila = {
  id: 1,
  created_at: new Date().toISOString(),
  producto_id: "p1",
  producto: "Harina",
  codigo: "C-1",
  unidad: "kilogramo",
  tipo: "entrada",
  cantidad: 3,
  motivo: null,
  existencias_antes: 17,
  existencias_despues: 20,
  usuario_id: "u1",
  usuario: "ana.lopez",
};

async function montar(filas: unknown[] = [fila]) {
  mockUseProducto.mockReturnValue({ data: { id: "p1", nombre: "Harina" } });
  mockUseHistorial.mockReturnValue({
    data: { pages: [filas] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  });
  await render(
    <TemaProvider>
      <Movimientos />
    </TemaProvider>,
  );
}

describe("Historial filtrado por producto", () => {
  beforeEach(() => {
    mockUseHistorial.mockReset();
    mockSetParams.mockReset();
    mockUseProducto.mockReset();
  });

  it("sin productoId no filtra ni muestra aviso", async () => {
    mockParams = {};
    await montar();
    expect(mockUseHistorial).toHaveBeenLastCalledWith(expect.objectContaining({ productoId: undefined }));
    expect(screen.queryByText("Quitar filtro")).toBeNull();
  });

  it("con productoId lo pasa al filtro y Quitar filtro lo elimina", async () => {
    mockParams = { productoId: "p1" };
    await montar();
    expect(mockUseHistorial).toHaveBeenLastCalledWith(expect.objectContaining({ productoId: "p1" }));
    expect(screen.getByText("Mostrando: Harina")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Quitar filtro"));
    expect(mockSetParams).toHaveBeenCalledWith({ productoId: undefined });
  });

  it("muestra el nombre del producto aunque no tenga movimientos", async () => {
    mockParams = { productoId: "p1" };
    await montar([]);
    expect(screen.getByText("Mostrando: Harina")).toBeTruthy();
  });
});
