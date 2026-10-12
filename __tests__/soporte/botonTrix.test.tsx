import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BotonTrix } from "@/features/soporte/BotonTrix";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
let mockTeclado = false;
jest.mock("@/lib/useTecladoVisible", () => ({ useTecladoVisible: () => mockTeclado }));

async function montar() {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 800 },
        insets: { top: 24, left: 0, right: 0, bottom: 0 },
      }}
    >
      <BotonTrix />
    </SafeAreaProvider>,
  );
}

describe("BotonTrix", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockTeclado = false;
  });

  it("abre el panel de soporte", async () => {
    await montar();
    await fireEvent.press(screen.getByLabelText("Abrir asistente Trix"));
    expect(mockPush).toHaveBeenCalledWith("/soporte");
  });

  it("no se dibuja con el teclado visible", async () => {
    mockTeclado = true;
    await montar();
    expect(screen.queryByLabelText("Abrir asistente Trix")).toBeNull();
  });
});
