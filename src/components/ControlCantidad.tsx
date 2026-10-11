import { View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { EntradaTexto } from "@/components/EntradaTexto";
import { Icono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { UNIDADES, type Unidad } from "@/features/productos/unidades";
import { useTema } from "@/tema/TemaProvider";
import { RADIO } from "@/tema/tokens";

type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  unidad: Unidad;
  maximo?: number;
  etiqueta: string;
};

export function ControlCantidad({ valor, onCambio, unidad, maximo, etiqueta }: Props) {
  const { colores } = useTema();
  const { entera, abreviatura } = UNIDADES[unidad];
  const minimo = entera ? 1 : 0.01;
  const actual = Number(valor.trim().replace(",", "."));
  const base = Number.isFinite(actual) && valor.trim() !== "" ? actual : 0;
  const cambiar = (n: number) => onCambio(String(Math.round(n * 100) / 100));
  const sinBajar = base <= minimo;
  const sinSubir = maximo !== undefined && base >= maximo;

  const boton = (
    nombre: "mas" | "menos",
    etiquetaBoton: string,
    deshabilitado: boolean,
    alPulsar: () => void,
  ) => (
    <Presionable
      accessibilityRole="button"
      accessibilityLabel={etiquetaBoton}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={alPulsar}
      style={{
        width: 48,
        height: 48,
        borderRadius: RADIO.campo,
        borderWidth: 1.5,
        borderColor: colores.borde,
        backgroundColor: colores.superficie,
        alignItems: "center",
        justifyContent: "center",
        opacity: deshabilitado ? 0.4 : 1,
      }}
    >
      <Icono nombre={nombre} color={colores.interactivo} />
    </Presionable>
  );

  return (
    <View style={{ gap: 8 }}>
      <Texto variante="etiqueta" tono="secundario" importantForAccessibility="no">
        {etiqueta}
      </Texto>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {boton("menos", "Disminuir", sinBajar, () => cambiar(Math.max(minimo, base - 1)))}
        <EntradaTexto
          accessibilityLabel={etiqueta}
          value={valor}
          onChangeText={onCambio}
          keyboardType={entera ? "number-pad" : "decimal-pad"}
          textAlign="center"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            borderRadius: RADIO.campo,
            borderWidth: 1.5,
            borderColor: colores.borde,
            backgroundColor: colores.superficie,
            paddingHorizontal: 12,
          }}
        />
        {boton("mas", "Aumentar", sinSubir, () => {
          const siguiente = Math.max(minimo, base + 1);
          cambiar(maximo !== undefined ? Math.min(maximo, siguiente) : siguiente);
        })}
        <Texto tono="secundario" style={{ flexShrink: 0 }}>
          {abreviatura}
        </Texto>
      </View>
    </View>
  );
}
