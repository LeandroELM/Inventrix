import { AccessibilityInfo } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { ConfirmacionProvider, useConfirmacion } from "@/animacion/Confirmacion";
import { Pressable, Text } from "react-native";

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: jest.fn(() => false) };
});

function Disparador({ mensaje, alCerrar }: { mensaje: string; alCerrar?: () => void }) {
  const { mostrar } = useConfirmacion();
  return (
    <Pressable onPress={() => mostrar({ mensaje, alCerrar })}>
      <Text>{`disparar ${mensaje}`}</Text>
    </Pressable>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Confirmacion", () => {
  it("muestra el mensaje y llama a alCerrar a los 1400 ms", async () => {
    const alCerrar = jest.fn();
    const { getByText, queryByText } = await render(
      <ConfirmacionProvider>
        <Disparador mensaje="Entrada registrada" alCerrar={alCerrar} />
      </ConfirmacionProvider>,
    );
    await fireEvent.press(getByText("disparar Entrada registrada"));
    expect(getByText("Entrada registrada")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1399);
    });
    expect(alCerrar).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(alCerrar).toHaveBeenCalledTimes(1);
    expect(queryByText("Entrada registrada")).toBeNull();
  });

  it("anuncia el mensaje por accesibilidad", async () => {
    const { getByText } = await render(
      <ConfirmacionProvider>
        <Disparador mensaje="Entrada registrada" />
      </ConfirmacionProvider>,
    );
    await fireEvent.press(getByText("disparar Entrada registrada"));
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith("Entrada registrada");
  });

  it("una segunda llamada reemplaza a la primera", async () => {
    const a = jest.fn();
    const b = jest.fn();
    const { getByText } = await render(
      <ConfirmacionProvider>
        <Disparador mensaje="Uno" alCerrar={a} />
        <Disparador mensaje="Dos" alCerrar={b} />
      </ConfirmacionProvider>,
    );
    await fireEvent.press(getByText("disparar Uno"));
    await fireEvent.press(getByText("disparar Dos"));
    await act(async () => {
      jest.advanceTimersByTime(1400);
    });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
