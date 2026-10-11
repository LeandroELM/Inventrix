import { enlaceWhatsApp } from "@/features/soporte/whatsapp";

describe("enlaceWhatsApp", () => {
  it("arma el enlace con el mensaje codificado", () => {
    expect(enlaceWhatsApp("50588887777", "El archivo sale vacío")).toBe(
      "https://wa.me/50588887777?text=Hola%2C%20necesito%20asistencia%20t%C3%A9cnica%20con%20el%20sistema%20de%20control%20de%20inventarios.%20Mi%20consulta%20es%3A%20El%20archivo%20sale%20vac%C3%ADo",
    );
  });

  it("deja solo dígitos en el número", () => {
    expect(enlaceWhatsApp("+505 8888-7777", "x")).toMatch(/^https:\/\/wa\.me\/50588887777\?text=/);
  });

  it("sin consulta termina en el texto base", () => {
    expect(enlaceWhatsApp("50588887777")).toMatch(/Mi%20consulta%20es%3A%20$/);
  });

  it("lanza si el número está vacío o sin dígitos", () => {
    expect(() => enlaceWhatsApp("", "x")).toThrow();
    expect(() => enlaceWhatsApp("  +- ", "x")).toThrow();
  });
});
