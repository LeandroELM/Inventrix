import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { SelectorUnidad } from "@/components/SelectorUnidad";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useActualizarProducto, useProducto } from "@/features/productos/hooks";
import { UNIDADES, type Unidad } from "@/features/productos/unidades";
import { validarFormularioProducto, type ErroresFormulario } from "@/features/productos/validacion";
import { mensajeDeError } from "@/lib/errores";
import { Texto } from "@/components/Texto";
import { useTema } from "@/tema/TemaProvider";

const MENSAJE_UNIDAD_ENTERA =
  "No puedes cambiar a una unidad entera mientras el producto tenga existencias con decimales. Ajusta primero las existencias.";

type Producto = NonNullable<ReturnType<typeof useProducto>["data"]>;

function Cargador({ id }: { id: string }) {
  const { colores } = useTema();
  const { data: p, isLoading, error } = useProducto(id);
  if (isLoading) return <ActivityIndicator color={colores.interactivo} />;
  if (error || !p) return <Texto>{mensajeDeError(error)}</Texto>;
  return <Formulario p={p} />;
}

function Formulario({ p }: { p: Producto }) {
  const router = useRouter();
  const actualizar = useActualizarProducto(p.id);
  const [nombre, setNombre] = useState(p.nombre);
  const [unidad, setUnidad] = useState<Unidad>(p.unidad);
  const [puntoPedido, setPuntoPedido] = useState(String(p.punto_pedido));
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Texto>Código: {p.codigo}</Texto>
      <View>
        <Campo label="Nombre" value={nombre} onChangeText={setNombre} />
        {errores.nombre ? <Texto accessibilityRole="alert" tono="peligro">{errores.nombre}</Texto> : null}
      </View>
      <SelectorUnidad valor={unidad} onChange={setUnidad} />
      <View>
        <Campo label="Punto de pedido" value={puntoPedido} onChangeText={setPuntoPedido} keyboardType="decimal-pad" />
        {errores.puntoPedido ? <Texto accessibilityRole="alert" tono="peligro">{errores.puntoPedido}</Texto> : null}
      </View>
      {errorGeneral ? <Texto accessibilityRole="alert" tono="peligro">{errorGeneral}</Texto> : null}
      <Boton titulo="Guardar cambios" loading={actualizar.isPending} onPress={() => void guardar()} />
      <Boton titulo="Cancelar" onPress={() => router.back()} />
    </ScrollView>
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
