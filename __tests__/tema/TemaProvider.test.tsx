import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { TemaProvider, useTema } from "@/tema/TemaProvider";

const mockLeer = jest.fn();
const mockGuardar = jest.fn();
let mockSistema: "light" | "dark" | null = "dark";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => mockLeer(),
  guardarApariencia: (v: string) => mockGuardar(v),
}));
jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockSistema,
}));

function Consumidor() {
  const { esquema, alternarEsquema } = useTema();
  return (
    <Pressable accessibilityRole="button" onPress={alternarEsquema}>
      <Text>{esquema}</Text>
    </Pressable>
  );
}

describe("TemaProvider", () => {
  beforeEach(() => {
    mockSistema = "dark";
    mockLeer.mockReset();
    mockGuardar.mockReset().mockResolvedValue(undefined);
  });

  it("sin preferencia guardada usa el esquema del sistema", async () => {
    mockLeer.mockResolvedValue("sistema");
    await render(<TemaProvider><Consumidor /></TemaProvider>);
    expect(await screen.findByText("oscuro")).toBeTruthy();
  });

  it("con preferencia guardada la usa", async () => {
    mockLeer.mockResolvedValue("claro");
    await render(<TemaProvider><Consumidor /></TemaProvider>);
    expect(await screen.findByText("claro")).toBeTruthy();
  });

  it("alternarEsquema cambia y guarda", async () => {
    mockSistema = "light";
    mockLeer.mockResolvedValue("sistema");
    await render(<TemaProvider><Consumidor /></TemaProvider>);
    await screen.findByText("claro");
    await fireEvent.press(screen.getByRole("button"));
    expect(await screen.findByText("oscuro")).toBeTruthy();
    expect(mockGuardar).toHaveBeenCalledWith("oscuro");
  });

  it("si guardar falla, el cambio se mantiene", async () => {
    mockSistema = "light";
    mockLeer.mockResolvedValue("sistema");
    mockGuardar.mockRejectedValue(new Error("fallo"));
    await render(<TemaProvider><Consumidor /></TemaProvider>);
    await screen.findByText("claro");
    await fireEvent.press(screen.getByRole("button"));
    await act(async () => {});
    await waitFor(() => expect(mockGuardar).toHaveBeenCalled());
    expect(screen.getByText("oscuro")).toBeTruthy();
  });
});
