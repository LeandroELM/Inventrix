import { render, fireEvent } from "@testing-library/react-native";
import { Presionable } from "@/animacion/Presionable";
import { Skeleton } from "@/animacion/Skeleton";
import { NumeroAnimado } from "@/animacion/NumeroAnimado";
import { entradaEscalonada } from "@/animacion/entradaEscalonada";
import { Text } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: jest.fn(() => false) };
});

const reducido = useReducedMotion as jest.Mock;

beforeEach(() => reducido.mockReturnValue(false));

describe("animacion", () => {
  it("Presionable llama onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <Presionable onPress={onPress}>
        <Text>Ir</Text>
      </Presionable>,
    );
    await fireEvent.press(getByText("Ir"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("Presionable deshabilitado no llama onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <Presionable onPress={onPress} disabled>
        <Text>Ir</Text>
      </Presionable>,
    );
    await fireEvent.press(getByText("Ir"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("NumeroAnimado expone el valor final formateado", async () => {
    const { getByLabelText } = await render(<NumeroAnimado valor={1284} />);
    expect(getByLabelText("1,284")).toBeTruthy();
  });

  it("NumeroAnimado con movimiento reducido muestra el valor final", async () => {
    reducido.mockReturnValue(true);
    const { getByDisplayValue } = await render(<NumeroAnimado valor={1284} />);
    expect(getByDisplayValue("1,284")).toBeTruthy();
  });

  it("Skeleton tiene etiqueta de carga", async () => {
    const { getAllByLabelText } = await render(
      <>
        <Skeleton ancho={100} alto={10} />
        <Skeleton.Fila />
      </>,
    );
    expect(getAllByLabelText("Cargando").length).toBeGreaterThan(0);
  });

  it("entradaEscalonada solo para las primeras 6 filas", () => {
    expect(entradaEscalonada(5)).toBeDefined();
    expect(entradaEscalonada(6)).toBeUndefined();
  });
});
