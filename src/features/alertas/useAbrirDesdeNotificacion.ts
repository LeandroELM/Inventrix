import { useEffect, useRef } from "react";
import type * as Notifications from "expo-notifications";
import { useRouter, type Href } from "expo-router";
import { cargarNotificaciones } from "@/features/alertas/notificaciones";
import { rutaDeNotificacion } from "@/features/alertas/ruta";

/**
 * Navega a data.ruta al tocar una notificación. `listo` debe ser true solo cuando hay sesión
 * y la redirección posterior al login ya terminó; antes de eso la ruta queda pendiente.
 */
export function useAbrirDesdeNotificacion(listo: boolean) {
  const router = useRouter();
  const routerRef = useRef(router);
  const listoRef = useRef(listo);
  const pendiente = useRef<string | null>(null);
  const ultimoId = useRef<string | null>(null);

  useEffect(() => {
    routerRef.current = router;
    listoRef.current = listo;
  }, [router, listo]);

  useEffect(() => {
    if (listo && pendiente.current) {
      const ruta = pendiente.current;
      pendiente.current = null;
      routerRef.current.push(ruta as Href);
    }
  }, [listo]);

  useEffect(() => {
    const modulo = cargarNotificaciones();
    if (!modulo) return;

    function procesar(r: Notifications.NotificationResponse) {
      const id = r.notification.request.identifier;
      if (id === ultimoId.current) return;
      const ruta = rutaDeNotificacion(r.notification.request.content.data);
      if (!ruta) return;
      ultimoId.current = id;
      if (listoRef.current) routerRef.current.push(ruta as Href);
      else pendiente.current = ruta;
    }

    const sub = modulo.addNotificationResponseReceivedListener(procesar);
    void modulo.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) procesar(r);
      })
      .catch(() => undefined);
    return () => sub.remove();
  }, []);
}
