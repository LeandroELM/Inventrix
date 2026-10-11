import { act, renderHook } from "@testing-library/react-native";
import { useAbrirDesdeNotificacion } from "@/features/alertas/useAbrirDesdeNotificacion";

const mockPush = jest.fn();
const mockRemove = jest.fn();
const mockAdd = jest.fn();
const mockUltima = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: (...a: unknown[]) => mockAdd(...a),
  getLastNotificationResponseAsync: () => mockUltima(),
}));

type Resp = { notification: { request: { identifier: string; content: { data: unknown } } } };
const resp = (identifier: string, ruta: unknown): Resp => ({
  notification: { request: { identifier, content: { data: { ruta } } } },
});
const emitir = (r: Resp) => mockAdd.mock.calls[0][0](r);

describe("useAbrirDesdeNotificacion", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRemove.mockReset();
    mockAdd.mockReset().mockReturnValue({ remove: mockRemove });
    mockUltima.mockReset().mockResolvedValue(null);
  });

  it("difiere el toque sin sesión y navega una sola vez al estar listo", async () => {
    const { rerender } = await renderHook((p: { listo: boolean }) => useAbrirDesdeNotificacion(p.listo), {
      initialProps: { listo: false },
    });
    await act(async () => emitir(resp("a", "/administracion/pedir")));
    expect(mockPush).not.toHaveBeenCalled();
    await rerender({ listo: true });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/administracion/pedir");
    await rerender({ listo: false });
    await rerender({ listo: true });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("la respuesta de arranque en frío y la del listener (mismo id) navegan una vez", async () => {
    mockUltima.mockResolvedValue(resp("a", "/administracion/pedir"));
    await renderHook(() => useAbrirDesdeNotificacion(true));
    await act(async () => emitir(resp("a", "/administracion/pedir")));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("ignora rutas no internas", async () => {
    await renderHook(() => useAbrirDesdeNotificacion(true));
    await act(async () => emitir(resp("a", "https://malo.com")));
    await act(async () => emitir(resp("b", "//malo.com")));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("quita la suscripción al desmontar y no la recrea al cambiar la sesión", async () => {
    const { rerender, unmount } = await renderHook((p: { listo: boolean }) => useAbrirDesdeNotificacion(p.listo), {
      initialProps: { listo: false },
    });
    await rerender({ listo: true });
    await rerender({ listo: false });
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockRemove).not.toHaveBeenCalled();
    await unmount();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
