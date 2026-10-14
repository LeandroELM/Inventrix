import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Editar from "../../app/(app)/administracion/producto/[id]/editar";
import { TemaProvider } from "@/tema/TemaProvider";

const mockActualizar = jest.fn();
const mockObtener = jest.fn();
const mockBack = jest.fn();
jest.mock("@/features/productos/api", () => ({
  obtenerProducto: (...args: unknown[]) => mockObtener(...args),
  actualizarProducto: (...args: unknown[]) => mockActualizar(...args),
  listarProductos: jest.fn(),
  ultimosMovimientos: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "p1" }),
  useRouter: () => ({ back: mockBack }),
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

const ACEITE = { id: "p1", nombre: "Aceite", codigo: "F1", unidad: "litro", existencias: 2.5, punto_pedido: 1, activo: true };

async function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <QueryClientProvider client={qc}>
          <Editar />
        </QueryClientProvider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("Editar producto", () => {
  beforeEach(() => {
    mockActualizar.mockReset();
    mockBack.mockReset();
    mockObtener.mockReset();
    mockObtener.mockResolvedValue(ACEITE);
  });

  it("rechaza pasar a unidad entera con existencias fraccionarias", async () => {
    await montar();
    await screen.findByText("El código no se puede cambiar.");
    await fireEvent.press(screen.getByRole("button", { name: "Unidad" }));
    await fireEvent.press(screen.getByText("Guardar cambios"));
    const aviso = await screen.findByText(/unidad entera/);
    expect(aviso).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("el error general se borra al cambiar el formulario", async () => {
    await montar();
    await screen.findByText("El código no se puede cambiar.");
    await fireEvent.press(screen.getByRole("button", { name: "Unidad" }));
    await fireEvent.press(screen.getByText("Guardar cambios"));
    await screen.findByText(/unidad entera/);
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "Aceite de oliva");
    expect(screen.queryByText(/unidad entera/)).toBeNull();
  });

  it("muestra el codigo en solo lectura", async () => {
    await montar();
    expect(await screen.findByText("El código no se puede cambiar.")).toBeTruthy();
    expect(screen.getByText("F1")).toBeTruthy();
    expect(screen.queryByLabelText("Código")).toBeNull();
  });

  it("muestra el nombre actual como subtitulo", async () => {
    await montar();
    await screen.findByText("El código no se puede cambiar.");
    expect(screen.getAllByText("Aceite").length).toBeGreaterThan(0);
  });

  it("error de nombre en el campo", async () => {
    await montar();
    await screen.findByText("El código no se puede cambiar.");
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "");
    await fireEvent.press(screen.getByText("Guardar cambios"));
    expect(await screen.findByText("Ingresa el nombre.")).toBeTruthy();
    expect(mockActualizar).not.toHaveBeenCalled();
  });

  it("guardar vuelve atras", async () => {
    mockActualizar.mockResolvedValue(undefined);
    await montar();
    await screen.findByText("El código no se puede cambiar.");
    await fireEvent.press(screen.getByText("Guardar cambios"));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
    expect(mockActualizar).toHaveBeenCalled();
  });

  it("Cerrar vuelve atras", async () => {
    await montar();
    await screen.findByText("El código no se puede cambiar.");
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    expect(mockBack).toHaveBeenCalled();
  });

  it("sufijo de la unidad", async () => {
    mockObtener.mockResolvedValue({ ...ACEITE, unidad: "libra", existencias: 3 });
    await montar();
    expect(await screen.findByText("lb")).toBeTruthy();
  });

  it("error de carga con Reintentar", async () => {
    mockObtener.mockRejectedValueOnce(new Error("falla"));
    await montar();
    await fireEvent.press(await screen.findByText("Reintentar"));
    expect(await screen.findByText("El código no se puede cambiar.")).toBeTruthy();
  });
});
