import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { FilaHistorial } from "@/features/movimientos/api";
import { HojaDetalleMovimiento } from "@/features/movimientos/HojaDetalleMovimiento";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: jest.fn(() => false) };
});

const FILA: FilaHistorial = {
  id: 1,
  created_at: new Date(2026, 9, 13, 9, 15).toISOString(),
  producto_id: "p1",
  producto: "Frijol rojo",
  codigo: null,
  unidad: "libra",
  tipo: "salida",
  cantidad: 5,
  motivo: "venta",
  existencias_antes: 60,
  existencias_despues: 55,
  usuario_id: "u1",
  usuario: "Carlos M.",
};

async function montar(fila: FilaHistorial, onVerProducto = jest.fn()) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <HojaDetalleMovimiento fila={fila} onCerrar={jest.fn()} onVerProducto={onVerProducto} />
      </TemaProvider>
    </SafeAreaProvider>,
  );
  return onVerProducto;
}

describe("HojaDetalleMovimiento", () => {
  it("muestra el detalle", async () => {
    await montar(FILA);
    expect(screen.getByText("Salida · Frijol rojo")).toBeTruthy();
    expect(screen.getByText("−5 lb")).toBeTruthy();
    expect(screen.getByText("Venta")).toBeTruthy();
    expect(screen.getByText("Carlos M.")).toBeTruthy();
    expect(screen.getByText("13/10/2026 09:15")).toBeTruthy();
    expect(screen.getByText("60 lb → 55 lb")).toBeTruthy();
  });

  it("entrada sin motivo", async () => {
    await montar({ ...FILA, tipo: "entrada", motivo: null });
    expect(screen.getByText("Entrada · Frijol rojo")).toBeTruthy();
    expect(screen.queryByText("Venta")).toBeNull();
  });

  it("Ver producto llama con el id", async () => {
    const onVerProducto = await montar(FILA);
    fireEvent.press(screen.getByRole("button", { name: "Ver producto" }));
    expect(onVerProducto).toHaveBeenCalledWith("p1");
  });
});
