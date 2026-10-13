import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Inicio from "../../app/(app)/index";
import { TemaProvider } from "@/tema/TemaProvider";
import type { Inicio as DatosInicio } from "@/features/inicio/api";

const mockPush = jest.fn();
const mockUseInicio = jest.fn();
const mockUseAuth = jest.fn();
const mockAlertas = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/features/inicio/hooks", () => ({ useInicio: (...a: unknown[]) => mockUseInicio(...a) }));
jest.mock("@/features/alertas/hooks", () => ({ useAlertasNoLeidas: () => mockAlertas() }));
jest.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
// Sin animacion: el conteo de NumeroAnimado actualizaria estado fuera de act().
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const ahora = new Date().toISOString();
const movimiento = (id: number, producto: string) => ({
  id,
  created_at: ahora,
  producto_id: `p${id}`,
  producto,
  codigo: null,
  unidad: "kilogramo" as const,
  tipo: "entrada" as const,
  cantidad: 5,
  motivo: null,
  existencias_antes: 0,
  existencias_despues: 5,
  usuario_id: "u1",
  usuario: "Ana",
});
const prod = (id: string, nombre: string) => ({
  id,
  nombre,
  codigo: null,
  unidad: "kilogramo" as const,
  existencias: 1,
  punto_pedido: 3,
});

const base: DatosInicio = {
  productosActivos: 12,
  resumen: [{ unidad: "kilogramo", total: 30 }],
  aPedir: { total: 4, primeros: [prod("a", "Harina"), prod("b", "Aceite"), prod("c", "Sal")] },
  recientes: [movimiento(1, "Azucar"), movimiento(2, "Arroz")],
  hoy: { entradas: 18, salidas: 9 },
};

const cliente = new QueryClient();

