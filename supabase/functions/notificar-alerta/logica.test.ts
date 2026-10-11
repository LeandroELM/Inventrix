import { assertEquals } from "jsr:@std/assert@1";
import { construirMensajes, enLotes, secretoValido, tokensNoRegistrados } from "./logica.ts";

const alerta = { producto: "Detergente 1 kg", existencias: 3, puntoPedido: 10, unidad: "unidad" as const };

Deno.test("construye un mensaje por token", () => {
  const m = construirMensajes(alerta, ["t1", "t2"]);
  assertEquals(m.length, 2);
  assertEquals(m[0].to, "t1");
  assertEquals(m[0].title, "Reabastecer: Detergente 1 kg");
  assertEquals(m[0].body, "Quedan 3 unid. y su punto de pedido es 10 unid.");
  assertEquals(m[0].data.ruta, "/administracion/pedir");
  assertEquals(m[0].channelId, "alertas");
  assertEquals(m[0].sound, "default");
});

Deno.test("sin tokens no hay mensajes", () => {
  assertEquals(construirMensajes(alerta, []), []);
});

Deno.test("secretoValido exige coincidencia exacta y no vacía", () => {
  assertEquals(secretoValido("abc", "abc"), true);
  assertEquals(secretoValido("abd", "abc"), false);
  assertEquals(secretoValido("abcd", "abc"), false);
  assertEquals(secretoValido(null, "abc"), false);
  assertEquals(secretoValido("", ""), false);
  assertEquals(secretoValido("x", undefined), false);
});

Deno.test("enLotes parte en bloques de tamaño máximo", () => {
  assertEquals(enLotes([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assertEquals(enLotes([], 100), []);
});

Deno.test("tokensNoRegistrados detecta DeviceNotRegistered por posición", () => {
  const msgs = [{ to: "a" }, { to: "b" }, { to: "c" }];
  const tickets = [
    { status: "ok" as const },
    { status: "error" as const, details: { error: "DeviceNotRegistered" } },
    { status: "error" as const, details: { error: "MessageRateExceeded" } },
  ];
  assertEquals(tokensNoRegistrados(msgs, tickets), ["b"]);
});
