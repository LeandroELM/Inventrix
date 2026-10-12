import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Encabezado } from "@/components/Encabezado";
import { TemaProvider } from "@/tema/TemaProvider";

const mockEnfocada = { valor: true };
jest.mock("expo-router", () => ({ useIsFocused: () => mockEnfocada.valor }));
jest.mock("expo-status-bar", () => {
  const { View } = jest.requireActual("react-native");
  return { StatusBar: () => <View testID="barra-estado" /> };
});
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("Encabezado", () => {
  beforeEach(() => {
    mockEnfocada.valor = true;
  });

  it("monta la barra de estado solo mientras la pantalla está enfocada", async () => {
    await montar(<Encabezado variante="pantalla" titulo="Reportes" />);
    expect(screen.queryByTestId("barra-estado")).toBeTruthy();
    mockEnfocada.valor = false;
    await montar(<Encabezado variante="pantalla" titulo="Otra" />);
    expect(screen.queryByTestId("barra-estado")).toBeNull();
  });

  it("el título es un encabezado accesible", async () => {
    await montar(<Encabezado variante="pantalla" titulo="Reportes" />);
    expect(screen.getByRole("header", { name: "Reportes" })).toBeTruthy();
  });

  it("inicio muestra saludo, iniciales, rol en mayúsculas y alertas", async () => {
    await montar(
      <Encabezado variante="inicio" nombre="Ana López" rol="Administrador" alertas={2} onAlertas={jest.fn()} />,
    );
    expect(screen.getByText("Hola, Ana López")).toBeTruthy();
    expect(screen.getByText("ADMINISTRADOR")).toBeTruthy();
    expect(screen.getByText("AL", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notificaciones, 2 sin leer" })).toBeTruthy();
    expect(screen.getByTestId("punto-alerta")).toBeTruthy();
  });

  it("inicio sin onAlertas no muestra la campana", async () => {
    await montar(<Encabezado variante="inicio" nombre="Ana López" rol="Administrador" alertas={2} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("inicio no fuerza la barra de estado clara", async () => {
    await montar(<Encabezado variante="inicio" nombre="Ana López" rol="Operativo" />);
    expect(screen.queryByTestId("barra-estado")).toBeNull();
  });

  it("pantalla muestra el subtítulo", async () => {
    await montar(<Encabezado variante="pantalla" titulo="Existencias" subtitulo="120 productos activos" />);
    expect(screen.getByText("120 productos activos")).toBeTruthy();
  });

  it("acción de texto deshabilitada no llama onPress", async () => {
    const onPress = jest.fn();
    await montar(
      <Encabezado variante="pantalla" titulo="Notificaciones" accion={{ texto: "Marcar leídas", onPress, deshabilitado: true }} />,
    );
    const boton = screen.getByRole("button", { name: "Marcar leídas" });
    expect(boton.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(boton);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("acción de texto habilitada llama onPress", async () => {
    const onPress = jest.fn();
    await montar(<Encabezado variante="pantalla" titulo="Notificaciones" accion={{ texto: "Marcar leídas", onPress }} />);
    await fireEvent.press(screen.getByRole("button", { name: "Marcar leídas" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("pantalla con atrás llama onAtras", async () => {
    const onAtras = jest.fn();
    await montar(<Encabezado variante="pantalla" titulo="Reportes" onAtras={onAtras} />);
    expect(screen.getByText("Reportes")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Volver" }));
    expect(onAtras).toHaveBeenCalled();
  });

  it("pantalla sin onAtras no muestra Volver", async () => {
    await montar(<Encabezado variante="pantalla" titulo="Reportes" />);
    expect(screen.queryByLabelText("Volver")).toBeNull();
  });

  it("acción a la derecha", async () => {
    const onPress = jest.fn();
    await montar(
      <Encabezado variante="pantalla" titulo="Producto" accion={{ icono: "lapiz", etiqueta: "Editar producto", onPress }} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Editar producto" }));
    expect(onPress).toHaveBeenCalled();
  });
});
