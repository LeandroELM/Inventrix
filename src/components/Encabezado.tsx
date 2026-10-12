import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Presionable } from "@/animacion/Presionable";
import { iniciales } from "@/components/AvatarProducto";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

type PropsInicio = {
  variante: "inicio";
  nombre: string;
  rol: string;
  alertas?: number;
  onAlertas?: () => void;
};

type AccionIcono = { icono: NombreIcono; etiqueta: string; onPress: () => void };
type AccionTexto = { texto: string; onPress: () => void; deshabilitado?: boolean };

type PropsPantalla = {
  variante: "pantalla";
  titulo: string;
  subtitulo?: string;
  lineasTitulo?: number;
  onAtras?: () => void;
  accion?: AccionIcono | AccionTexto;
};

const BOTON = { width: 48, height: 48, alignItems: "center", justifyContent: "center" } as const;

function EncabezadoInicio({ nombre, rol, alertas, onAlertas }: Omit<PropsInicio, "variante">) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const sinLeer = alertas !== undefined && alertas > 0;

  return (
    <View
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: ESPACIO.l,
        paddingBottom: ESPACIO.m,
        backgroundColor: "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.m }}>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            width: 44,
            height: 44,
            borderRadius: RADIO.completo,
            backgroundColor: colores.primario,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Texto variante="etiqueta" tono="sobrePrimario">
            {iniciales(nombre)}
          </Texto>
        </View>
        <View style={{ flex: 1, alignItems: "flex-start", gap: ESPACIO.xs }}>
          <Texto variante="subtitulo" numberOfLines={1}>
            {`Hola, ${nombre}`}
          </Texto>
          <View
            style={{
              borderRadius: RADIO.completo,
              borderWidth: 1,
              borderColor: colores.linea,
              backgroundColor: colores.superficie,
              paddingHorizontal: ESPACIO.s,
              paddingVertical: 2,
            }}
          >
            <Texto variante="etiqueta" tono="secundario">
              {rol.toUpperCase()}
            </Texto>
          </View>
        </View>
        {onAlertas ? (
          <Presionable
            accessibilityRole="button"
            accessibilityLabel={sinLeer ? `Notificaciones, ${alertas} sin leer` : "Notificaciones"}
            onPress={onAlertas}
            style={BOTON}
          >
            <Icono nombre="campana" tamano={24} color={colores.texto} />
            {sinLeer ? (
              <View
                testID="punto-alerta"
                style={{
                  position: "absolute",
                  top: 11,
                  right: 12,
                  width: 10,
                  height: 10,
                  borderRadius: RADIO.completo,
                  backgroundColor: colores.advertencia,
                  borderWidth: 2,
                  borderColor: colores.fondo,
                }}
              />
            ) : null}
          </Presionable>
        ) : null}
      </View>
    </View>
  );
}

function EncabezadoPantalla({ titulo, subtitulo, lineasTitulo = 1, onAtras, accion }: Omit<PropsPantalla, "variante">) {
  const { colores } = useTema();
  const insets = useSafeAreaInsets();
  const enfocada = useIsFocused();
  const [inicio, fin] = colores.encabezado;

  return (
    <LinearGradient
      colors={[inicio, fin]}
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: ESPACIO.l,
        paddingBottom: ESPACIO.m,
        borderBottomLeftRadius: RADIO.encabezado,
        borderBottomRightRadius: RADIO.encabezado,
      }}
    >
      {enfocada ? <StatusBar style="light" /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
        {onAtras ? (
          <Presionable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onAtras}
            style={[BOTON, { marginLeft: -ESPACIO.m }]}
          >
            <Icono nombre="atras" tamano={26} color={colores.sobrePrimario} />
          </Presionable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Texto accessibilityRole="header" variante="titulo" tono="sobrePrimario" numberOfLines={lineasTitulo}>
            {titulo}
          </Texto>
          {subtitulo ? (
            <Texto variante="pequeno" tono="sobrePrimario" style={{ opacity: 0.85 }} numberOfLines={1}>
              {subtitulo}
            </Texto>
          ) : null}
        </View>
        {accion && "texto" in accion ? (
          <Presionable
            accessibilityRole="button"
            accessibilityLabel={accion.texto}
            accessibilityState={{ disabled: accion.deshabilitado === true }}
            disabled={accion.deshabilitado}
            onPress={accion.onPress}
            style={{
              minHeight: 48,
              justifyContent: "center",
              paddingHorizontal: ESPACIO.m,
              opacity: accion.deshabilitado ? 0.5 : 1,
            }}
          >
            <Texto variante="etiqueta" tono="sobrePrimario">
              {accion.texto}
            </Texto>
          </Presionable>
        ) : accion ? (
          <Presionable
            accessibilityRole="button"
            accessibilityLabel={accion.etiqueta}
            onPress={accion.onPress}
            style={[BOTON, { marginRight: -ESPACIO.m }]}
          >
            <Icono nombre={accion.icono} tamano={22} color={colores.sobrePrimario} />
          </Presionable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

export function Encabezado(props: PropsInicio | PropsPantalla) {
  if (props.variante === "inicio") return <EncabezadoInicio {...props} />;
  return <EncabezadoPantalla {...props} />;
}
