import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/inter";
import { CargadorFuentes } from "@/tema/CargadorFuentes";

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@expo-google-fonts/inter", () => ({
  useFonts: jest.fn(),
  Inter_400Regular: 1,
  Inter_600SemiBold: 2,
  Inter_700Bold: 3,
}));

const mockUseFonts = useFonts as jest.Mock;

describe("CargadorFuentes", () => {
  beforeEach(() => {
    (SplashScreen.hideAsync as jest.Mock).mockClear();
  });

  it("si la fuente falla la app se renderiza", async () => {
    mockUseFonts.mockReturnValue([false, new Error("x")]);
    await render(<CargadorFuentes><Text>hijo</Text></CargadorFuentes>);
    expect(screen.getByText("hijo")).toBeTruthy();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it("mientras carga no renderiza", async () => {
    mockUseFonts.mockReturnValue([false, null]);
    await render(<CargadorFuentes><Text>hijo</Text></CargadorFuentes>);
    expect(screen.queryByText("hijo")).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
