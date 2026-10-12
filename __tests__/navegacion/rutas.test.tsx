import { render, screen } from "@testing-library/react-native";
import Existencias from "../../app/(app)/administracion/existencias";
import Historial from "../../app/(app)/movimientos/historial";
import Administracion from "../../app/(app)/administracion/index";
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
  };
});
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { rol: "admin" } }),
}));

describe("rutas", () => {
  it("existencias redirige a /buscar", async () => {
    await render(<Existencias />);
    expect(screen.getByTestId("redirect").props.children).toBe("/buscar");
  });

  it("historial redirige a /movimientos", async () => {
    await render(<Historial />);
    expect(screen.getByTestId("redirect").props.children).toBe("/movimientos");
  });

  it("el menú de administración muestra solo Reportes y Dar de baja", async () => {
    await render(
      <TemaProvider>
        <Administracion />
      </TemaProvider>,
    );
    expect(screen.getByText("Reportes")).toBeTruthy();
    expect(screen.getByText("Dar de baja producto")).toBeTruthy();
    expect(screen.queryByText("Existencias")).toBeNull();
    expect(screen.queryByText("Productos a pedir")).toBeNull();
  });
});
