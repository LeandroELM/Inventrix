import { validarContrasenaNueva } from "@/features/configuracion/contrasena";

describe("validarContrasenaNueva", () => {
  it("rechaza menos de 8 caracteres", () => {
    expect(validarContrasenaNueva("1234567", "1234567")).toBe("La contraseña debe tener al menos 8 caracteres.");
  });
  it("rechaza confirmación distinta", () => {
    expect(validarContrasenaNueva("12345678", "12345679")).toBe("Las contraseñas no coinciden.");
  });
  it("acepta 8 caracteres iguales", () => {
    expect(validarContrasenaNueva("12345678", "12345678")).toBeNull();
  });
});
