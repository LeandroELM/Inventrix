import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { RequiereRol } from "@/features/auth/RequiereRol";

let mockPerfil: { rol: "admin" | "operativo" } | null = null;
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: mockPerfil }),
}));
jest.mock("expo-router", () => {
  const { Text: T } = jest.requireActual("react-native");
  return { Redirect: ({ href }: { href: string }) => <T>redirige:{href}</T> };
});

describe("RequiereRol", () => {
  it("muestra los hijos si el rol coincide", async () => {
    mockPerfil = { rol: "admin" };
    await render(<RequiereRol rol="admin"><Text>secreto</Text></RequiereRol>);
    expect(screen.getByText("secreto")).toBeTruthy();
  });

  it("redirige a / si el rol no coincide", async () => {
    mockPerfil = { rol: "operativo" };
    await render(<RequiereRol rol="admin"><Text>secreto</Text></RequiereRol>);
    expect(screen.queryByText("secreto")).toBeNull();
    expect(screen.getByText("redirige:/")).toBeTruthy();
  });
});
