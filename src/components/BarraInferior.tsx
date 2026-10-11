import { View } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Presionable } from "@/animacion/Presionable";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Texto } from "@/components/Texto";
import type { NombreTab } from "@/features/auth/navegacion";
import { useTecladoVisible } from "@/lib/useTecladoVisible";
import { RADIO, sombra } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export const ALTO_BARRA = 62;
export const MARGEN_BARRA = 12;
export const ESPACIO_TRIX = 64;

export function espacioInferior(insetInferior: number): number {
  return ALTO_BARRA + MARGEN_BARRA + insetInferior + ESPACIO_TRIX;
}

// Pestañas con un Stack anidado: al tocarlas se vuelve a su pantalla raíz.
const CON_STACK: NombreTab[] = ["administracion", "movimientos"];

const TAMANO_MAS = 54;
const ELEVACION_MAS = 30;
const ALTO_TOTAL = ALTO_BARRA + ELEVACION_MAS;

const TITULOS: Record<Exclude<NombreTab, "nuevo">, string> = {
  index: "Inicio",
  buscar: "Buscar",
  administracion: "Admin.",
  movimientos: "Movimientos",
  configuracion: "Config.",
};

// Lo que lee TalkBack: nombres completos aunque el texto visible sea corto.
const ETIQUETAS: Record<Exclude<NombreTab, "nuevo">, string> = {
  index: "Inicio",
  buscar: "Buscar",
  administracion: "Administración",
  movimientos: "Movimientos",
  configuracion: "Configuración",
};

const ICONOS_TAB: Record<Exclude<NombreTab, "nuevo">, NombreIcono> = {
  index: "inicio",
  buscar: "buscar",
  administracion: "administracion",
  movimientos: "movimientos",
  configuracion: "configuracion",
};

export function BarraInferior({
  state,
  navigation,
  insets,
  visibles,
}: BottomTabBarProps & { visibles: NombreTab[] }) {
  const { colores, esquema } = useTema();
  const tecladoVisible = useTecladoVisible();
  if (tecladoVisible) return null;
  const activa = state.routes[state.index]?.name;

  const presionar = (nombre: NombreTab) => {
    const ruta = state.routes.find((r) => r.name === nombre);
    const evento = navigation.emit({ type: "tabPress", target: ruta?.key, canPreventDefault: true });
    if (evento.defaultPrevented) return;
    if (CON_STACK.includes(nombre)) navigation.navigate(nombre, { screen: "index", pop: true });
    else navigation.navigate(nombre);
  };

  return (
    <View
      accessibilityRole="tablist"
      testID="barra-inferior"
      style={[
        {
          position: "absolute",
          left: MARGEN_BARRA,
          right: MARGEN_BARRA,
          bottom: MARGEN_BARRA + insets.bottom,
          height: ALTO_TOTAL,
          flexDirection: "row",
          alignItems: "flex-end",
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: ALTO_BARRA,
            backgroundColor: colores.superficie,
            borderRadius: RADIO.barra,
          },
          sombra("elevada", esquema),
        ]}
      />
      {visibles.map((nombre) => {
        if (nombre === "nuevo") {
          return (
            // El hueco ocupa todo el alto (barra + elevación): el círculo completo queda dentro de
            // los límites de su padre y recibe toques en cualquiera de sus puntos.
            <View key={nombre} pointerEvents="box-none" style={{ flex: 1, height: ALTO_TOTAL, alignItems: "center" }}>
              <Presionable
                accessibilityRole="button"
                accessibilityLabel="Nuevo producto"
                onPress={() => presionar(nombre)}
                style={[
                  {
                    width: TAMANO_MAS,
                    height: TAMANO_MAS,
                    borderRadius: TAMANO_MAS / 2,
                    borderWidth: 4,
                    borderColor: colores.fondo,
                    backgroundColor: colores.primario,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  sombra("elevada", esquema),
                ]}
              >
                <Icono nombre="mas" tamano={24} color={colores.sobrePrimario} />
              </Presionable>
            </View>
          );
        }
        const seleccionada = activa === nombre;
        const color = seleccionada ? colores.texto : colores.textoSecundario;
        return (
          <Presionable
            key={nombre}
            accessibilityRole="tab"
            accessibilityLabel={ETIQUETAS[nombre]}
            accessibilityState={{ selected: seleccionada }}
            onPress={() => presionar(nombre)}
            style={{ flex: 1, height: ALTO_BARRA, alignItems: "center", justifyContent: "center", gap: 2 }}
          >
            <Icono nombre={ICONOS_TAB[nombre]} tamano={22} color={color} />
            <Texto variante="pequeno" tono={seleccionada ? "texto" : "secundario"} numberOfLines={1}>
              {TITULOS[nombre]}
            </Texto>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: seleccionada ? colores.exito : "transparent",
              }}
            />
          </Presionable>
        );
      })}
    </View>
  );
}
