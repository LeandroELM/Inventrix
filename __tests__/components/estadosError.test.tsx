import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AvisoRecarga } from "@/components/AvisoRecarga";
import { EstadoError } from "@/components/EstadoError";
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

describe("EstadoError", () => {
  it("muestra el mensaje como alerta y reintenta", async () => {
    const onReintentar = jest.fn();
    await montar(<EstadoError mensaje="No se pudo cargar." onReintentar={onReintentar} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("No se pudo cargar.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Reintentar"));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe("AvisoRecarga", () => {
  it("avisa y reintenta", async () => {
    const onReintentar = jest.fn();
    await montar(<AvisoRecarga onReintentar={onReintentar} />);
    expect(screen.getByText("No se pudo actualizar.")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Reintentar"));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
