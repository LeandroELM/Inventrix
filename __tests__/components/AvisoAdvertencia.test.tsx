import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { PALETAS } from "@/tema/tokens";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));

jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

async function montar(ui: React.ReactElement) {
  await render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <TemaProvider>{ui}</TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("AvisoAdvertencia", () => {
  it("muestra el texto", async () => {
    await montar(<AvisoAdvertencia texto="Revisa los datos" />);
    expect(screen.getByText("Revisa los datos")).toBeTruthy();
  });

  it("usa rol de alerta solo si alerta es true", async () => {
    await montar(<AvisoAdvertencia texto="Con alerta" alerta />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("sin alerta no usa rol de alerta", async () => {
    await montar(<AvisoAdvertencia texto="Sin alerta" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tono peligro usa textoPeligro", async () => {
    await montar(<AvisoAdvertencia texto="Peligro" tono="peligro" />);
    expect(screen.getByText("Peligro")).toHaveStyle({ color: PALETAS.claro.textoPeligro });
  });
});
