import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { emailDeUsuario, validarAltaUsuario } from "./logica.ts";

Deno.test("rechaza usuario con mayúsculas y espacios", () => {
  assertThrows(
    () => validarAltaUsuario({ usuario: "Ana Lopez", nombre: "Ana", rol: "admin", password: "12345678" }),
    Error,
    "DATOS_INVALIDOS",
  );
});

Deno.test("rechaza contraseña corta, rol inválido y nombre vacío", () => {
  const base = { usuario: "ana.lopez", nombre: "Ana", rol: "admin", password: "12345678" };
  assertThrows(() => validarAltaUsuario({ ...base, password: "1234567" }), Error, "DATOS_INVALIDOS");
  assertThrows(() => validarAltaUsuario({ ...base, rol: "root" }), Error, "DATOS_INVALIDOS");
  assertThrows(() => validarAltaUsuario({ ...base, nombre: "  " }), Error, "DATOS_INVALIDOS");
  assertThrows(() => validarAltaUsuario(null), Error, "DATOS_INVALIDOS");
});

Deno.test("acepta una alta válida", () => {
  const entrada = { usuario: "ana.lopez", nombre: "Ana", rol: "admin", password: "12345678" };
  assertEquals(validarAltaUsuario(entrada), entrada);
});

Deno.test("emailDeUsuario usa el dominio sintético", () => {
  assertEquals(emailDeUsuario("ana.lopez"), "ana.lopez@usuarios.inventrix.app");
});
