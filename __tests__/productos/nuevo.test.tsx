import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Nuevo from "../../app/(app)/nuevo";
import { TemaProvider } from "@/tema/TemaProvider";

const mockRegistrar = jest.fn();
const mockCodigoRegistrado = jest.fn();
const mockLeerImagen = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: { codigo?: string } = {};
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/features/productos/api", () => ({
  registrarProducto: (...args: unknown[]) => mockRegistrar(...args),
  codigoRegistrado: (...args: unknown[]) => mockCodigoRegistrado(...args),
}));
jest.mock("@/features/productos/leerImagen", () => ({
  leerCodigoDeImagen: (...args: unknown[]) => mockLeerImagen(...args),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
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

function arbol() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { gcTime: 0 } } });
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <QueryClientProvider client={qc}>
          <Nuevo />
        </QueryClientProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}

async function renderizar() {
  return render(arbol());
}

async function llenar(cantidad = "50") {
  await fireEvent.changeText(screen.getByLabelText("Nombre"), "Harina de trigo");
  await fireEvent.changeText(screen.getByLabelText("Código"), "750999");
  await fireEvent.changeText(screen.getByLabelText("Cantidad inicial"), cantidad);
  await fireEvent.changeText(screen.getByLabelText("Punto de pedido"), "15");
}

async function irAlPaso2(cantidad = "50") {
  await renderizar();
  await llenar(cantidad);
  await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
  await screen.findByText("Paso 2 de 2 · Confirmación");
}

