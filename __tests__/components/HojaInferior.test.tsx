import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { BackHandler, Text } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HojaInferior } from "@/components/HojaInferior";

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: jest.fn(() => false) };
});

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};

async function montar(onCerrar: () => void, bloqueado = false) {
  await render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <HojaInferior
        onCerrar={onCerrar}
        bloqueado={bloqueado}
        encabezado={(cerrar) => (
          <Text accessibilityRole="button" accessibilityLabel="X" onPress={cerrar}>
            Encabezado
          </Text>
        )}
      >
        <Text>Contenido</Text>
      </HojaInferior>
    </SafeAreaProvider>,
  );
}

describe("HojaInferior", () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([false, true])(
    "muestra encabezado y contenido y cierra al tocar el fondo (reducido=%s)",
    async (reducido) => {
      (useReducedMotion as jest.Mock).mockReturnValue(reducido);
      const onCerrar = jest.fn();
      await montar(onCerrar);
      expect(screen.getByText("Contenido")).toBeTruthy();
      expect(screen.getByText("Encabezado")).toBeTruthy();
      await fireEvent.press(screen.getByLabelText("Cerrar"));
      await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
    },
  );

  it("varios disparadores de cierre llaman onCerrar una sola vez", async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const onCerrar = jest.fn();
    await montar(onCerrar);
    await fireEvent.press(screen.getByLabelText("Cerrar"));
    await fireEvent.press(screen.getByLabelText("Cerrar"));
    await fireEvent.press(screen.getByLabelText("X"));
    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("el botón atrás de Android cierra la hoja y se consume", async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const espia = jest.spyOn(BackHandler, "addEventListener");
    const onCerrar = jest.fn();
    await montar(onCerrar);
    const manejador = espia.mock.calls.find(
      (c) => c[0] === "hardwareBackPress",
    )?.[1] as () => boolean;
    expect(manejador()).toBe(true);
    await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
  });

  it("con bloqueado, el fondo, el encabezado y el botón atrás no cierran la hoja", async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    const espia = jest.spyOn(BackHandler, "addEventListener");
    const onCerrar = jest.fn();
    await montar(onCerrar, true);
    await fireEvent.press(screen.getByLabelText("Cerrar"));
    await fireEvent.press(screen.getByLabelText("X"));
    const manejador = espia.mock.calls.find(
      (c) => c[0] === "hardwareBackPress",
    )?.[1] as () => boolean;
    expect(manejador()).toBe(true);
    await new Promise((r) => setTimeout(r, 400));
    expect(onCerrar).not.toHaveBeenCalled();
  });
});
