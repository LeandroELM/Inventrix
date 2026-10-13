import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { ScrollView, View } from "react-native";
import { Presionable } from "@/animacion/Presionable";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Encabezado } from "@/components/Encabezado";
import { Icono, type NombreIcono } from "@/components/Icono";
import { PantallaResultado } from "@/components/PantallaResultado";
import { SelectorUnidad } from "@/components/SelectorUnidad";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { codigoRegistrado } from "@/features/productos/api";
import { useRegistrarProducto } from "@/features/productos/hooks";
import { leerCodigoDeImagen } from "@/features/productos/leerImagen";
import { UNIDADES, formatearCantidad } from "@/features/productos/unidades";
import {
  validarFormularioProducto,
  type DatosProducto,
  type ValoresFormulario,
} from "@/features/productos/validacion";
import { mensajeDeError } from "@/lib/errores";
import { ESPACIO, RADIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

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

function BarraPasos({ paso }: { paso: 1 | 2 }) {
  const { colores } = useTema();
  return (
    <View accessible accessibilityLabel={`Paso ${paso} de 2`} style={{ flexDirection: "row", gap: ESPACIO.s }}>
      {[1, 2].map((n) => (
        <View
          key={n}
          style={{
            flex: 1,
            height: 5,
            borderRadius: RADIO.completo,
            backgroundColor: n <= paso ? colores.marcaAcento : colores.linea,
          }}
        />
      ))}
    </View>
  );
}

function BotonIcono({ icono, etiqueta, onPress }: { icono: NombreIcono; etiqueta: string; onPress: () => void }) {
  const { colores } = useTema();
  return (
    <Presionable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: RADIO.campo,
        borderWidth: 1.5,
        borderColor: colores.borde,
        backgroundColor: colores.superficie,
      }}
    >
      <Icono nombre={icono} tamano={22} color={colores.interactivo} />
    </Presionable>
  );
}

function Nota({ texto }: { texto: string }) {
  const { colores } = useTema();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.s }}>
      <Icono nombre="info" tamano={18} color={colores.textoSecundario} />
      <Texto tono="secundario" style={{ flex: 1 }}>
        {texto}
      </Texto>
    </View>
  );
}

