import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as ModuloNotificaciones from "expo-notifications";

/**
 * Expo Go en Android (SDK 53+) lanza un error con solo importar `expo-notifications`,
 * así que el módulo se carga bajo demanda y nunca dentro de Expo Go.
 * Devuelve null cuando las notificaciones no están disponibles.
 */
export function cargarNotificaciones(): typeof ModuloNotificaciones | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications") as typeof ModuloNotificaciones;
}
