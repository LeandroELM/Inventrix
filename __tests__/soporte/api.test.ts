import { enviarPregunta, ventana, type MensajeChat } from "@/features/soporte/api";

const mockInvoke = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

const GENERICO = "Ocurrió un error. Intenta de nuevo.";
const uno: MensajeChat[] = [{ rol: "usuario", texto: "hola" }];

describe("enviarPregunta", () => {
  beforeEach(() => mockInvoke.mockReset());

  it("devuelve la respuesta 200", async () => {
    mockInvoke.mockResolvedValue({ data: { respuesta: "Listo", resuelto: true }, error: null });
    await expect(enviarPregunta(uno)).resolves.toEqual({ respuesta: "Listo", resuelto: true });
    expect(mockInvoke).toHaveBeenCalledWith("soporte-chat", { body: { mensajes: uno } });
  });

  it("usa la respuesta del cuerpo 503", async () => {
    const context = new Response(JSON.stringify({ respuesta: "Contacta a soporte", resuelto: false }), { status: 503 });
    mockInvoke.mockResolvedValue({ data: null, error: { message: "non-2xx", context } });
    await expect(enviarPregunta(uno)).resolves.toEqual({ respuesta: "Contacta a soporte", resuelto: false });
  });

  it("con cuerpo ilegible cae a mensajeDeError", async () => {
    const context = new Response("no es json", { status: 503 });
    mockInvoke.mockResolvedValue({ data: null, error: { message: "x", context } });
    await expect(enviarPregunta(uno)).resolves.toEqual({ respuesta: GENERICO, resuelto: false });
  });

  it("sin context cae a mensajeDeError (sin conexión)", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "Network request failed" } });
    const r = await enviarPregunta(uno);
    expect(r.resuelto).toBe(false);
    expect(r.respuesta).toBe("Sin conexión. Revisa tu internet e intenta de nuevo.");
  });

  it("nunca lanza, aunque invoke rechace o devuelva datos inválidos", async () => {
    mockInvoke.mockRejectedValue(new Error("boom"));
    await expect(enviarPregunta(uno)).resolves.toEqual({ respuesta: GENERICO, resuelto: false });
    mockInvoke.mockResolvedValue({ data: { otra: 1 }, error: null });
    await expect(enviarPregunta(uno)).resolves.toEqual({ respuesta: GENERICO, resuelto: false });
  });

  it("envía como máximo 20 mensajes y la ventana termina en usuario", async () => {
    const largo: MensajeChat[] = Array.from({ length: 31 }, (_, i) => ({
      rol: i % 2 === 0 ? "usuario" : "asistente",
      texto: `m${i}`,
    }));
    mockInvoke.mockResolvedValue({ data: { respuesta: "ok", resuelto: true }, error: null });
    await enviarPregunta(largo);
    const enviados = (mockInvoke.mock.calls[0][1] as { body: { mensajes: MensajeChat[] } }).body.mensajes;
    expect(enviados).toHaveLength(19);
    expect(enviados[0].rol).toBe("usuario");
    expect(enviados[enviados.length - 1]).toEqual(largo[30]);
    expect(enviados[enviados.length - 1].rol).toBe("usuario");
    expect(ventana(largo)).toHaveLength(19);
  });

  it("la ventana no empieza con un turno del asistente", () => {
    const m: MensajeChat[] = [
      { rol: "asistente", texto: "a0" },
      { rol: "usuario", texto: "u1" },
      { rol: "asistente", texto: "a1" },
      { rol: "usuario", texto: "u2" },
    ];
    expect(ventana(m)).toEqual(m.slice(1));
    expect(ventana([{ rol: "asistente", texto: "solo" }])).toEqual([]);
  });
});
