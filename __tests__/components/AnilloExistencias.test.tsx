import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AnilloExistencias, fraccionAnillo } from "@/components/AnilloExistencias";
import { formatearCantidad } from "@/features/productos/unidades";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("fraccionAnillo", () => {
  it("el punto de pedido queda en la mitad del anillo", () => {
    expect(fraccionAnillo(10, 15)).toBeCloseTo(1 / 3);
    expect(fraccionAnillo(45, 15)).toBe(1);
    expect(fraccionAnillo(15, 15)).toBe(0.5);
  });

  it("no divide entre cero", () => {
    expect(fraccionAnillo(0, 0)).toBe(0);
    expect(fraccionAnillo(3, 0)).toBe(1);
    expect(Number.isFinite(fraccionAnillo(0, 15))).toBe(true);
  });
});

describe("AnilloExistencias", () => {
  it("expone existencias, punto de pedido y estado en una sola etiqueta", async () => {
    await montar(<AnilloExistencias existencias={10} puntoPedido={15} unidad="libra" />);
    const esperada = `Existencias ${formatearCantidad(10, "libra")}; punto de pedido ${formatearCantidad(15, "libra")}; Bajo inventario`;
    expect(screen.getByLabelText(esperada)).toBeTruthy();
  });

  it("muestra las pildoras de punto de pedido y unidad", async () => {
    await montar(<AnilloExistencias existencias={10} puntoPedido={15} unidad="libra" />);
    expect(screen.getByText(`Punto de pedido ${formatearCantidad(15, "libra")}`)).toBeTruthy();
    expect(screen.getByText("Unidad Libra")).toBeTruthy();
  });

  it("omite la marca del punto de pedido cuando es 0", async () => {
    await montar(<AnilloExistencias existencias={10} puntoPedido={0} unidad="libra" />);
    expect(screen.queryByTestId("marca-punto-pedido")).toBeNull();
  });

  it("dibuja la marca cuando hay punto de pedido", async () => {
    await montar(<AnilloExistencias existencias={10} puntoPedido={15} unidad="libra" />);
    expect(screen.getByTestId("marca-punto-pedido")).toBeTruthy();
  });
});
