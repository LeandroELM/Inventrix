import { emailDeUsuario } from "@/features/auth/usuario";

describe("emailDeUsuario", () => {
  it("normaliza y agrega el dominio", () => {
    expect(emailDeUsuario("  Ana.Lopez ")).toBe("ana.lopez@usuarios.inventrix.app");
  });
});
