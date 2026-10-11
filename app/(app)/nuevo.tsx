import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { ScrollView, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { SelectorUnidad } from "@/components/SelectorUnidad";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useRegistrarProducto } from "@/features/productos/hooks";
import { UNIDADES, formatearCantidad } from "@/features/productos/unidades";
import {
  validarFormularioProducto,
  type DatosProducto,
  type ValoresFormulario,
} from "@/features/productos/validacion";
import { mensajeDeError } from "@/lib/errores";

const VACIO: ValoresFormulario = { nombre: "", unidad: "unidad", codigo: "", cantidadInicial: "", puntoPedido: "" };

const resolver: Resolver<ValoresFormulario> = async (values) => {
  const r = validarFormularioProducto(values);
  if (r.ok) return { values, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  for (const [campo, message] of Object.entries(r.errores)) errors[campo] = { type: "validate", message };
  return { values: {}, errors };
};

function esCodigoDuplicado(e: unknown): boolean {
  const texto = typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : "";
  return texto.includes("CODIGO_DUPLICADO");
}

type Paso = "formulario" | "revision" | "listo";

function NuevoProducto() {
  const router = useRouter();
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const [paso, setPaso] = useState<Paso>("formulario");
  const [datos, setDatos] = useState<DatosProducto | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const registrar = useRegistrarProducto();
  const { control, handleSubmit, setValue, setError, reset } = useForm<ValoresFormulario>({
    defaultValues: VACIO,
    resolver,
  });

  useEffect(() => {
    if (codigo) setValue("codigo", codigo);
  }, [codigo, setValue]);

  function revisar(valores: ValoresFormulario) {
    const r = validarFormularioProducto(valores);
    if (!r.ok) return;
    setErrorGeneral(null);
    setDatos(r.datos);
    setPaso("revision");
  }

  async function confirmar() {
    if (!datos) return;
    setErrorGeneral(null);
    try {
      await registrar.mutateAsync(datos);
      setPaso("listo");
    } catch (e) {
      if (esCodigoDuplicado(e)) {
        setError("codigo", { type: "server", message: "Este código ya está registrado." });
        setPaso("formulario");
      } else {
        setErrorGeneral(mensajeDeError(e));
      }
    }
  }

  if (paso === "listo") {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
        <Text accessibilityRole="alert">Producto registrado correctamente</Text>
        <Boton titulo="Ver en Existencias" onPress={() => router.replace("/administracion/existencias")} />
        <Boton
          titulo="Registrar otro"
          onPress={() => {
            reset(VACIO);
            setDatos(null);
            setPaso("formulario");
          }}
        />
      </View>
    );
  }

  if (paso === "revision" && datos) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
        <Text>Revisa la información</Text>
        <Text>Nombre</Text>
        <Text>{datos.nombre}</Text>
        <Text>Código</Text>
        <Text>{datos.codigo}</Text>
        <Text>Unidad</Text>
        <Text>{UNIDADES[datos.unidad].nombre}</Text>
        <Text>Cantidad inicial</Text>
        <Text>{formatearCantidad(datos.cantidadInicial, datos.unidad)}</Text>
        <Text>Punto de pedido</Text>
        <Text>{formatearCantidad(datos.puntoPedido, datos.unidad)}</Text>
        {errorGeneral ? <Text accessibilityRole="alert">{errorGeneral}</Text> : null}
        <Boton titulo="Editar información" onPress={() => setPaso("formulario")} />
        <Boton titulo="Confirmar registro" loading={registrar.isPending} onPress={() => void confirmar()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Controller
        control={control}
        name="nombre"
        render={({ field, fieldState }) => (
          <View>
            <Campo label="Nombre" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
            {fieldState.error ? <Text accessibilityRole="alert">{fieldState.error.message}</Text> : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="codigo"
        render={({ field, fieldState }) => (
          <View>
            <Campo
              label="Código"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {fieldState.error ? <Text accessibilityRole="alert">{fieldState.error.message}</Text> : null}
          </View>
        )}
      />
      <Boton titulo="Escanear código" onPress={() => router.push("/escaner?destino=nuevo")} />
      <Controller
        control={control}
        name="unidad"
        render={({ field }) => <SelectorUnidad valor={field.value} onChange={field.onChange} />}
      />
      <Controller
        control={control}
        name="cantidadInicial"
        render={({ field, fieldState }) => (
          <View>
            <Campo
              label="Cantidad inicial"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="decimal-pad"
            />
            {fieldState.error ? <Text accessibilityRole="alert">{fieldState.error.message}</Text> : null}
          </View>
        )}
      />
      <Controller
        control={control}
        name="puntoPedido"
        render={({ field, fieldState }) => (
          <View>
            <Campo
              label="Punto de pedido"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="decimal-pad"
            />
            {fieldState.error ? <Text accessibilityRole="alert">{fieldState.error.message}</Text> : null}
          </View>
        )}
      />
      <Boton titulo="Revisar" onPress={() => void handleSubmit(revisar)()} />
    </ScrollView>
  );
}

export default function Nuevo() {
  return (
    <RequiereRol rol="admin">
      <NuevoProducto />
    </RequiereRol>
  );
}
