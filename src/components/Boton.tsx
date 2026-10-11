import { ActivityIndicator } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type Props = {
  titulo: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variante?: "primario" | "secundario" | "peligro" | "fantasma";
  icono?: NombreIcono;
};

export function Boton({
  titulo,
  onPress,
  disabled = false,
  loading = false,
  variante = "primario",
  icono,
}: Props) {
  const { colores } = useTema();
  const inactivo = disabled || loading;
  const estilos = {
    primario: { fondo: colores.primario, texto: colores.sobrePrimario, borde: undefined },
    secundario: { fondo: colores.superficie, texto: colores.interactivo, borde: colores.borde },
    peligro: { fondo: colores.peligro, texto: colores.sobrePrimario, borde: undefined },
    fantasma: { fondo: "transparent", texto: colores.interactivo, borde: undefined },
  }[variante];
  return (
    <Presionable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: inactivo, busy: loading }}
      disabled={inactivo}
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: RADIO.campo,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: estilos.fondo,
        borderWidth: estilos.borde ? 1.5 : 0,
        borderColor: estilos.borde,
        opacity: inactivo ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={estilos.texto} />
      ) : (
        <>
          {icono ? <Icono nombre={icono} tamano={18} color={estilos.texto} /> : null}
          <Texto variante="cuerpoFuerte" style={{ color: estilos.texto }}>
            {titulo}
          </Texto>
        </>
      )}
    </Presionable>
  );
}
