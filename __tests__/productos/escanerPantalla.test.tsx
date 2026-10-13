import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Escaner from "../../app/escaner";
import { TemaProvider } from "@/tema/TemaProvider";

const mockBuscar = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockPedirPermiso = jest.fn();
const mockLeerImagen = jest.fn();
let mockParams: { destino?: string } = {};
let mockRol = "admin";
let mockPermiso: { granted: boolean } = { granted: true };
let mockAlLeer: ((r: { data: string }) => void) | undefined;

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/productos/api", () => ({
  buscarPorCodigo: (...args: unknown[]) => mockBuscar(...args),
}));
jest.mock("@/features/productos/leerImagen", () => ({
  TIPOS_CODIGO: ["ean13", "qr"],
  leerCodigoDeImagen: (...args: unknown[]) => mockLeerImagen(...args),
}));
jest.mock("expo-camera", () => ({
  CameraView: (props: { onBarcodeScanned?: (r: { data: string }) => void }) => {
    mockAlLeer = props.onBarcodeScanned;
    return null;
  },
  useCameraPermissions: () => [mockPermiso, mockPedirPermiso],
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, dismissTo: mockDismissTo, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: mockRol } }),
}));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

type Oyente = Parameters<typeof BackHandler.addEventListener>[1];

const PRODUCTO = { id: "p1", nombre: "Harina de trigo", codigo: "750", unidad: "unidad", existencias: 5, punto_pedido: 2, activo: true };

async function renderizar() {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <Escaner />
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

async function leer(codigo: string) {
  await act(async () => {
    mockAlLeer?.({ data: codigo });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { destino: "salida" };
  mockRol = "admin";
  mockPermiso = { granted: true };
  mockAlLeer = undefined;
  mockBuscar.mockResolvedValue(PRODUCTO);
});

describe("Escáner", () => {
  it("encontrado muestra la hoja y Usar este producto navega", async () => {
    await renderizar();
    await leer("750");
    expect(await screen.findByText("CÓDIGO RECONOCIDO")).toBeTruthy();
    expect(screen.getByText("Harina de trigo")).toBeTruthy();
    expect(screen.getByText("750 · 5 unid. disponibles")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Usar este producto" }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/movimientos/salida", params: { productoId: "p1" } });
  });

  it("con la hoja abierta no se procesan lecturas", async () => {
    await renderizar();
    await leer("750");
    await screen.findByText("CÓDIGO RECONOCIDO");
    expect(mockAlLeer).toBeUndefined();
  });

  it("Escanear de nuevo con el mismo código vuelve a mostrar la hoja", async () => {
    await renderizar();
    await leer("750");
    await screen.findByText("CÓDIGO RECONOCIDO");
    await fireEvent.press(screen.getByRole("button", { name: "Escanear de nuevo" }));
    expect(screen.queryByText("CÓDIGO RECONOCIDO")).toBeNull();
    await leer("750");
    expect(await screen.findByText("CÓDIGO RECONOCIDO")).toBeTruthy();
    expect(mockBuscar).toHaveBeenCalledTimes(2);
  });

  it("no encontrado admin ofrece Registrar producto", async () => {
    mockBuscar.mockResolvedValue(null);
    await renderizar();
    await leer("750");
    expect(await screen.findByText("Producto no encontrado")).toBeTruthy();
    expect(screen.getByText("750")).toBeTruthy();
    expect(screen.getByText("El código escaneado no corresponde a ningún producto registrado.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Registrar producto" }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/nuevo", params: { codigo: "750" } });
  });

  it("no encontrado operativo muestra el aviso", async () => {
    mockRol = "operativo";
    mockBuscar.mockResolvedValue(null);
    await renderizar();
    await leer("750");
    expect(
      await screen.findByText("Solo el administrador puede registrar productos nuevos. Pídele que lo agregue al catálogo."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar producto" })).toBeNull();
  });

  it("destino nuevo vuelve directo sin hoja", async () => {
    mockParams = { destino: "nuevo" };
    await renderizar();
    await leer("750");
    expect(mockDismissTo).toHaveBeenCalledWith({ pathname: "/nuevo", params: { codigo: "750" } });
    expect(screen.queryByText("CÓDIGO RECONOCIDO")).toBeNull();
  });

  it("error de búsqueda muestra el mensaje y Escanear de nuevo", async () => {
    mockBuscar.mockRejectedValue(new Error("fallo de red"));
    await renderizar();
    await leer("750");
    expect(await screen.findByRole("button", { name: "Escanear de nuevo" })).toBeTruthy();
    expect(screen.queryByText("CÓDIGO RECONOCIDO")).toBeNull();
  });

  it("sin permiso ofrece permitir, escribir y leer desde imagen", async () => {
    mockPermiso = { granted: false };
    await renderizar();
    expect(screen.getByRole("button", { name: "Permitir cámara" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escribir el código manualmente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Leer desde imagen" })).toBeTruthy();
  });

  it("leer desde imagen sin código conserva el mensaje", async () => {
    mockLeerImagen.mockResolvedValue({ estado: "sin-codigo" });
    await renderizar();
    await fireEvent.press(screen.getByRole("button", { name: "Leer desde imagen" }));
    expect(await screen.findByText("No se encontró ningún código en la imagen.")).toBeTruthy();
  });

  it("muestra Buscando… mientras consulta el código", async () => {
    mockBuscar.mockReturnValue(new Promise(() => {}));
    await renderizar();
    await leer("750");
    expect(screen.getByText("Buscando…")).toBeTruthy();
  });

  it("con la hoja abierta oculta y bloquea las acciones de detrás", async () => {
    await renderizar();
    expect(screen.getByRole("button", { name: "Escribir el código manualmente" })).toBeTruthy();
    await leer("750");
    await screen.findByText("CÓDIGO RECONOCIDO");
    expect(screen.queryByRole("button", { name: "Escribir el código manualmente" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Leer desde imagen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar lector" })).toBeNull();
    const oculto = screen.getByRole("button", { name: "Leer desde imagen", includeHiddenElements: true });
    let nodo = oculto.parent;
    let bloqueado = false;
    while (nodo) {
      const estilo = [nodo.props.style].flat(Infinity);
      if (estilo.some((e) => e && e.pointerEvents === "none")) bloqueado = true;
      nodo = nodo.parent;
    }
    expect(bloqueado).toBe(true);
    expect(screen.getByRole("button", { name: "Escanear de nuevo" })).toBeTruthy();
  });

  it("el botón atrás de Android cierra la hoja sin salir", async () => {
    const oyentes: Oyente[] = [];
    const espia = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_evento, oyente) => {
      oyentes.push(oyente);
      return { remove: () => oyentes.splice(oyentes.indexOf(oyente), 1) && undefined };
    });
    await renderizar();
    expect(oyentes).toHaveLength(0);
    await leer("750");
    await screen.findByText("CÓDIGO RECONOCIDO");
    expect(oyentes).toHaveLength(1);
    let manejado: boolean | null | undefined;
    await act(async () => {
      manejado = oyentes[0]({} as Parameters<Oyente>[0]);
    });
    expect(manejado).toBe(true);
    expect(screen.queryByText("CÓDIGO RECONOCIDO")).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
    expect(oyentes).toHaveLength(0);
    await leer("750");
    expect(await screen.findByText("CÓDIGO RECONOCIDO")).toBeTruthy();
    espia.mockRestore();
  });
});
