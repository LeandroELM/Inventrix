import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { cargarNotificaciones } from "@/features/alertas/notificaciones";
import { supabase } from "@/lib/supabase";

export type ResultadoPush = "autorizado" | "denegado" | "no_disponible";

const CLAVE_TOKEN = "inventrix.push_token";

/** Pide permiso, crea el canal `alertas`, obtiene el token Expo y lo registra vía RPC. */
export async function registrarPush(): Promise<ResultadoPush> {
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId;
  const Notifications = cargarNotificaciones();
  if (!Notifications || !Device.isDevice || typeof projectId !== "string" || !projectId) return "no_disponible";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("alertas", {
      name: "Alertas de inventario",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return "denegado";

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc("registrar_dispositivo", { p_token: token });
  if (error) throw error;
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
  return "autorizado";
}

/** Elimina el token de este dispositivo del servidor. Nunca lanza. */
export async function eliminarDispositivoActual(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
    if (!token) return;
    const { error } = await supabase.rpc("eliminar_dispositivo", { p_token: token });
    if (error) return; // conservar el token para reintentar en un cierre de sesión posterior
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  } catch {
    // No bloquear el cierre de sesión.
  }
}
