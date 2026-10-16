import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  ALFABETO_CONTRASENA,
  emailDeUsuario,
  generarContrasena,
  LARGO_CONTRASENA,
  validarSolicitud,
} from "./logica.ts";

Deno.test("validarSolicitud acepta crear y restablecer válidos", () => {
  assertEquals(validarSolicitud({ accion: "crear", usuario: "ana.lopez", nombre: "Ana", rol: "operativo" }), {
    accion: "crear",
    usuario: "ana.lopez",
    nombre: "Ana",
    rol: "operativo",
  });
  const id = "6f1c2a7e-0b1d-4c3e-9f00-1234567890ab";
  assertEquals(validarSolicitud({ accion: "restablecer", id }), { accion: "restablecer", id });
});

Deno.test("validarSolicitud normaliza el id a minúsculas (la comparación con el llamador es exacta)", () => {
  const s = validarSolicitud({ accion: "restablecer", id: "6F1C2A7E-0B1D-4C3E-9F00-1234567890AB" });
  assertEquals(s.accion === "restablecer" ? s.id : null, "6f1c2a7e-0b1d-4c3e-9f00-1234567890ab");
});

Deno.test("validarSolicitud recorta el nombre", () => {
  const s = validarSolicitud({ accion: "crear", usuario: "ana", nombre: "  Ana  ", rol: "admin" });
  assertEquals(s.accion === "crear" ? s.nombre : null, "Ana");
});

Deno.test("validarSolicitud rechaza entradas inválidas", () => {
  const base = { accion: "crear", usuario: "ana.lopez", nombre: "Ana", rol: "admin" };
  for (const malo of [
    null,
    {},
    { ...base, accion: "borrar" },
    { ...base, usuario: "Ana Lopez" },
    { ...base, usuario: "ab" },
    { ...base, rol: "root" },
    { ...base, nombre: "   " },
    { ...base, nombre: "x".repeat(121) },
    { accion: "restablecer", id: "no-es-uuid" },
    { accion: "restablecer" },
  ]) {
    assertThrows(() => validarSolicitud(malo), Error, "DATOS_INVALIDOS");
  }
});

Deno.test("generarContrasena: 10 caracteres del alfabeto y distinta en cada llamada", () => {
  const a = generarContrasena();
  assertEquals(a.length, LARGO_CONTRASENA);
  for (const c of a) assertEquals(ALFABETO_CONTRASENA.includes(c), true);
  assertEquals(new Set(Array.from({ length: 50 }, generarContrasena)).size, 50);
});

Deno.test("emailDeUsuario usa el dominio sintético", () => {
  assertEquals(emailDeUsuario("ana.lopez"), "ana.lopez@usuarios.inventrix.app");
});
