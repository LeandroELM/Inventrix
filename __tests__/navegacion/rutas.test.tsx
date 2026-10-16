import { render, screen } from "@testing-library/react-native";
import Administracion from "../../app/(app)/(tabs)/administracion";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TemaProvider } from "@/tema/TemaProvider";

jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
    Link: ({ children }: { children: React.ReactNode }) => children,
    useRouter: () => ({ push: jest.fn() }),
    useIsFocused: () => true,
  };
});
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { rol: "admin" } }),
}));

describe("rutas", () => {
  it("el menú de administración muestra Reportes, Historial, Usuarios y Dar de baja", async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
      >
        <TemaProvider>
          <Administracion />
        </TemaProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText("Reportes")).toBeTruthy();
    expect(screen.getByText("Indicadores, gráfico y exportación a Excel")).toBeTruthy();
    expect(screen.getByText("Historial de movimientos")).toBeTruthy();
    expect(screen.getByText("Usuarios")).toBeTruthy();
    expect(screen.getByText("Altas, roles, contraseñas y acceso")).toBeTruthy();
    expect(screen.getByText("Dar de baja producto")).toBeTruthy();
    expect(screen.getByText("Retira un producto del catálogo")).toBeTruthy();
    expect(screen.queryByText("Existencias")).toBeNull();
    expect(screen.queryByText("Productos a pedir")).toBeNull();
  });
});
