import type { ViewStyle } from "react-native";

export type Esquema = "claro" | "oscuro";

export type Colores = {
  fondo: string;
  superficie: string;
  texto: string;
  textoSecundario: string;
  primario: string;
  sobrePrimario: string;
  interactivo: string;
  sobreInteractivo: string;
  sobrePeligro: string;
  marca: string;
  marcaAcento: string;
  marcaFondo: string;
  exito: string;
  exitoSuave: string;
  textoExito: string;
  peligro: string;
  peligroSuave: string;
  textoPeligro: string;
  linea: string;
  borde: string;
  inactivo: string;
  velo: string;
  encabezado: readonly [string, string];
  avatares: readonly string[];
};

export const PALETAS: Record<Esquema, Colores> = {
  claro: {
    fondo: "#F3F6FA",
    superficie: "#FFFFFF",
    texto: "#102B50",
    textoSecundario: "#5B6B82",
    primario: "#102B50",
    sobrePrimario: "#FFFFFF",
    interactivo: "#1764A0",
    sobreInteractivo: "#FFFFFF",
    sobrePeligro: "#FFFFFF",
    marca: "#102B50",
    marcaAcento: "#219653",
    marcaFondo: "#FFFFFF",
    exito: "#219653",
    exitoSuave: "#E8F5EE",
    textoExito: "#1A7A44",
    peligro: "#D92D3A",
    peligroSuave: "#FDECEE",
    textoPeligro: "#B4232F",
    linea: "#E5EBF2",
    borde: "#7B8BA1",
    inactivo: "#CBD5E1",
    velo: "rgba(10,20,36,0.35)",
    encabezado: ["#1764A0", "#102B50"],
    avatares: ["#D6E8F8", "#D5F0E1", "#FBE3D3", "#EADCF7", "#FBF0C9", "#D3EEF0"],
  },
  oscuro: {
    fondo: "#0A1424",
    superficie: "#13223A",
    texto: "#E6EDF7",
    textoSecundario: "#94A3B8",
    primario: "#1764A0",
    sobrePrimario: "#FFFFFF",
    interactivo: "#6FB1EA",
    sobreInteractivo: "#0A1424",
    sobrePeligro: "#0A1424",
    marca: "#102B50",
    marcaAcento: "#219653",
    marcaFondo: "#FFFFFF",
    exito: "#3CC37A",
    exitoSuave: "rgba(60,195,122,0.14)",
    textoExito: "#3CC37A",
    peligro: "#F05A66",
    peligroSuave: "rgba(240,90,102,0.15)",
    textoPeligro: "#FF8A93",
    linea: "#1F3150",
    borde: "#5B7090",
    inactivo: "#334561",
    velo: "rgba(10,20,36,0.35)",
    encabezado: ["#14558A", "#0E2442"],
    avatares: ["#1F3A5C", "#1D4A38", "#5A3A26", "#44305F", "#54482A", "#1F4A50"],
  },
};

export const ESPACIO = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24 } as const;

export const RADIO = {
  icono: 10,
  campo: 12,
  tarjeta: 16,
  barra: 22,
  encabezado: 28,
  completo: 999,
} as const;

export function sombra(nivel: "suave" | "elevada", esquema: Esquema): ViewStyle {
  const elevada = nivel === "elevada";
  return {
    shadowColor: esquema === "claro" ? "#102B50" : "#000000",
    shadowOffset: { width: 0, height: elevada ? 6 : 2 },
    shadowOpacity: esquema === "claro" ? (elevada ? 0.16 : 0.08) : elevada ? 0.5 : 0.35,
    shadowRadius: elevada ? 14 : 6,
    elevation: elevada ? 8 : 2,
  };
}