function NuevoProducto() {
  const router = useRouter();
  const { colores } = useTema();
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const [paso, setPaso] = useState<Paso>("formulario");
  const [datos, setDatos] = useState<DatosProducto | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [avisoImagen, setAvisoImagen] = useState<{ texto: string; tono: "advertencia" | "peligro" } | null>(null);
  const enCurso = useRef(false);
  const registrar = useRegistrarProducto();
  const { control, handleSubmit, setValue, setError, reset, formState } = useForm<ValoresFormulario>({
    defaultValues: VACIO,
    resolver,
  });
  const unidad = useWatch({ control, name: "unidad" });

  useEffect(() => {
    if (codigo) setValue("codigo", codigo);
  }, [codigo, setValue]);

  async function revisar(valores: ValoresFormulario) {
    const r = validarFormularioProducto(valores);
    if (!r.ok) return;
    try {
      const existente = await codigoRegistrado(r.datos.codigo);
      if (existente) {
        setError("codigo", {
          type: "server",
          message: existente.activo
            ? `Este código ya está registrado (${existente.nombre}).`
            : `Este código pertenece a ${existente.nombre}, dado de baja.`,
        });
        return;
      }
    } catch {
      // Si la consulta falla, el servidor decide al confirmar.
    }
    setErrorGeneral(null);
    setDatos(r.datos);
    setPaso("revision");
  }

  async function confirmar() {
    if (!datos || enCurso.current) return;
    enCurso.current = true;
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
    } finally {
      enCurso.current = false;
    }
  }

  async function leerImagen() {
    setAvisoImagen(null);
    try {
      const r = await leerCodigoDeImagen();
      if (r.estado === "ok") setValue("codigo", r.codigo);
      else if (r.estado === "sin-codigo") {
        setAvisoImagen({ texto: "No se encontró ningún código en la imagen.", tono: "advertencia" });
      }
    } catch (e) {
      setAvisoImagen({ texto: mensajeDeError(e), tono: "peligro" });
    }
  }

  if (paso === "listo" && datos) {
    return (
      <PantallaResultado
        titulo="¡Producto registrado!"
        frase={`${datos.nombre} ya está disponible en Existencias y puede usarse en entradas y salidas.`}
        producto={{ nombre: datos.nombre, detalle: `Código ${datos.codigo}` }}
        datos={[
          { etiqueta: "Cantidad inicial", valor: formatearCantidad(datos.cantidadInicial, datos.unidad) },
          { etiqueta: "Punto de pedido", valor: formatearCantidad(datos.puntoPedido, datos.unidad) },
        ]}
        principal={{ titulo: "Ver en Existencias", onPress: () => router.replace("/buscar") }}
        secundario={{
          titulo: "Registrar otro producto",
          onPress: () => {
            reset(VACIO);
            setDatos(null);
            setAvisoImagen(null);
            setPaso("formulario");
          },
        }}
      />
    );
  }

  const cerrar = { icono: "cerrar", etiqueta: "Cerrar", onPress: () => router.back() } as const;

  if (paso === "revision" && datos) {
    const [inicio, fin] = colores.encabezado;
    const resumen = [
      { etiqueta: "Unidad", valor: UNIDADES[datos.unidad].nombre },
      { etiqueta: "Cant. inicial", valor: formatearCantidad(datos.cantidadInicial, datos.unidad) },
      { etiqueta: "Punto pedido", valor: formatearCantidad(datos.puntoPedido, datos.unidad) },
    ];
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        <Encabezado variante="pantalla" titulo="Nuevo producto" subtitulo="Paso 2 de 2 · Confirmación" accion={cerrar} />
        <ScrollView contentContainerStyle={{ padding: ESPACIO.l, gap: ESPACIO.l }} keyboardShouldPersistTaps="handled">
          <BarraPasos paso={2} />
          <LinearGradient colors={[inicio, fin]} style={{ borderRadius: RADIO.tarjeta, padding: ESPACIO.l, gap: ESPACIO.l }}>
            <View style={{ gap: ESPACIO.xs }}>
              <Texto variante="subtitulo" tono="sobrePrimario">
                {datos.nombre}
              </Texto>
              <Texto tono="sobrePrimario" style={{ opacity: 0.85 }}>{`Código ${datos.codigo}`}</Texto>
            </View>
            <View style={{ flexDirection: "row", gap: ESPACIO.m }}>
              {resumen.map((d) => (
                <View key={d.etiqueta} style={{ flex: 1, gap: ESPACIO.xs }}>
                  <Texto variante="etiqueta" tono="sobrePrimario" style={{ opacity: 0.85 }}>
                    {d.etiqueta}
                  </Texto>
                  <Texto variante="cuerpoFuerte" tono="sobrePrimario">
                    {d.valor}
                  </Texto>
                </View>
              ))}
            </View>
          </LinearGradient>
          <Nota
            texto={
              datos.cantidadInicial > 0
                ? `Al confirmar se guardará el producto y su movimiento inicial de inventario (+${formatearCantidad(datos.cantidadInicial, datos.unidad)}).`
                : "Al confirmar se guardará el producto sin existencias iniciales."
            }
          />
          {errorGeneral ? <AvisoAdvertencia tono="peligro" texto={errorGeneral} alerta /> : null}
          <View style={{ gap: ESPACIO.s }}>
            <Boton titulo="Confirmar registro" loading={registrar.isPending} onPress={() => void confirmar()} />
            <Boton titulo="Editar información" variante="secundario" onPress={() => setPaso("formulario")} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const sufijo = (
    <Texto tono="secundario" style={{ position: "absolute", right: ESPACIO.m, top: 34, pointerEvents: "none" }}>
      {UNIDADES[unidad].abreviatura}
    </Texto>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado variante="pantalla" titulo="Nuevo producto" subtitulo="Paso 1 de 2 · Datos del producto" accion={cerrar} />
      <ScrollView contentContainerStyle={{ padding: ESPACIO.l, gap: ESPACIO.l }} keyboardShouldPersistTaps="handled">
        <BarraPasos paso={1} />
        <Tarjeta style={{ gap: ESPACIO.l }}>
          <Controller
            control={control}
            name="nombre"
            render={({ field, fieldState }) => (
              <Campo
                label="Nombre"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="unidad"
            render={({ field }) => <SelectorUnidad valor={field.value} onChange={field.onChange} />}
          />
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: ESPACIO.s }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="codigo"
                render={({ field, fieldState }) => (
                  <Campo
                    label="Código"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
            <View style={{ flexDirection: "row", gap: ESPACIO.s, marginTop: 22 }}>
              <BotonIcono icono="camara" etiqueta="Escanear con la cámara" onPress={() => router.push("/escaner?destino=nuevo")} />
              <BotonIcono icono="imagen" etiqueta="Leer código desde una imagen" onPress={() => void leerImagen()} />
            </View>
          </View>
          {avisoImagen ? <AvisoAdvertencia tono={avisoImagen.tono} texto={avisoImagen.texto} alerta /> : null}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: ESPACIO.m }}>
            <View style={{ flex: 1 }}>
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
                      error={fieldState.error?.message}
                      style={{ paddingRight: 56 }}
                    />
                    {sufijo}
                  </View>
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
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
                      error={fieldState.error?.message}
                      style={{ paddingRight: 56 }}
                    />
                    {sufijo}
                  </View>
                )}
              />
            </View>
          </View>
          <Nota texto="Cuando las existencias lleguen al punto de pedido, recibirás una alerta de reabastecimiento." />
        </Tarjeta>
        <Boton titulo="Revisar" loading={formState.isSubmitting} onPress={() => void handleSubmit(revisar)()} />
      </ScrollView>
    </View>
  );
}

export default function Nuevo() {
  return (
    <RequiereRol rol="admin">
      <NuevoProducto />
    </RequiereRol>
  );
}
