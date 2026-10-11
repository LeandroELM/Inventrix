import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Encabezado } from "@/components/Encabezado";
import { TemaProvider } from "@/tema/TemaProvider";

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
  it("inicio muestra saludo, rol y alertas", async () => {
    await montar(<Encabezado variante="inicio" saludo="Hola, Ana 👋" rol="Administrador" alertas={3} />);
    expect(screen.getByText("Hola, Ana 👋")).toBeTruthy();
    expect(screen.getByText("Administrador")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeTruthy();
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
