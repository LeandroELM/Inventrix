import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Linking } from "react-native";
import Soporte from "../../app/soporte";
import { PREGUNTAS_RAPIDAS } from "@/features/soporte/preguntas";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));
const mockEnviar = jest.fn();
jest.mock("@/features/soporte/api", () => ({
  enviarPregunta: (...args: unknown[]) => mockEnviar(...args),
  MAX_CARACTERES: 2000,
}));
let mockRol = "operativo";
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "Ana", rol: mockRol } }),
}));

const METRICAS = {
  frame: { x: 0, y: 0, width: 360, height: 800 },
  insets: { top: 24, left: 0, right: 0, bottom: 0 },
};
function Proveedor({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider initialMetrics={METRICAS}>{children}</SafeAreaProvider>;
}

const SALUDO = "¡Hola, Ana! Soy Trix. ¿En qué te ayudo?";
const BOTON_WA = { name: "Contactar soporte por WhatsApp" };

async function preguntar(texto: string) {
  await fireEvent.changeText(screen.getByLabelText("Escribe tu pregunta"), texto);
  await fireEvent.press(screen.getByRole("button", { name: "Enviar" }));
}

describe("Soporte", () => {
  const original = process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP;
  beforeEach(() => {
    mockEnviar.mockReset();
    mockBack.mockReset();
    mockRol = "operativo";
    process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP = "50588887777";
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockClear();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP;
    else process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP = original;
    jest.restoreAllMocks();
  });

  it("saluda por nombre como Trix", async () => {
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    expect(screen.getByText(SALUDO)).toBeTruthy();
  });

  it("muestra las cuatro preguntas rápidas para ambos roles", async () => {
    for (const rol of ["admin", "operativo"]) {
      mockRol = rol;
      await render(
        <Proveedor>
          <Soporte />
        </Proveedor>,
      );
      expect(PREGUNTAS_RAPIDAS).toHaveLength(4);
      for (const q of PREGUNTAS_RAPIDAS) expect(screen.getByText(q)).toBeTruthy();
      await screen.unmount();
    }
  });

  it("una pregunta rápida se envía al chatbot", async () => {
    mockEnviar.mockResolvedValue({ respuesta: "Es el mínimo.", resuelto: true });
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    await fireEvent.press(screen.getByText("¿Qué es el punto de pedido?"));
    expect(mockEnviar).toHaveBeenCalledWith([
      { rol: "usuario", texto: "¿Qué es el punto de pedido?" },
    ]);
    expect(await screen.findByText("Es el mínimo.")).toBeTruthy();
  });

  it("el botón de WhatsApp siempre está disponible", async () => {
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    await fireEvent.press(screen.getByRole("button", BOTON_WA));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(url.startsWith("https://wa.me/50588887777?text=")).toBe(true);
  });

  it("tocar fuera cierra el panel", async () => {
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    await fireEvent.press(screen.getByLabelText("Cerrar"));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it("envía la pregunta y muestra la respuesta", async () => {
    mockEnviar.mockResolvedValue({ respuesta: "Ve a Movimientos.", resuelto: true });
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    await preguntar("¿Cómo registro una salida?");
    expect(await screen.findByText("Ve a Movimientos.")).toBeTruthy();
    expect(screen.getByText("¿Cómo registro una salida?")).toBeTruthy();
    expect(mockEnviar).toHaveBeenCalledWith([
      { rol: "usuario", texto: "¿Cómo registro una salida?" },
    ]);
  });

  it("abre WhatsApp con la última pregunta tras una respuesta no resuelta", async () => {
    mockEnviar.mockResolvedValue({ respuesta: "No encontré eso.", resuelto: false });
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    await preguntar("Algo raro");
    await screen.findByText("No encontré eso.");
    await fireEvent.press(screen.getByRole("button", BOTON_WA));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain("Mi consulta es: Algo raro");
  });

  it("si WhatsApp no abre muestra un error", async () => {
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error("x"));
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    await fireEvent.press(screen.getByRole("button", BOTON_WA));
    expect(await screen.findByText("No se pudo abrir WhatsApp.")).toBeTruthy();
  });

  it("sin número configurado no se rompe y no muestra el botón", async () => {
    process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP = "";
    mockEnviar.mockResolvedValue({ respuesta: "No encontré eso.", resuelto: false });
    await render(
      <Proveedor>
        <Soporte />
      </Proveedor>,
    );
    await preguntar("Algo raro");
    expect(await screen.findByText("No encontré eso.")).toBeTruthy();
    expect(screen.queryByRole("button", BOTON_WA)).toBeNull();
    expect(screen.getByText("El contacto por WhatsApp no está disponible por ahora.")).toBeTruthy();
  });
});
