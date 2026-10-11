import { render, fireEvent } from "@testing-library/react-native";
import { Presionable } from "@/animacion/Presionable";
import { Skeleton } from "@/animacion/Skeleton";
import { NumeroAnimado } from "@/animacion/NumeroAnimado";
import { entradaEscalonada } from "@/animacion/entradaEscalonada";
import { Text } from "react-native";
import { useReducedMotion, withRepeat, withTiming } from "react-native-reanimated";

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return {
    ...mock,
    useReducedMotion: jest.fn(() => false),
    withTiming: jest.fn(mock.withTiming),
    withRepeat: jest.fn(mock.withRepeat),
  };
});

const reducido = useReducedMotion as jest.Mock;

beforeEach(() => {
  reducido.mockReturnValue(false);
  (withTiming as jest.Mock).mockClear();
  (withRepeat as jest.Mock).mockClear();
});

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
    expect(withTiming).not.toHaveBeenCalled();
  });

  it("NumeroAnimado con movimiento anima desde 0", async () => {
    const { getByDisplayValue } = await render(<NumeroAnimado valor={1284} />);
    expect(getByDisplayValue("0")).toBeTruthy();
    expect(withTiming).toHaveBeenCalledWith(1284, expect.objectContaining({ duration: 600 }));
  });

  it("NumeroAnimado acepta un formato JS normal", async () => {
    const { getByLabelText } = await render(
      <NumeroAnimado valor={5} formato={(n) => `${n} kg`} />,
    );
    expect(getByLabelText("5 kg")).toBeTruthy();
  });

  it("Presionable anima la escala al presionar", async () => {
    const { getByText } = await render(
      <Presionable>
        <Text>Ir</Text>
      </Presionable>,
    );
    await fireEvent(getByText("Ir"), "pressIn");
    expect(withTiming).toHaveBeenCalledWith(0.96, expect.objectContaining({ duration: 150 }));
  });

  it.each([
    ["disabled", { disabled: true }, false],
    ["sinEscala", { sinEscala: true }, false],
    ["movimiento reducido", {}, true],
  ])("Presionable no anima con %s", async (_n, props, red) => {
    reducido.mockReturnValue(red);
    const { getByText } = await render(
      <Presionable {...props}>
        <Text>Ir</Text>
      </Presionable>,
    );
    await fireEvent(getByText("Ir"), "pressIn");
    expect(withTiming).not.toHaveBeenCalled();
  });

  it("Skeleton con movimiento reducido no repite la animación", async () => {
    reducido.mockReturnValue(true);
    await render(<Skeleton ancho={10} alto={10} />);
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it("Skeleton con movimiento repite la animación", async () => {
    await render(<Skeleton ancho={10} alto={10} />);
    expect(withRepeat).toHaveBeenCalled();
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
