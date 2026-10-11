import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import Soporte from "../../app/soporte";

const mockEnviar = jest.fn();
jest.mock("@/features/soporte/api", () => ({
  enviarPregunta: (...args: unknown[]) => mockEnviar(...args),
  MAX_CARACTERES: 2000,
}));
let mockRol = "operativo";
jest.mock("@/features/auth/AuthProvider", () => ({
  useAuth: () => ({ perfil: { id: "1", usuario: "a", nombre: "A", rol: mockRol } }),
}));

const SALUDO = "¡Hola! Soy el asistente virtual del sistema de inventarios. ¿En qué puedo ayudarte?";

async function preguntar(texto: string) {
  await fireEvent.changeText(screen.getByLabelText("Escribe tu pregunta"), texto);
  await fireEvent.press(screen.getByRole("button", { name: "Enviar" }));
}

describe("Soporte", () => {
  const original = process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP;
  beforeEach(() => {
    mockEnviar.mockReset();
    mockRol = "operativo";
    process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP = "50588887777";
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP;
    else process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP = original;
    jest.restoreAllMocks();
  });

  it("muestra el saludo y sugerencias según el rol", async () => {
    await render(<Soporte />);
    expect(screen.getByText(SALUDO)).toBeTruthy();
    expect(screen.queryByText("¿Cómo genero un reporte?")).toBeNull();
    await screen.unmount();
    mockRol = "admin";
    await render(<Soporte />);
    expect(screen.getByText("¿Cómo genero un reporte?")).toBeTruthy();
  });

  it("envía la pregunta y muestra la respuesta sin WhatsApp si resuelto", async () => {
    mockEnviar.mockResolvedValue({ respuesta: "Ve a Movimientos.", resuelto: true });
    await render(<Soporte />);
    await preguntar("¿Cómo registro una salida?");
    expect(await screen.findByText("Ve a Movimientos.")).toBeTruthy();
    expect(screen.getByText("¿Cómo registro una salida?")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Contactar soporte por WhatsApp" })).toBeNull();
    expect(mockEnviar).toHaveBeenCalledWith([{ rol: "usuario", texto: "¿Cómo registro una salida?" }]);
  });

  it("con resuelto false ofrece WhatsApp y abre el enlace con la última pregunta", async () => {
    mockEnviar.mockResolvedValue({ respuesta: "No encontré eso.", resuelto: false });
    await render(<Soporte />);
    await preguntar("Algo raro");
    await fireEvent.press(await screen.findByRole("button", { name: "Contactar soporte por WhatsApp" }));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(url.startsWith("https://wa.me/50588887777?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Mi consulta es: Algo raro");
  });

  it("sin número configurado no se rompe y no muestra el botón", async () => {
    process.env.EXPO_PUBLIC_SOPORTE_WHATSAPP = "";
    mockEnviar.mockResolvedValue({ respuesta: "No encontré eso.", resuelto: false });
    await render(<Soporte />);
    await preguntar("Algo raro");
    expect(await screen.findByText("No encontré eso.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Contactar soporte por WhatsApp" })).toBeNull();
    expect(screen.getByText("El contacto por WhatsApp no está disponible por ahora.")).toBeTruthy();
  });
});
