import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Skeleton } from "@/animacion/Skeleton";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Encabezado } from "@/components/Encabezado";
import { EstadoError } from "@/components/EstadoError";
import { Icono } from "@/components/Icono";
import { SelectorUnidad } from "@/components/SelectorUnidad";
import { SufijoUnidad } from "@/components/SufijoUnidad";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useActualizarProducto, useProducto } from "@/features/productos/hooks";
import { UNIDADES, type Unidad } from "@/features/productos/unidades";
import { validarFormularioProducto, type ErroresFormulario } from "@/features/productos/validacion";
import { mensajeDeError } from "@/lib/errores";
import { useEspacioInferior } from "@/components/BarraInferior";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const MENSAJE_UNIDAD_ENTERA =
  "No puedes cambiar a una unidad entera mientras el producto tenga existencias con decimales. Ajusta primero las existencias.";

type Producto = NonNullable<ReturnType<typeof useProducto>["data"]>;

function useCerrar() {
  const router = useRouter();
  return { icono: "cerrar", etiqueta: "Cerrar", onPress: () => router.back() } as const;
}

function Cargador({ id }: { id: string }) {
  const { colores } = useTema();
  const cerrar = useCerrar();
  const { data: p, isLoading, error, refetch } = useProducto(id);
  if (p) return <Formulario p={p} />;
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado variante="pantalla" titulo="Editar producto" accion={cerrar} />
      <View style={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
        {isLoading ? (
          <>
            <Skeleton.Fila />
            <Skeleton.Fila />
            <Skeleton.Fila />
          </>
        ) : (
          <EstadoError mensaje={error ? mensajeDeError(error) : "No se pudo cargar el producto."} onReintentar={() => void refetch()} />
        )}
      </View>
    </View>
  );
}

function Formulario({ p }: { p: Producto }) {
  const router = useRouter();
  const { colores } = useTema();
  const espacio = useEspacioInferior();
  const cerrar = useCerrar();
  const actualizar = useActualizarProducto(p.id);
  const [nombre, setNombre] = useState(p.nombre);
  const [unidad, setUnidad] = useState<Unidad>(p.unidad);
  const [puntoPedido, setPuntoPedido] = useState(String(p.punto_pedido));
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // Un cambio en el formulario invalida el error general anterior.
  function cambiar<T>(fijar: (v: T) => void) {
    return (v: T) => {
      setErrorGeneral(null);
      fijar(v);
    };
  }

  async function guardar() {
    setErrorGeneral(null);
    // Código y cantidad inicial no se editan: se rellenan con valores válidos para reutilizar la validación.
    const r = validarFormularioProducto({
      nombre,
      unidad,
      codigo: "XXXX",
      cantidadInicial: "0",
      puntoPedido,
    });
    if (!r.ok) {
      setErrores({ nombre: r.errores.nombre, puntoPedido: r.errores.puntoPedido });
      return;
    }
    setErrores({});
    if (UNIDADES[unidad].entera && !Number.isInteger(Number(p.existencias))) {
      setErrorGeneral(MENSAJE_UNIDAD_ENTERA);
      return;
    }
    try {
      await actualizar.mutateAsync({ nombre: r.datos.nombre, unidad: r.datos.unidad, puntoPedido: r.datos.puntoPedido });
      router.back();
    } catch (e) {
      const datosInvalidos = mensajeDeError({ message: "DATOS_INVALIDOS" });
      const mensaje = mensajeDeError(e);
      setErrorGeneral(mensaje === datosInvalidos && UNIDADES[unidad].entera ? MENSAJE_UNIDAD_ENTERA : mensaje);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado variante="pantalla" titulo="Editar producto" subtitulo={p.nombre} accion={cerrar} />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.l, paddingBottom: ESPACIO.l + espacio, gap: ESPACIO.l }} keyboardShouldPersistTaps="handled">
        <Tarjeta style={{ gap: ESPACIO.l }}>
          <View style={{ gap: ESPACIO.xs }}>
            <Texto variante="etiqueta" tono="secundario">
              Código
            </Texto>
            <Texto variante="cuerpoFuerte">{p.codigo}</Texto>
            <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.s }}>
              <Icono nombre="info" tamano={18} color={colores.textoSecundario} />
              <Texto tono="secundario" style={{ flex: 1 }}>
                El código no se puede cambiar.
              </Texto>
            </View>
          </View>
          <Campo label="Nombre" value={nombre} onChangeText={cambiar(setNombre)} error={errores.nombre} />
          <SelectorUnidad valor={unidad} onChange={cambiar(setUnidad)} />
          <View>
            <Campo
              label="Punto de pedido"
              value={puntoPedido}
              onChangeText={cambiar(setPuntoPedido)}
              keyboardType="decimal-pad"
              error={errores.puntoPedido}
              style={{ paddingRight: 56 }}
            />
            <SufijoUnidad unidad={unidad} />
          </View>
        </Tarjeta>
        {errorGeneral ? <AvisoAdvertencia tono="peligro" texto={errorGeneral} alerta /> : null}
        <View style={{ gap: ESPACIO.s }}>
          <Boton titulo="Guardar cambios" loading={actualizar.isPending} onPress={() => void guardar()} />
          <Boton titulo="Cancelar" variante="secundario" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </View>
  );
}

export default function Editar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequiereRol rol="admin">
      <Cargador id={id} />
    </RequiereRol>
  );
}
