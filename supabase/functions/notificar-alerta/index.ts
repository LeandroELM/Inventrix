import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";
import type { Unidad } from "../_shared/unidades.ts";
import { construirMensajes, enLotes, secretoValido, tokensNoRegistrados } from "./logica.ts";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "METODO_NO_PERMITIDO" }, 405);
  if (!secretoValido(req.headers.get("x-webhook-secret"), Deno.env.get("WEBHOOK_SECRET"))) {
    return json({ error: "NO_AUTENTICADO" }, 401);
  }

  try {
    const cuerpo = await req.json().catch(() => null);
    const productoId = cuerpo?.record?.producto_id;
    if (typeof productoId !== "string") return json({ error: "DATOS_INVALIDOS" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: producto, error: errorProducto } = await admin
      .from("productos")
      .select("nombre, existencias, punto_pedido, unidad")
      .eq("id", productoId)
      .single();
    if (errorProducto && errorProducto.code !== "PGRST116") {
      console.error("PRODUCTO_ERROR", errorProducto.message);
      return json({ error: "ERROR_INTERNO" }, 500);
    }
    if (!producto) return json({ error: "PRODUCTO_NO_ENCONTRADO" }, 404);

    // Solo dispositivos de admins activos.
    const { data: filas, error } = await admin
      .from("dispositivos")
      .select("token, perfiles!inner(rol, activo)")
      .eq("perfiles.activo", true)
      .eq("perfiles.rol", "admin");
    if (error) {
      console.error("DISPOSITIVOS_ERROR", error.message);
      return json({ error: "ERROR_INTERNO" }, 500);
    }

    const tokens = (filas ?? []).map((f: { token: string }) => f.token);
    const mensajes = construirMensajes({
      producto: producto.nombre,
      existencias: Number(producto.existencias),
      puntoPedido: Number(producto.punto_pedido),
      unidad: producto.unidad as Unidad,
    }, tokens);

    const invalidos: string[] = [];
    for (const lote of enLotes(mensajes, 100)) {
      try {
        const resp = await fetch(EXPO_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(lote),
        });
        if (!resp.ok) {
          console.error("EXPO_PUSH_HTTP", `status ${resp.status}`);
          continue;
        }
        const { data } = await resp.json();
        if (Array.isArray(data)) invalidos.push(...tokensNoRegistrados(lote, data));
      } catch (e) {
        console.error("EXPO_PUSH_ERROR", e instanceof Error ? e.message : "desconocido");
      }
    }

    if (invalidos.length > 0) {
      const { error: errorBorrado } = await admin.from("dispositivos").delete().in("token", invalidos);
      if (errorBorrado) console.error("TOKENS_DELETE_ERROR", errorBorrado.message);
    }
    return json({ enviados: mensajes.length, eliminados: invalidos.length });
  } catch {
    return json({ error: "ERROR_INTERNO" }, 500);
  }
});
