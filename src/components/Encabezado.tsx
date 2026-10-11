import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Presionable } from "@/animacion/Presionable";
import { Icono, type NombreIcono } from "@/components/Icono";
import { LogoMarca } from "@/components/Marca";
import { Texto } from "@/components/Texto";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type PropsInicio = {
  variante: "inicio";
  saludo: string;
  rol: string;
  alertas?: number;
  onAlertas?: () => void;
};

type PropsPantalla = {
  variante: "pantalla";
  titulo: string;
  onAtras?: () => void;
  accion?: { icono: NombreIcono; etiqueta: string; onPress: () => void };
};

const BOTON = { width: 48, height: 48, alignItems: "center", justifyContent: "center" } as const;

export function Encabezado(props: PropsInicio | PropsPantalla) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const [inicio, fin] = colores.encabezado;

  return (
    <LinearGradient
      colors={[inicio, fin]}
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: ESPACIO.l,
        paddingBottom: props.variante === "inicio" ? 40 : ESPACIO.m,
        borderBottomLeftRadius: RADIO.encabezado,
        borderBottomRightRadius: RADIO.encabezado,
      }}
    >
      <StatusBar style="light" />
      {props.variante === "inicio" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.m }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: RADIO.icono,
              backgroundColor: colores.marcaFondo,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoMarca tamano={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Texto variante="subtitulo" tono="sobrePrimario">
              {props.saludo}
            </Texto>
            <Texto variante="etiqueta" tono="sobrePrimario" style={{ opacity: 0.85 }}>
              {props.rol}
            </Texto>
          </View>
          <Presionable
            accessibilityRole="button"
            accessibilityLabel={
              props.alertas && props.alertas > 0 ? `Notificaciones, ${props.alertas} sin leer` : "Notificaciones"
            }
            onPress={props.onAlertas}
            style={BOTON}
          >
            <Icono nombre="campana" tamano={24} color={colores.sobrePrimario} />
            {props.alertas && props.alertas > 0 ? (
              <View
                testID="punto-alerta"
                style={{
                  position: "absolute",
                  top: 11,
                  right: 12,
                  width: 10,
                  height: 10,
                  borderRadius: RADIO.completo,
                  backgroundColor: colores.peligro,
                  borderWidth: 2,
                  borderColor: fin,
                }}
              />
            ) : null}
          </Presionable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
          {props.onAtras ? (
            <Presionable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={props.onAtras}
              style={[BOTON, { marginLeft: -ESPACIO.m }]}
            >
              <Icono nombre="atras" tamano={26} color={colores.sobrePrimario} />
            </Presionable>
          ) : null}
          <Texto variante="titulo" tono="sobrePrimario" numberOfLines={1} style={{ flex: 1 }}>
            {props.titulo}
          </Texto>
          {props.accion ? (
            <Presionable
              accessibilityRole="button"
              accessibilityLabel={props.accion.etiqueta}
              onPress={props.accion.onPress}
              style={[BOTON, { marginRight: -ESPACIO.m }]}
            >
              <Icono nombre={props.accion.icono} tamano={22} color={colores.sobrePrimario} />
            </Presionable>
          ) : null}
        </View>
      )}
    </LinearGradient>
  );
}
