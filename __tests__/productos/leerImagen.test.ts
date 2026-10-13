const mockLaunch = jest.fn();
const mockScan = jest.fn();
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: (...a: unknown[]) => mockLaunch(...a) }));
jest.mock("expo-camera", () => ({ scanFromURLAsync: (...a: unknown[]) => mockScan(...a) }));

import { leerCodigoDeImagen, TIPOS_CODIGO } from "@/features/productos/leerImagen";

beforeEach(() => jest.clearAllMocks());

describe("leerCodigoDeImagen", () => {
  it("cancelado", async () => {
    mockLaunch.mockResolvedValue({ canceled: true, assets: null });
    await expect(leerCodigoDeImagen()).resolves.toEqual({ estado: "cancelado" });
    expect(mockLaunch).toHaveBeenCalledWith({ mediaTypes: ["images"], quality: 1 });
    expect(mockScan).not.toHaveBeenCalled();
  });

  it("sin lecturas", async () => {
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: "file://a.png" }] });
    mockScan.mockResolvedValue([]);
    await expect(leerCodigoDeImagen()).resolves.toEqual({ estado: "sin-codigo" });
    expect(mockScan).toHaveBeenCalledWith("file://a.png", [...TIPOS_CODIGO]);
  });

  it("normaliza la lectura", async () => {
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: "file://a.png" }] });
    mockScan.mockResolvedValue([{ data: " 750 123 " }]);
    await expect(leerCodigoDeImagen()).resolves.toEqual({ estado: "ok", codigo: "750123" });
  });

  it("propaga errores", async () => {
    const error = new Error("fallo");
    mockLaunch.mockRejectedValue(error);
    await expect(leerCodigoDeImagen()).rejects.toBe(error);
  });
});
