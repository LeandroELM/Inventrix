import { useRef, useState } from "react";
import { ScrollView, Share, View } from "react-native";
import { useRouter } from "expo-router";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Encabezado } from "@/components/Encabezado";
import { PantallaResultado } from "@/components/PantallaResultado";
import { Segmentado } from "@/components/Segmentado";
import { Texto } from "@/components/Texto";
import type { Rol } from "@/features/auth/permisos";
import { RequiereRol } from "@/features/auth/RequiereRol";
import { useCrearUsuario } from "@/features/usuarios/hooks";
import {
  ETIQUETA_ROL,
  mensajeAcceso,
  normalizarUsuario,
  usuarioValido,
} from "@/features/usuarios/validacion";
import { mensajeDeError } from "@/lib/errores";
import { useEspacioInferior } from "@/components/BarraInferior";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export default function NuevoUsuario() {
  return (
    <RequiereRol rol="admin">
      <Formulario />
    </RequiereRol>
  );
}

const ROLES: { valor: Rol; titulo: string }[] = [
  { valor: "operativo", titulo: ETIQUETA_ROL.operativo },
  { valor: "admin", titulo: ETIQUETA_ROL.admin },
];

type Creado = { nombre: string; usuario: string; rol: Rol; password: string };

function Formulario() {
  const { colores } = useTema();
  const router = useRouter();
  const crear = useCrearUsuario();
  const espacio = useEspacioInferior();
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [rol, setRol] = useState<Rol>("operativo");
  const [existente, setExistente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [creado, setCreado] = useState<Creado | null>(null);
  const enCurso = useRef(false);

  const usuarioNormal = normalizarUsuario(usuario);
  const formatoInvalido = usuarioNormal !== "" && !usuarioValido(usuario);
  const errorUsuario = formatoInvalido
    ? "Usa de 3 a 30 minúsculas, números, punto o guion."
    : existente
      ? mensajeDeError(new Error("USUARIO_EXISTENTE"))
      : undefined;
  const listo = nombre.trim() !== "" && usuarioValido(usuario);

  async function enviar() {
    if (!listo || enCurso.current) return;
    enCurso.current = true;
    setCargando(true);
    setError(null);
    setExistente(false);
    const datos = { usuario: usuarioNormal, nombre: nombre.trim(), rol };
    try {
      const { password } = await crear.mutateAsync(datos);
      setCreado({ ...datos, password });
    } catch (e) {
      if (e instanceof Error && e.message === "USUARIO_EXISTENTE") setExistente(true);
      else setError(mensajeDeError(e));
    } finally {
      enCurso.current = false;
      setCargando(false);
    }
  }

  if (creado) {
    return (
      <PantallaResultado
        titulo="¡Usuario creado!"
        frase={`${creado.nombre} ya puede entrar a Inventrix con esta contraseña temporal.`}
        producto={{ nombre: creado.nombre, detalle: `@${creado.usuario}` }}
        datos={[
          { etiqueta: "Rol", valor: ETIQUETA_ROL[creado.rol] },
          { etiqueta: "Contraseña temporal", valor: creado.password },
        ]}
        principal={{
          titulo: "Compartir acceso",
          onPress: () =>
            void Share.share({
              message: mensajeAcceso({ usuario: creado.usuario, password: creado.password }),
            }),
        }}
        secundario={{ titulo: "Volver a Usuarios", onPress: () => router.back() }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado
        variante="pantalla"
        titulo="Nuevo usuario"
        // Mientras se crea no se sale: la contraseña temporal solo se muestra al terminar.
        accion={{ icono: "cerrar", etiqueta: "Cerrar", onPress: () => !cargando && router.back() }}
      />
      <ScrollView
        testID="contenido-principal"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: ESPACIO.l,
          paddingBottom: ESPACIO.l + espacio,
          gap: ESPACIO.l,
        }}
      >
        <Campo
          label="Nombre"
          placeholder="Nombre y apellido"
          value={nombre}
          onChangeText={(t) => {
            setNombre(t);
            setError(null);
          }}
          autoCapitalize="words"
          maxLength={120}
        />
        <View style={{ gap: ESPACIO.xs }}>
          <Campo
            label="Usuario"
            value={usuario}
            onChangeText={(t) => {
              setUsuario(t);
              setExistente(false);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            error={errorUsuario}
          />
          {errorUsuario ? null : (
            <Texto variante="pequeno" tono="secundario">
              Minúsculas, números, punto o guion (3 a 30)
            </Texto>
          )}
        </View>
        <View style={{ gap: ESPACIO.s }}>
          <Texto variante="etiqueta" tono="secundario">
            Rol
          </Texto>
          <Segmentado opciones={ROLES} valor={rol} onCambio={setRol} />
        </View>
        {error ? <AvisoAdvertencia tono="peligro" alerta texto={error} /> : null}
        <Boton
          titulo="Crear usuario"
          disabled={!listo}
          loading={cargando}
          onPress={() => void enviar()}
        />
      </ScrollView>
    </View>
  );
}
