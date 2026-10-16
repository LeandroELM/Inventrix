import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Usuarios from "../../app/(app)/administracion/usuarios/index";
import { EspacioInferiorContext } from "@/components/BarraInferior";
import { TemaProvider } from "@/tema/TemaProvider";
import type { Usuario } from "@/features/usuarios/api";

const mockPush = jest.fn();
const mockUseUsuarios = jest.fn();

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useIsFocused: () => true,
  Redirect: () => null,
}));
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    perfil: { id: "u1", usuario: "ana.lopez", nombre: "Ana López", rol: "admin" },
  }),
}));
jest.mock("@/features/usuarios/hooks", () => ({ useUsuarios: () => mockUseUsuarios() }));
jest.mock("@/features/configuracion/apariencia", () => ({
  leerApariencia: () => Promise.resolve("claro"),
  guardarApariencia: () => Promise.resolve(),
}));
jest.mock("react-native-reanimated", () => {
  const mock = require("react-native-reanimated/mock");
  return { ...mock, useReducedMotion: () => true };
});

const ANA: Usuario = {
  id: "u1",
  usuario: "ana.lopez",
  nombre: "Ana López",
  rol: "admin",
  activo: true,
};
const CARLOS: Usuario = {
  id: "u2",
  usuario: "carlos.m",
  nombre: "Carlos Mejía",
  rol: "operativo",
  activo: true,
};
const LUIS: Usuario = {
  id: "u3",
  usuario: "luis.r",
  nombre: "Luis Ruiz",
  rol: "operativo",
  activo: false,
};

const refetch = jest.fn();

async function montar(
  estado: Partial<{ data: Usuario[]; isPending: boolean; isError: boolean }>,
  conEspacio = false,
) {
  mockUseUsuarios.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch,
    ...estado,
  });
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: conEspacio ? 24 : 0 },
      }}
    >
      <TemaProvider>
        <EspacioInferiorContext.Provider value={conEspacio}>
          <Usuarios />
        </EspacioInferiorContext.Provider>
      </TemaProvider>
    </SafeAreaProvider>,
  );
}

describe("Lista de usuarios", () => {
  beforeEach(() => jest.clearAllMocks());

  it("separa activos e inactivos y marca la cuenta propia", async () => {
    await montar({ data: [ANA, CARLOS, LUIS] });
    expect(screen.getByRole("header", { name: "Usuarios" })).toBeTruthy();
    expect(screen.getByText("Activos (2)")).toBeTruthy();
    expect(screen.getByText("Inactivos (1)")).toBeTruthy();
    expect(screen.getByText("Ana López (tú)")).toBeTruthy();
    expect(screen.getByText("@carlos.m · Operativo")).toBeTruthy();
    expect(screen.getByText("@ana.lopez · Administrador")).toBeTruthy();
    expect(screen.getByText("Inactivo")).toBeTruthy();
  });

  it("sin inactivos no muestra esa sección", async () => {
    await montar({ data: [ANA, CARLOS] });
    expect(screen.queryByText(/Inactivos/)).toBeNull();
  });

  it("navega a la ficha y a Nuevo usuario", async () => {
    await montar({ data: [ANA, CARLOS, LUIS] });
    await fireEvent.press(screen.getByText("Carlos Mejía"));
    expect(mockPush).toHaveBeenCalledWith("/administracion/usuarios/u2");
    await fireEvent.press(screen.getByRole("button", { name: "Nuevo usuario" }));
    expect(mockPush).toHaveBeenCalledWith("/administracion/usuarios/nuevo");
  });

  it("primera carga: esqueletos; error: reintentar", async () => {
    await montar({ isPending: true });
    expect(screen.getAllByLabelText("Cargando").length).toBeGreaterThan(0);
    await screen.unmount();
    await montar({ isError: true });
    expect(screen.getByText("No se pudo cargar la lista de usuarios.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Reintentar"));
    expect(refetch).toHaveBeenCalled();
  });

  it("deja espacio final para la barra y Trix", async () => {
    await montar({ data: [ANA] }, true);
    const estilo = StyleSheet.flatten(
      screen.getByTestId("contenido-principal").props.contentContainerStyle,
    );
    expect(estilo.paddingBottom).toBe(16 + 162);
  });
});
