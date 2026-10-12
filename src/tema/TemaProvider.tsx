import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { guardarApariencia, leerApariencia, type Apariencia } from "@/features/configuracion/apariencia";
import { PALETAS, type Colores, type Esquema } from "./tokens";

type ValorTema = { colores: Colores; esquema: Esquema; alternarEsquema: () => void };

const TemaContext = createContext<ValorTema>({
  colores: PALETAS.claro,
  esquema: "claro",
  alternarEsquema: () => {},
});

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<Apariencia>("sistema");

  useEffect(() => {
    let vigente = true;
    void leerApariencia().then((v) => {
      if (vigente) setPreferencia(v);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const esquema: Esquema =
    preferencia === "sistema" ? (sistema === "dark" ? "oscuro" : "claro") : preferencia;

  const alternarEsquema = useCallback(() => {
    const siguiente: Esquema = esquema === "oscuro" ? "claro" : "oscuro";
    setPreferencia(siguiente);
    // Si guardar falla, el cambio se mantiene en esta sesión.
    void guardarApariencia(siguiente).catch(() => {});
  }, [esquema]);

  const valor = useMemo(
    () => ({ colores: PALETAS[esquema], esquema, alternarEsquema }),
    [esquema, alternarEsquema],
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema(): ValorTema {
  return useContext(TemaContext);
}