describe("Nuevo producto", () => {
  beforeEach(() => {
    mockRegistrar.mockReset();
    mockCodigoRegistrado.mockReset();
    mockCodigoRegistrado.mockResolvedValue(null);
    mockLeerImagen.mockReset();
    mockReplace.mockReset();
    mockPush.mockReset();
    mockBack.mockReset();
    mockParams = {};
  });

  it("paso 1 muestra el subtítulo y la nota", async () => {
    await renderizar();
    expect(screen.getByText("Paso 1 de 2 · Datos del producto")).toBeTruthy();
    expect(screen.getByLabelText("Paso 1 de 2")).toBeTruthy();
    expect(
      screen.getByText("Cuando las existencias lleguen al punto de pedido, recibirás una alerta de reabastecimiento."),
    ).toBeTruthy();
  });

  it("cerrar vuelve atrás y escanear abre el escáner", async () => {
    await renderizar();
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    expect(mockBack).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Escanear con la cámara" }));
    expect(mockPush).toHaveBeenCalledWith("/escaner?destino=nuevo");
  });

  it("avanza al paso 2 con los datos", async () => {
    await irAlPaso2();
    expect(mockCodigoRegistrado).toHaveBeenCalledWith("750999");
    expect(screen.getByLabelText("Paso 2 de 2")).toBeTruthy();
    expect(screen.getByText("Harina de trigo")).toBeTruthy();
    expect(screen.getByText("Código 750999")).toBeTruthy();
    expect(
      screen.getByText("Al confirmar se guardará el producto y su movimiento inicial de inventario (+50 unid.)."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar información" })).toBeTruthy();
  });

  it("editar información vuelve al paso 1 conservando los datos", async () => {
    await irAlPaso2();
    await fireEvent.press(screen.getByRole("button", { name: "Editar información" }));
    expect(screen.getByLabelText("Nombre").props.value).toBe("Harina de trigo");
    expect(screen.getByLabelText("Cantidad inicial").props.value).toBe("50");
  });

  it("cantidad inicial 0 cambia la nota", async () => {
    await irAlPaso2("0");
    expect(screen.getByText("Al confirmar se guardará el producto sin existencias iniciales.")).toBeTruthy();
  });

  it("código duplicado activo no avanza", async () => {
    mockCodigoRegistrado.mockResolvedValue({ nombre: "Arroz blanco", activo: true });
    await renderizar();
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
    expect(await screen.findByText("Este código ya está registrado (Arroz blanco).")).toBeTruthy();
    expect(screen.getByText("Paso 1 de 2 · Datos del producto")).toBeTruthy();
  });

  it("código de un producto dado de baja no avanza", async () => {
    mockCodigoRegistrado.mockResolvedValue({ nombre: "Jabón", activo: false });
    await renderizar();
    await llenar();
    await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
    expect(await screen.findByText("Este código pertenece a Jabón, dado de baja.")).toBeTruthy();
    expect(screen.getByText("Paso 1 de 2 · Datos del producto")).toBeTruthy();
  });

  it("si la consulta del código falla, avanza igual", async () => {
    mockCodigoRegistrado.mockRejectedValue(new Error("red"));
    await irAlPaso2();
    expect(screen.getByText("Código 750999")).toBeTruthy();
  });

  it("CODIGO_DUPLICADO del servidor vuelve al paso 1", async () => {
    mockRegistrar.mockRejectedValue(new Error("CODIGO_DUPLICADO"));
    await irAlPaso2();
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar registro" }));
    expect(await screen.findByText("Este código ya está registrado.")).toBeTruthy();
    expect(screen.getByText("Paso 1 de 2 · Datos del producto")).toBeTruthy();
    expect(screen.getByLabelText("Código").props.value).toBe("750999");
  });

  it("otro error del servidor se muestra en el paso 2", async () => {
    mockRegistrar.mockRejectedValue(new Error("Network request failed"));
    await irAlPaso2();
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar registro" }));
    expect(await screen.findByText("Sin conexión. Revisa tu internet e intenta de nuevo.")).toBeTruthy();
    expect(screen.getByText("Paso 2 de 2 · Confirmación")).toBeTruthy();
  });

  it("doble toque en Confirmar registra una vez", async () => {
    let terminar: (v: unknown) => void = () => {};
    mockRegistrar.mockReturnValue(new Promise((resolver) => (terminar = resolver)));
    await irAlPaso2();
    const boton = screen.getByRole("button", { name: "Confirmar registro" });
    // Dos toques en el mismo instante, antes de que React repinte el botón como cargando.
    await act(async () => {
      boton.props.onClick({ nativeEvent: {}, stopPropagation() {}, preventDefault() {} });
      boton.props.onClick({ nativeEvent: {}, stopPropagation() {}, preventDefault() {} });
    });
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    terminar({ id: "p1" });
    expect(await screen.findByText("¡Producto registrado!")).toBeTruthy();
  });

  it("resultado", async () => {
    mockRegistrar.mockResolvedValue({ id: "p1" });
    await irAlPaso2();
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar registro" }));
    expect(await screen.findByText("¡Producto registrado!")).toBeTruthy();
    expect(mockRegistrar).toHaveBeenCalledWith({
      nombre: "Harina de trigo",
      codigo: "750999",
      unidad: "unidad",
      cantidadInicial: 50,
      puntoPedido: 15,
    });
    expect(
      screen.getByText("Harina de trigo ya está disponible en Existencias y puede usarse en entradas y salidas."),
    ).toBeTruthy();
    expect(screen.getByText("Código 750999")).toBeTruthy();
    expect(screen.getByText("50 unid.")).toBeTruthy();
    expect(screen.getByText("15 unid.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ver en Existencias" }));
    expect(mockReplace).toHaveBeenCalledWith("/buscar");
    await fireEvent.press(screen.getByRole("button", { name: "Registrar otro producto" }));
    expect(screen.getByText("Paso 1 de 2 · Datos del producto")).toBeTruthy();
    expect(screen.getByLabelText("Nombre").props.value).toBe("");
    expect(screen.getByLabelText("Código").props.value).toBe("");
  });

  it("leer desde imagen rellena el código", async () => {
    mockLeerImagen.mockResolvedValue({ estado: "ok", codigo: "123" });
    await renderizar();
    await fireEvent.press(screen.getByRole("button", { name: "Leer código desde una imagen" }));
    await waitFor(() => expect(screen.getByLabelText("Código").props.value).toBe("123"));
  });

  it("leer desde imagen sin código avisa", async () => {
    mockLeerImagen.mockResolvedValue({ estado: "sin-codigo" });
    await renderizar();
    await fireEvent.press(screen.getByRole("button", { name: "Leer código desde una imagen" }));
    expect(await screen.findByText("No se encontró ningún código en la imagen.")).toBeTruthy();
  });

  it("no pasa al paso 2 con nombre en blanco ni cantidad inválida", async () => {
    await renderizar();
    await fireEvent.changeText(screen.getByLabelText("Nombre"), "   ");
    await fireEvent.changeText(screen.getByLabelText("Código"), "HAR-001");
    await fireEvent.changeText(screen.getByLabelText("Cantidad inicial"), "1.5");
    await fireEvent.changeText(screen.getByLabelText("Punto de pedido"), "1");
    await fireEvent.press(screen.getByRole("button", { name: "Revisar" }));
    expect(await screen.findByText("Ingresa el nombre.")).toBeTruthy();
    expect(screen.getByText("Esta unidad solo admite números enteros.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar registro" })).toBeNull();
  });

  it("código por parámetro rellena el campo", async () => {
    mockParams = { codigo: "777" };
    await renderizar();
    await waitFor(() => expect(screen.getByLabelText("Código").props.value).toBe("777"));
  });

  it("actualiza el código cuando el escáner devuelve otro", async () => {
    mockParams = { codigo: "7501234" };
    const { rerender } = await renderizar();
    await waitFor(() => expect(screen.getByLabelText("Código").props.value).toBe("7501234"));
    mockParams = { codigo: "999888" };
    await rerender(arbol());
    await waitFor(() => expect(screen.getByLabelText("Código").props.value).toBe("999888"));
  });
});
