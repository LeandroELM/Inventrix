import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";

const mockSignOut = jest.fn();
const mockSignIn = jest.fn();
const mockGetSession = jest.fn();
const mockSingle = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: () => mockSignOut(),
      signInWithPassword: (a: unknown) => mockSignIn(a),
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => mockSingle() }) }) }),
  },
}));

const PERFIL = { id: "u1", usuario: "ana.lopez", nombre: "Ana", rol: "admin", activo: true };
let auth: ReturnType<typeof useAuth>;
function Sonda() {
  auth = useAuth();
  return <Text>estado:{auth.estado}</Text>;
}
const montar = () =>
  render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue({});
  mockGetSession.mockResolvedValue({ data: { session: null } });
});

describe("AuthProvider", () => {
  it("arranque con sesión válida -> autenticado", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSingle.mockResolvedValue({ data: PERFIL, error: null });
    await montar();
    expect(await screen.findByText("estado:autenticado")).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("arranque con error de red al cargar perfil -> error, sin signOut", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: "Network request failed" } });
    await montar();
    expect(await screen.findByText("estado:error")).toBeTruthy();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("perfil inactivo en login -> signOut y error de login", async () => {
    mockSignIn.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSingle.mockResolvedValue({ data: { ...PERFIL, activo: false }, error: null });
    await montar();
    await waitFor(() => expect(auth.estado).toBe("anonimo"));
    await expect(auth.iniciarSesion("ana.lopez", "x")).rejects.toThrow("No fue posible iniciar sesión. Verifica tus datos.");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("error de red en login -> relanza el original y no cierra sesión", async () => {
    const red = { message: "Network request failed" };
    mockSignIn.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: red });
    await montar();
    await waitFor(() => expect(auth.estado).toBe("anonimo"));
    await expect(auth.iniciarSesion("ana.lopez", "x")).rejects.toBe(red);
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
