import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Ficha from "../../app/(app)/administracion/producto/[id]";
import { TemaProvider } from "@/tema/TemaProvider";

const mockPush = jest.fn();
const mockUseProducto = jest.fn();
const mockUseMovimientos = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "p1" }),
  useIsFocused: () => true,
}));
jest.mock("@/features/productos/hooks", () => ({
  useProducto: (...a: unknown[]) => mockUseProducto(...a),
  useUltimosMovimientos: (...a: unknown[]) => mockUseMovimientos(...a),
}));
jest.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const producto = (extra: Record<string, unknown> = {}) => ({
  id: "p1",
  nombre: "Harina",
  codigo: "C-1",
  unidad: "kilogramo",
  existencias: 20,
  punto_pedido: 5,
  activo: true,
  motivo_baja: null,
  detalle_baja: null,
  ...extra,
});

const MOVIMIENTOS = [
  {
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
  },
];

function Arbol() {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <Ficha />
      </TemaProvider>
    </SafeAreaProvider>
  );
}

async function montar(rol: "admin" | "operativo", p = producto()) {
  mockUseAuth.mockReturnValue({ perfil: { id: "1", usuario: "a", nombre: "Ana", rol } });
  mockUseProducto.mockReturnValue({ data: p, isLoading: false, error: null, refetch: jest.fn() });
  mockUseMovimientos.mockReturnValue({ data: MOVIMIENTOS, isLoading: false, error: null });
  return render(<Arbol />);
}

describe("Ficha del producto", () => {
  beforeEach(() => mockPush.mockReset());

  it("el administrador ve el botón Editar producto", async () => {
    await montar("admin");
    expect(screen.getByLabelText("Editar producto")).toBeTruthy();
    expect(screen.queryByText("La edición de datos maestros es exclusiva del Administrador.")).toBeNull();
    expect(screen.getByText("Código: C-1")).toBeTruthy();
  });

  it("el operativo no ve Editar producto y sí el aviso", async () => {
    await montar("operativo");
    expect(screen.queryByLabelText("Editar producto")).toBeNull();
    expect(screen.getByText("La edición de datos maestros es exclusiva del Administrador.")).toBeTruthy();
  });

  it("sin código muestra Sin código", async () => {
    await montar("admin", producto({ codigo: null }));
    expect(screen.getByText("Sin código")).toBeTruthy();
  });

  it("Entrada y Salida navegan con el productoId", async () => {
    await montar("admin");
    await fireEvent.press(screen.getByLabelText("Entrada"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/movimientos/entrada", params: { productoId: "p1" } });
    await fireEvent.press(screen.getByLabelText("Salida"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/movimientos/salida", params: { productoId: "p1" } });
  });

  it("producto dado de baja muestra motivo y detalle y no ofrece movimientos ni edición", async () => {
    await montar("admin", producto({ activo: false, motivo_baja: "otro", detalle_baja: "Cerró el proveedor" }));
    expect(screen.getByText("Dado de baja")).toBeTruthy();
    expect(screen.getByText("Motivo: Otro")).toBeTruthy();
    expect(screen.getByText("Detalle: Cerró el proveedor")).toBeTruthy();
    expect(screen.queryByLabelText("Entrada")).toBeNull();
    expect(screen.queryByLabelText("Salida")).toBeNull();
    expect(screen.queryByLabelText("Editar producto")).toBeNull();
  });

  it("dado de baja sin detalle no muestra Detalle", async () => {
    await montar("admin", producto({ activo: false, motivo_baja: "descontinuado", detalle_baja: null }));
    expect(screen.getByText("Motivo: Descontinuado")).toBeTruthy();
    expect(screen.queryByText(/Detalle:/)).toBeNull();
  });

  it("Ver todo abre el historial filtrado por el producto", async () => {
    await montar("admin");
    expect(screen.getByText("Movimientos del producto")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Ver todo"));
    expect(mockPush).toHaveBeenCalledWith("/movimientos?productoId=p1");
  });

  it("conserva los datos si una recarga falla", async () => {
    const { rerender } = await montar("admin");
    mockUseProducto.mockReturnValue({ data: producto(), isLoading: false, error: new Error("falla"), refetch: jest.fn() });
    await rerender(<Arbol />);
    expect(screen.getAllByText("Harina").length).toBeGreaterThan(0);
    expect(screen.queryByText("Reintentar")).toBeNull();
  });
});
