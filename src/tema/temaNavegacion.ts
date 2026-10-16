import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import type { Colores, Esquema } from "@/tema/tokens";

// Colores de la app para los navegadores. Sin esto usan su gris por defecto (#F2F2F2), que asoma
// detrás de las pantallas durante las transiciones y en modo oscuro se ve como un destello claro.
export function temaNavegacion(colores: Colores, esquema: Esquema): Theme {
  const base = esquema === "oscuro" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.interactivo,
      background: colores.fondo,
      card: colores.superficie,
      text: colores.texto,
      border: colores.linea,
      notification: colores.advertencia,
    },
  };
}
