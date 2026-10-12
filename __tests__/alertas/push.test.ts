import { eliminarDispositivoActual, registrarPush } from "@/features/alertas/push";

const mockRpc = jest.fn();
const mockGetItem = jest.fn();
const mockDeleteItem = jest.fn();
const mockSetItem = jest.fn();
const mockGetToken = jest.fn();
const mockPermisos = jest.fn();
const mockPedirPermisos = jest.fn();
const mockCanal = jest.fn();
const mockConstants: { expoConfig: { extra?: { eas?: { projectId?: string } } }; executionEnvironment: string } = {
  expoConfig: {},
  executionEnvironment: "standalone",
};
const mockDevice = { isDevice: true };

jest.mock("@/lib/supabase", () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  ExecutionEnvironment: { StoreClient: "storeClient" },
  get default() {
    return mockConstants;
  },
}));
jest.mock("expo-device", () => ({
  get isDevice() {
    return mockDevice.isDevice;
  },
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: (...a: unknown[]) => mockGetItem(...a),
  setItemAsync: (...a: unknown[]) => mockSetItem(...a),
  deleteItemAsync: (...a: unknown[]) => mockDeleteItem(...a),
}));
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationChannelAsync: (...a: unknown[]) => mockCanal(...a),
  getPermissionsAsync: () => mockPermisos(),
  requestPermissionsAsync: () => mockPedirPermisos(),
  getExpoPushTokenAsync: (a: unknown) => mockGetToken(a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDevice.isDevice = true;
  mockConstants.executionEnvironment = "standalone";
  mockConstants.expoConfig = { extra: { eas: { projectId: "pid" } } };
  mockPermisos.mockResolvedValue({ status: "granted" });
  mockGetToken.mockResolvedValue({ data: "ExponentPushToken[x]" });
  mockRpc.mockResolvedValue({ error: null });
});

describe("registrarPush", () => {
  it("en Expo Go -> no_disponible sin cargar expo-notifications", async () => {
    mockConstants.executionEnvironment = "storeClient";
    await expect(registrarPush()).resolves.toBe("no_disponible");
    expect(mockPermisos).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("sin projectId -> no_disponible sin lanzar ni tocar permisos", async () => {
    mockConstants.expoConfig = {};
    await expect(registrarPush()).resolves.toBe("no_disponible");
    expect(mockPermisos).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("en emulador -> no_disponible", async () => {
    mockDevice.isDevice = false;
    await expect(registrarPush()).resolves.toBe("no_disponible");
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("permiso denegado -> denegado", async () => {
    mockPermisos.mockResolvedValue({ status: "undetermined" });
    mockPedirPermisos.mockResolvedValue({ status: "denied" });
    await expect(registrarPush()).resolves.toBe("denegado");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("autorizado -> registra el token vía RPC y lo guarda", async () => {
    await expect(registrarPush()).resolves.toBe("autorizado");
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: "pid" });
    expect(mockRpc).toHaveBeenCalledWith("registrar_dispositivo", { p_token: "ExponentPushToken[x]" });
    expect(mockSetItem).toHaveBeenCalledWith("inventrix.push_token", "ExponentPushToken[x]");
  });
});

describe("eliminarDispositivoActual", () => {
  it("sin token guardado no llama a la RPC", async () => {
    mockGetItem.mockResolvedValue(null);
    await eliminarDispositivoActual();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("elimina el token guardado y no lanza ante fallos", async () => {
    mockGetItem.mockResolvedValue("tok");
    await eliminarDispositivoActual();
    expect(mockRpc).toHaveBeenCalledWith("eliminar_dispositivo", { p_token: "tok" });
    expect(mockDeleteItem).toHaveBeenCalledWith("inventrix.push_token");
    mockRpc.mockRejectedValue(new Error("red"));
    await expect(eliminarDispositivoActual()).resolves.toBeUndefined();
  });

  it("si la RPC resuelve con error conserva el token y no lanza", async () => {
    mockGetItem.mockResolvedValue("tok");
    mockRpc.mockResolvedValue({ error: { message: "x" } });
    await expect(eliminarDispositivoActual()).resolves.toBeUndefined();
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });
});
