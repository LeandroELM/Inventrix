import type { ReactNode } from "react";
import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Icono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  titulo: string;
  detalle?: string;
  valor?: string;
  izquierda?: ReactNode;
  onPress?: () => void;
};

export function FilaLista({ titulo, detalle, valor, izquierda, onPress }: Props) {
  const { colores } = useTema();
  const contenido = (
    <>
      {izquierda}
      <View style={{ flex: 1 }}>
        <Texto variante="cuerpoFuerte">{titulo}</Texto>
        {detalle ? (
          <Texto variante="pequeno" tono="secundario">
            {detalle}
          </Texto>
        ) : null}
      </View>
      {valor ? <Texto variante="cuerpoFuerte">{valor}</Texto> : null}
      {onPress ? <Icono nombre="flecha" tamano={18} color={colores.textoSecundario} /> : null}
    </>
  );
  const estilo = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
  };
  if (onPress) {
    return (
      <Presionable accessibilityRole="button" accessibilityLabel={titulo} onPress={onPress} style={estilo}>
        {contenido}
      </Presionable>
    );
  }
  return <View style={estilo}>{contenido}</View>;
}
