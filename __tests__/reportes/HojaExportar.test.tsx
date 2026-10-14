import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { obtenerReporte, filasDeReporte } from "@/features/reportes/api";
import { exportarExcel } from "@/features/reportes/excel";
import { HojaExportar } from "@/features/reportes/HojaExportar";
import { mensajeDeError } from "@/lib/errores";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: jest.fn(() => false) };
});
jest.mock("@/features/reportes/api", () => ({
  obtenerReporte: jest.fn(),
  filasDeReporte: jest.fn(),
}));
jest.mock("@/features/reportes/excel", () => ({
  ...jest.requireActual("@/features/reportes/excel"),
  exportarExcel: jest.fn(),
}));
let mockFechaElegida = new Date(2026, 9, 14);
jest.mock("@react-native-community/datetimepicker", () => {
  const { Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (e: object, f?: Date) => void }) => (
      <Pressable accessibilityRole="button" accessibilityLabel="Fijar fecha" onPress={() => onChange({}, mockFechaElegida)}>
        <Text>Fijar fecha</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/features/productos/BuscadorProducto", () => {
  const { Pressable, Text } = require("react-native");
  return {
    BuscadorProducto: ({ onElegir }: { onElegir: (id: string, nombre: string) => void }) => (
      <Pressable accessibilityRole="button" accessibilityLabel="Elegir producto" onPress={() => onElegir("p1", "Frijol rojo")}>
        <Text>Elegir producto</Text>
      </Pressable>
    ),
  };
});

const FILAS = [{ Producto: "Frijol rojo", Cantidad: 5 }];

async function montar(onCerrar = jest.fn(), tipo: "entradas" | "salidas" | "historial" = "salidas") {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>
        <HojaExportar tipo={tipo} onCerrar={onCerrar} />
      </TemaProvider>
    </SafeAreaProvider>,
  );
  return onCerrar;
}

describe("HojaExportar", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 13, 12));
    jest.clearAllMocks();
    (obtenerReporte as jest.Mock).mockResolvedValue([{ x: 1 }]);
    (filasDeReporte as jest.Mock).mockReturnValue(FILAS);
    (exportarExcel as jest.Mock).mockResolvedValue(undefined);
  });
  afterEach(() => jest.useRealTimers());

  it("muestra el título según el tipo", async () => {
    await montar(jest.fn(), "historial");
    expect(screen.getByText("Exportar historial")).toBeTruthy();
  });

  it("7 días por defecto y exporta con ese rango", async () => {
    const onCerrar = await montar();
    expect(screen.getByRole("button", { name: "7 días", selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByText("Exportar a Excel"));
    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(obtenerReporte).toHaveBeenCalledWith("salidas", {
      desde: new Date(2026, 9, 7),
      hasta: new Date(2026, 9, 14),
      productoId: undefined,
    });
    expect(exportarExcel).toHaveBeenCalledWith(expect.any(String), { Reporte: FILAS });
  });

  it("Personalizado muestra Desde y Hasta", async () => {
    await montar();
    expect(screen.queryByRole("button", { name: /^Desde:/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Personalizado" }));
    expect(screen.getByRole("button", { name: /^Desde:/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Hasta:/ })).toBeTruthy();
  });

  it("producto elegido se envía y Quitar lo elimina", async () => {
    const onCerrar = await montar();
    expect(screen.getByText("Producto: Todos")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar producto" }));
    await fireEvent.press(screen.getByRole("button", { name: "Elegir producto" }));
    expect(screen.getByText("Producto: Frijol rojo")).toBeTruthy();
    await fireEvent.press(screen.getByText("Exportar a Excel"));
    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(obtenerReporte).toHaveBeenCalledWith("salidas", expect.objectContaining({ productoId: "p1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Quitar producto" }));
    expect(screen.getByText("Producto: Todos")).toBeTruthy();
  });

  it("sin filas avisa y no exporta", async () => {
    (filasDeReporte as jest.Mock).mockReturnValue([]);
    const onCerrar = await montar();
    await fireEvent.press(screen.getByText("Exportar a Excel"));
    expect(await screen.findByText("No hay movimientos en el periodo elegido.")).toBeTruthy();
    expect(exportarExcel).not.toHaveBeenCalled();
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("error conserva filtros", async () => {
    const fallo = new Error("sin conexión");
    (obtenerReporte as jest.Mock).mockRejectedValue(fallo);
    const onCerrar = await montar();
    await fireEvent.press(screen.getByRole("button", { name: "Cambiar producto" }));
    await fireEvent.press(screen.getByRole("button", { name: "Elegir producto" }));
    await fireEvent.press(screen.getByText("Exportar a Excel"));
    expect(await screen.findByText(mensajeDeError(fallo))).toBeTruthy();
    expect(screen.getByText("Producto: Frijol rojo")).toBeTruthy();
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("con la exportación en curso, el velo y Cerrar no cierran la hoja", async () => {
    let terminar: () => void = () => {};
    (exportarExcel as jest.Mock).mockReturnValue(new Promise<void>((r) => (terminar = r)));
    const onCerrar = await montar();
    await fireEvent.press(screen.getByText("Exportar a Excel"));
    await waitFor(() => expect(exportarExcel).toHaveBeenCalled());
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar exportación" }));
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(onCerrar).not.toHaveBeenCalled();
    terminar();
    await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
  });

  it("desde posterior a hasta deshabilita", async () => {
    await montar();
    await fireEvent.press(screen.getByRole("button", { name: "Personalizado" }));
    mockFechaElegida = new Date(2026, 9, 14);
    await fireEvent.press(screen.getByRole("button", { name: /^Desde:/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Fijar fecha" }));
    mockFechaElegida = new Date(2026, 9, 10);
    await fireEvent.press(screen.getByRole("button", { name: /^Hasta:/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Fijar fecha" }));
    expect(screen.getByText("La fecha inicial no puede ser posterior a la final.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar a Excel", disabled: true })).toBeTruthy();
  });
});
