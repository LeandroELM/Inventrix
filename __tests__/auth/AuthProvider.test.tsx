import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";

const mockSignOut = jest.fn();
const mockSignIn = jest.fn();
const mockGetSession = jest.fn();
const mockSingle = jest.fn();
const mockClear = jest.fn();
let mockListener: ((evento: string, sesion: unknown) => void) | undefined;

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: (o?: unknown) => mockSignOut(o),
      signInWithPassword: (a: unknown) => mockSignIn(a),
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        mockListener = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => mockSingle() }) }) }),
  },
}));

const mockRegistrarPush = jest.fn();
const mockEliminarDispositivo = jest.fn();
jest.mock("@/features/alertas/push", () => ({
  registrarPush: () => mockRegistrarPush(),
  eliminarDispositivoActual: () => mockEliminarDispositivo(),
}));

jest.mock("@/lib/queryClient", () => ({
  queryClient: { clear: () => mockClear() },
  configurarCierrePorNoAutorizado: jest.fn(),
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
  mockRegistrarPush.mockResolvedValue("autorizado");
  mockEliminarDispositivo.mockResolvedValue(undefined);
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

  it("error de red en login -> relanza el original y limpia solo la sesión local", async () => {
    const red = { message: "Network request failed" };
    mockSignIn.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: red });
    await montar();
    await waitFor(() => expect(auth.estado).toBe("anonimo"));
    await expect(auth.iniciarSesion("ana.lopez", "x")).rejects.toBe(red);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(auth.estado).toBe("anonimo");
  });

  it("SIGNED_OUT forzado -> limpia la caché y queda anónimo", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSingle.mockResolvedValue({ data: PERFIL, error: null });
    await montar();
    expect(await screen.findByText("estado:autenticado")).toBeTruthy();
    mockClear.mockClear();
    await act(async () => {
      mockListener?.("SIGNED_OUT", null);
    });
    await waitFor(() => expect(auth.estado).toBe("anonimo"));
    expect(mockClear).toHaveBeenCalled();
  });

  it("reintentar con el perfil ya cargado termina en autenticado", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSingle.mockResolvedValue({ data: PERFIL, error: null });
    await montar();
    expect(await screen.findByText("estado:autenticado")).toBeTruthy();
    await act(async () => {
      await auth.reintentar();
    });
    expect(auth.estado).toBe("autenticado");
  });

  it("admin -> registra push una sola vez; un fallo no bloquea el acceso", async () => {
    mockRegistrarPush.mockRejectedValue(new Error("sin permiso"));
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSingle.mockResolvedValue({ data: PERFIL, error: null });
    await montar();
    expect(await screen.findByText("estado:autenticado")).toBeTruthy();
    await act(async () => {
      await auth.reintentar();
    });
    expect(mockRegistrarPush).toHaveBeenCalledTimes(1);
    aviso.mockRestore();
  });

  it("operativo -> no registra push", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u2" } } } });
    mockSingle.mockResolvedValue({ data: { ...PERFIL, id: "u2", rol: "operativo" }, error: null });
    await montar();
    expect(await screen.findByText("estado:autenticado")).toBeTruthy();
    expect(mockRegistrarPush).not.toHaveBeenCalled();
  });

  it("cerrarSesion elimina el dispositivo antes de signOut y aunque falle sigue", async () => {
    const orden: string[] = [];
    mockEliminarDispositivo.mockImplementation(async () => void orden.push("eliminar"));
    mockSignOut.mockImplementation(async () => void orden.push("signOut"));
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSingle.mockResolvedValue({ data: PERFIL, error: null });
    await montar();
    expect(await screen.findByText("estado:autenticado")).toBeTruthy();
    await act(async () => {
      await auth.cerrarSesion();
    });
    expect(orden).toEqual(["eliminar", "signOut"]);
    expect(auth.estado).toBe("anonimo");
  });

  it("cerrarSesion no se cuelga si eliminar_dispositivo nunca resuelve", async () => {
    mockEliminarDispositivo.mockReturnValue(new Promise(() => undefined));
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockSingle.mockResolvedValue({ data: PERFIL, error: null });
    await montar();
    expect(await screen.findByText("estado:autenticado")).toBeTruthy();
    jest.useFakeTimers();
    let cierre: Promise<void> | undefined;
    await act(async () => {
      cierre = auth.cerrarSesion();
      await jest.advanceTimersByTimeAsync(3000);
      await cierre;
    });
    jest.useRealTimers();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
