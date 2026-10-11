import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { HojaInferior } from "@/components/HojaInferior";

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: jest.fn(() => false) };
});

describe("HojaInferior", () => {
  it.each([false, true])(
    "muestra el contenido y cierra al tocar el fondo (reducido=%s)",
    async (reducido) => {
      (useReducedMotion as jest.Mock).mockReturnValue(reducido);
      const onCerrar = jest.fn();
      await render(
        <HojaInferior onCerrar={onCerrar}>
          <Text>Contenido</Text>
        </HojaInferior>,
      );
      expect(screen.getByText("Contenido")).toBeTruthy();
      await fireEvent.press(screen.getByLabelText("Cerrar"));
      await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
    },
  );
});
