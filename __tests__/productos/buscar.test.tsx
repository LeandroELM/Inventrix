import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Buscar from "../../app/(app)/buscar";
import { EspacioInferiorContext } from "@/components/BarraInferior";
import { TemaProvider } from "@/tema/TemaProvider";
import { estadoInventario } from "@/features/productos/estado";

const mockPush = jest.fn();
const mockUseProductos = jest.fn();
const mockUseAuth = jest.fn();
const mockRefetch = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
}));
jest.mock("@/features/productos/hooks", () => ({ useProductos: (...a: unknown[]) => mockUseProductos(...a) }));
jest.mock("@/features/productos/api", () => ({ listarTodosProductos: jest.fn() }));
jest.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => mockUseAuth() }));
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
const TODOS = [prod("a", "Harina", 20), prod("b", "Aceite", 5), prod("c", "Sal", 0)];

type Estado = "disponible" | "bajo" | "sin" | undefined;
function simular(
  opciones: { lista?: ReturnType<typeof prod>[]; isError?: boolean; isLoading?: boolean; recargaFalla?: boolean } = {},
) {
  mockUseProductos.mockImplementation(({ estado }: { estado: Estado }) => {
    const lista = opciones.lista ?? TODOS;
    return {
      data: opciones.isError || opciones.isLoading ? undefined : lista.filter((p) => !estado || estadoInventario(p.existencias, p.punto_pedido) === estado),
      isLoading: opciones.isLoading ?? false,
      error: opciones.isError ? new Error("falla") : null,
      isError: !!opciones.isError || !!opciones.recargaFalla,
      refetch: mockRefetch,
    };
  });
}

async function montar(rol: "admin" | "operativo" = "admin", conEspacio = false) {
  mockUseAuth.mockReturnValue({ perfil: { id: "1", usuario: "a", nombre: "Ana", rol } });
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: conEspacio ? 24 : 0 } }}
    >
      <TemaProvider>
        <EspacioInferiorContext.Provider value={conEspacio}>
          <Buscar />
        </EspacioInferiorContext.Provider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("Buscar / Existencias", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefetch.mockReset();
  });

  it("Exportar a Excel queda sobre la barra", async () => {
    simular();
    await montar("admin", true);
    // El pie (aviso y botón) está fuera de la lista: el espacio va en el contenedor que lo envuelve.
    const cuerpo = screen.getByTestId("cuerpo-buscar");
    expect(StyleSheet.flatten(cuerpo.props.style).paddingBottom).toBe(16 + 162);
    expect(screen.getByText("Exportar a Excel")).toBeTruthy();
    // La lista ya termina sobre ese espacio: no lo repite.
    const lista = StyleSheet.flatten(screen.getByTestId("contenido-principal").props.contentContainerStyle);
    expect(lista.paddingBottom).toBe(16);
  });

  it("fuera de las pestañas el pie conserva su relleno", async () => {
    simular();
    await montar("admin", false);
    expect(StyleSheet.flatten(screen.getByTestId("cuerpo-buscar").props.style).paddingBottom).toBe(16);
  });

  it("muestra titulo, subtitulo y los tres productos", async () => {
    simular();
    await montar();
    expect(screen.getByText("Existencias")).toBeTruthy();
    expect(screen.getByText("3 productos activos")).toBeTruthy();
    expect(screen.getByText("Harina")).toBeTruthy();
    expect(screen.getByText("Aceite")).toBeTruthy();
    expect(screen.getByText("Sal")).toBeTruthy();
  });

  it("el chip Bajo deja solo el producto bajo", async () => {
    simular();
    await montar();
    await fireEvent.press(screen.getByLabelText("Bajo"));
    expect(screen.getByText("Aceite")).toBeTruthy();
    expect(screen.queryByText("Harina")).toBeNull();
    expect(screen.queryByText("Sal")).toBeNull();
  });

  it("sin coincidencias de busqueda muestra el aviso", async () => {
    simular({ lista: [] });
    await montar();
    await fireEvent.changeText(screen.getByLabelText("Buscar producto"), "zzz");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(screen.getByText("No hay productos que coincidan.")).toBeTruthy();
  });

  it("lista vacia sin busqueda muestra que aun no hay productos", async () => {
    simular({ lista: [] });
    await montar();
    expect(screen.getByText("Aún no hay productos registrados.")).toBeTruthy();
  });

  it("error muestra Reintentar", async () => {
    simular({ isError: true });
    await montar();
    await fireEvent.press(screen.getByText("Reintentar"));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("si falla una recarga conserva la lista y avisa", async () => {
    simular({ recargaFalla: true });
    await montar();
    expect(screen.getByText("Harina")).toBeTruthy();
    expect(screen.getByText("No se pudo actualizar.")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Reintentar"));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("error de primera carga muestra el mensaje de la pantalla", async () => {
    simular({ isError: true });
    await montar();
    expect(screen.getByText("No se pudieron cargar los productos.")).toBeTruthy();
  });

  it("subtitulo en singular con un producto activo", async () => {
    simular({ lista: [prod("a", "Harina", 20)] });
    await montar();
    expect(screen.getByText("1 producto activo")).toBeTruthy();
  });

  it("tocar una fila navega a la ficha", async () => {
    simular();
    await montar();
    await fireEvent.press(screen.getByLabelText("Aceite, 5 kg, Bajo inventario"));
    expect(mockPush).toHaveBeenCalledWith("/administracion/producto/b");
  });

  it("el boton de escanear tiene etiqueta y abre el escaner", async () => {
    simular();
    await montar();
    await fireEvent.press(screen.getByLabelText("Escanear código de barras"));
    expect(mockPush).toHaveBeenCalledWith("/escaner?destino=existencias");
  });

  it("Exportar a Excel sigue visible para el operativo", async () => {
    simular();
    await montar("operativo");
    expect(screen.getByText("Exportar a Excel")).toBeTruthy();
  });
});
