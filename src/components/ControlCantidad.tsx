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
  error?: string;
};

export function ControlCantidad({ valor, onCambio, unidad, maximo, etiqueta, error }: Props) {
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
        borderColor: nombre === "mas" ? colores.primario : colores.borde,
        backgroundColor: nombre === "mas" ? colores.primario : colores.superficie,
        alignItems: "center",
        justifyContent: "center",
        opacity: deshabilitado ? 0.4 : 1,
      }}
    >
      <Icono nombre={nombre} color={nombre === "mas" ? colores.sobrePrimario : colores.interactivo} />
    </Presionable>
  );

  return (
    <View style={{ gap: 8 }}>
      <Texto variante="etiqueta" tono="secundario" importantForAccessibility="no">
        {etiqueta}
      </Texto>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {boton("menos", "Disminuir", sinBajar, () => cambiar(Math.max(minimo, base - 1)))}
        <View
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            borderRadius: RADIO.campo,
            borderWidth: 2,
            borderColor: error ? colores.peligro : colores.primario,
            backgroundColor: error ? colores.peligroSuave : colores.superficie,
            paddingHorizontal: 12,
          }}
        >
          <EntradaTexto
            accessibilityLabel={etiqueta}
            value={valor}
            onChangeText={onCambio}
            keyboardType={entera ? "number-pad" : "decimal-pad"}
            textAlign="center"
            style={{
              flexShrink: 1,
              minWidth: 48,
              minHeight: 44,
              borderWidth: 0,
              backgroundColor: "transparent",
              paddingHorizontal: 0,
            }}
          />
          <Texto tono="secundario" style={{ flexShrink: 0 }}>
            {abreviatura}
          </Texto>
        </View>
        {boton("mas", "Aumentar", sinSubir, () => {
          const siguiente = Math.max(minimo, base + 1);
          cambiar(maximo !== undefined ? Math.min(maximo, siguiente) : siguiente);
        })}
      </View>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icono nombre="info" tamano={18} color={colores.textoPeligro} />
          <Texto accessibilityRole="alert" variante="pequeno" tono="peligro" style={{ flex: 1 }}>
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}
