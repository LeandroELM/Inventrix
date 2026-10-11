import type { TextStyle } from "react-native";

export const FUENTES = {
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

// Android ignora fontWeight con fuentes propias: se elige la familia por peso.
export const TIPOGRAFIA = {
  titulo: { fontFamily: FUENTES.bold, fontSize: 20 },
  subtitulo: { fontFamily: FUENTES.semibold, fontSize: 15 },
  cuerpo: { fontFamily: FUENTES.regular, fontSize: 14 },
  cuerpoFuerte: { fontFamily: FUENTES.semibold, fontSize: 14 },
  etiqueta: { fontFamily: FUENTES.semibold, fontSize: 12 },
  pequeno: { fontFamily: FUENTES.regular, fontSize: 11 },
  cifra: { fontFamily: FUENTES.bold, fontSize: 28, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type VarianteTexto = keyof typeof TIPOGRAFIA;
