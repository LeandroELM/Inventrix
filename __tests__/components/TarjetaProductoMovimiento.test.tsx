import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TarjetaProductoMovimiento } from "@/components/TarjetaProductoMovimiento";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const producto = { nombre: "Frijol rojo", codigo: "750123", unidad: "libra" as const, existencias: 60, punto_pedido: 15 };

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("TarjetaProductoMovimiento", () => {
  it("entrada muestra Proyectadas y no el punto de pedido", async () => {
    await montar(<TarjetaProductoMovimiento producto={producto} tipo="entrada" proyectadas={80} />);
    expect(screen.getByText("Proyectadas")).toBeTruthy();
    expect(screen.getByText("750123 · Libra")).toBeTruthy();
    expect(screen.queryByText(/P. pedido/)).toBeNull();
  });

  it("salida muestra Quedarían y el punto de pedido", async () => {
    await montar(<TarjetaProductoMovimiento producto={producto} tipo="salida" proyectadas={40} />);
    expect(screen.getByText("Quedarían")).toBeTruthy();
    expect(screen.getByText("750123 · Libra · P. pedido 15 lb")).toBeTruthy();
    expect(screen.getByText("Existencias actuales")).toBeTruthy();
  });

  it("sin proyección muestra —", async () => {
    await montar(<TarjetaProductoMovimiento producto={producto} tipo="salida" proyectadas={null} />);
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByLabelText("Existencias actuales 60 lb; quedarían sin dato")).toBeTruthy();
  });

  it("nombre largo en dos líneas como máximo", async () => {
    await montar(<TarjetaProductoMovimiento producto={producto} tipo="entrada" proyectadas={80} />);
    expect(screen.getByText("Frijol rojo").props.numberOfLines).toBe(2);
  });
});