async function montar(datos: Partial<{ data: DatosInicio; isError: boolean; isLoading: boolean }>, rol: "admin" | "operativo" = "admin") {
  mockUseAuth.mockReturnValue({ perfil: { id: "1", usuario: "a", nombre: "Ana", rol } });
  mockUseInicio.mockReturnValue({
    data: undefined,
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
    ...datos,
  });
  await render(
    <QueryClientProvider client={cliente}>
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <Inicio />
      </TemaProvider>
    </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

describe("Inicio", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockAlertas.mockReturnValue(2);
  });

  it("administrador: saludo, chips de hoy, alerta, proximos a agotarse y movimientos", async () => {
    await montar({ data: base });
    expect(screen.getByText("Hola, Ana")).toBeTruthy();
    expect(screen.getByText("ADMINISTRADOR")).toBeTruthy();
    expect(screen.getByText("+18 entradas hoy")).toBeTruthy();
    expect(screen.getByText("\u22129 salidas hoy")).toBeTruthy();
    expect(screen.getByLabelText("4 Productos en punto de pedido")).toBeTruthy();
    expect(screen.getByText("Productos próximos a agotarse")).toBeTruthy();
    expect(screen.getByText("Harina")).toBeTruthy();
    expect(screen.getByText("Aceite")).toBeTruthy();
    expect(screen.getByText("Sal")).toBeTruthy();
    expect(screen.getByText("Movimientos recientes")).toBeTruthy();
    expect(screen.getByText("Azucar")).toBeTruthy();
  });

  it("administrador sin datos de hoy: no hay chips", async () => {
    await montar({ data: { ...base, hoy: undefined } });
    expect(screen.queryByText(/entradas hoy/)).toBeNull();
    expect(screen.queryByText(/salidas hoy/)).toBeNull();
  });

  it("administrador sin nada que pedir ni movimientos", async () => {
    await montar({
      data: { ...base, productosActivos: 0, resumen: [], aPedir: { total: 0, primeros: [] }, recientes: [] },
    });
    expect(screen.queryByText("Productos próximos a agotarse")).toBeNull();
    expect(screen.queryByText("Movimientos recientes")).toBeNull();
    expect(screen.getByText("Aún no hay movimientos.")).toBeTruthy();
  });

  it("operativo: sin campana ni alerta, con resumen completo y ultimos movimientos", async () => {
    const resumen = (["unidad", "libra", "kilogramo", "litro", "caja"] as const).map((unidad, i) => ({
      unidad,
      total: i + 1,
    }));
    await montar({ data: { ...base, aPedir: undefined, hoy: undefined, resumen } }, "operativo");
    expect(screen.getByText("USUARIO OPERATIVO")).toBeTruthy();
    expect(screen.queryByLabelText(/Notificaciones/)).toBeNull();
    expect(screen.queryByText(/Productos en punto de pedido/)).toBeNull();
    expect(screen.getByText("Resumen de existencias")).toBeTruthy();
    for (const t of ["1 unid.", "2 lb", "3 kg", "4 L", "5 cajas"]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByText("Últimos movimientos")).toBeTruthy();
    expect(screen.queryByText("Historial")).toBeNull();
  });

  it("escanear navega al escaner de existencias", async () => {
    await montar({ data: base });
    await fireEvent.press(screen.getByLabelText("Escanear"));
    expect(mockPush).toHaveBeenCalledWith("/escaner?destino=existencias");
  });

  it("si falla una recarga conserva los datos y avisa", async () => {
    await montar({ data: base, isError: true });
    expect(screen.getByText("Movimientos recientes")).toBeTruthy();
    expect(screen.getByText("No se pudo actualizar.")).toBeTruthy();
    expect(screen.getByText("Reintentar")).toBeTruthy();
  });

  it("chips en singular", async () => {
    await montar({ data: { ...base, hoy: { entradas: 1, salidas: 1 } } });
    expect(screen.getByText("+1 entrada hoy")).toBeTruthy();
    expect(screen.getByText("−1 salida hoy")).toBeTruthy();
  });

  it("sin movimientos hoy muestra un solo chip neutro", async () => {
    await montar({ data: { ...base, hoy: { entradas: 0, salidas: 0 } } });
    expect(screen.getByText("Sin movimientos hoy")).toBeTruthy();
    expect(screen.queryByText(/entradas? hoy/)).toBeNull();
    expect(screen.queryByText(/salidas? hoy/)).toBeNull();
  });

  it("inventario vacio: admin y operativo muestran el aviso", async () => {
    await montar({ data: { ...base, resumen: [] } });
    expect(screen.getByText("Existencias generales")).toBeTruthy();
    expect(screen.getByText("Sin existencias registradas.")).toBeTruthy();
    await screen.unmount();
    await montar({ data: { ...base, resumen: [], aPedir: undefined, hoy: undefined } }, "operativo");
    expect(screen.getByText("Resumen de existencias")).toBeTruthy();
    expect(screen.getByText("Sin existencias registradas.")).toBeTruthy();
  });

  it("el detalle de proximos a agotarse usa codigo y abreviatura", async () => {
    await montar({ data: base });
    expect(screen.getAllByText("Sin código · kg").length).toBe(3);
  });

  it("reintentar recarga todo el prefijo inicio (panel y campana)", async () => {
    const espia = jest.spyOn(cliente, "refetchQueries").mockResolvedValue();
    await montar({ data: base, isError: true });
    await fireEvent.press(screen.getByLabelText("Reintentar"));
    expect(espia).toHaveBeenCalledWith({ queryKey: ["inicio"] });
    espia.mockRestore();
  });

  it("entrada y campana navegan", async () => {
    await montar({ data: base });
    await fireEvent.press(screen.getByLabelText("Entrada"));
    expect(mockPush).toHaveBeenCalledWith("/movimientos/entrada");
    await fireEvent.press(screen.getByLabelText(/Notificaciones/));
    expect(mockPush).toHaveBeenCalledWith("/notificaciones");
  });

  it("primera carga: muestra esqueletos; error: ofrece reintentar", async () => {
    await montar({ isLoading: true });
    expect(screen.getAllByLabelText("Cargando").length).toBeGreaterThan(0);
    await screen.unmount();
    await montar({ isError: true });
    expect(screen.getByText("Reintentar")).toBeTruthy();
  });
});
