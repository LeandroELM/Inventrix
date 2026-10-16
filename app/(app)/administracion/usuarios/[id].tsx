import { useRef, useState } from "react";
import { ScrollView, Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Skeleton } from "@/animacion/Skeleton";
import { AvatarProducto } from "@/components/AvatarProducto";
import { AvisoAdvertencia } from "@/components/AvisoAdvertencia";
import { Boton } from "@/components/Boton";
import { Encabezado } from "@/components/Encabezado";
import { EstadoError } from "@/components/EstadoError";
import { Etiqueta } from "@/components/Etiqueta";
import { FilaLista } from "@/components/FilaLista";
import { HojaInferior } from "@/components/HojaInferior";
import { Icono } from "@/components/Icono";
import { Segmentado } from "@/components/Segmentado";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Rol } from "@/features/auth/permisos";
import { RequiereRol } from "@/features/auth/RequiereRol";
import type { Usuario } from "@/features/usuarios/api";
import { useCambiarEstado, useCambiarRol, useRestablecerContrasena, useUsuario } from "@/features/usuarios/hooks";
import { ETIQUETA_ROL, mensajeAcceso } from "@/features/usuarios/validacion";
import { mensajeDeError } from "@/lib/errores";
import { useEspacioInferior } from "@/components/BarraInferior";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export default function FichaUsuario() {
  return (
    <RequiereRol rol="admin">
      <Ficha />
    </RequiereRol>
  );
}

const ROLES: { valor: Rol; titulo: string }[] = [
  { valor: "operativo", titulo: ETIQUETA_ROL.operativo },
  { valor: "admin", titulo: ETIQUETA_ROL.admin },
];

type Hoja =
  | { tipo: "rol"; rol: Rol }
  | { tipo: "restablecer" }
  | { tipo: "contrasena"; password: string }
  | { tipo: "estado"; activo: boolean };

function Ficha() {
  const { colores } = useTema();
  const router = useRouter();
  const { perfil } = useAuth();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { data: u, isPending, isError, refetch } = useUsuario(id);
  const espacio = useEspacioInferior();
  const encabezado = <Encabezado variante="pantalla" titulo="Usuario" onAtras={() => router.back()} />;

  if (!u) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        {encabezado}
        <View style={{ padding: ESPACIO.l, gap: ESPACIO.m }}>
          {u === null ? (
            <Texto tono="secundario">No se encontró el usuario.</Texto>
          ) : isPending ? (
            <Skeleton.Tarjeta />
          ) : isError ? (
            <EstadoError mensaje="No se pudo cargar el usuario." onReintentar={() => void refetch()} />
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      {encabezado}
      <ScrollView
        testID="contenido-principal"
        contentContainerStyle={{ padding: ESPACIO.l, paddingBottom: ESPACIO.l + espacio, gap: ESPACIO.l }}
      >
        <Tarjeta>
          <View
            accessible
            accessibilityLabel={`${u.nombre}, usuario ${u.usuario}, ${ETIQUETA_ROL[u.rol]}, ${u.activo ? "activo" : "inactivo"}`}
            style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.m }}
          >
            <AvatarProducto nombre={u.nombre} tamano={56} />
            <View style={{ flex: 1, gap: ESPACIO.xs, alignItems: "flex-start" }}>
              <Texto variante="cuerpoFuerte">{u.nombre}</Texto>
              <Texto tono="secundario">{`@${u.usuario}`}</Texto>
              {u.activo ? <Etiqueta tipo="disponible" texto="Activo" /> : <Etiqueta tipo="inactivo" texto="Inactivo" />}
            </View>
          </View>
        </Tarjeta>
        {u.id === perfil?.id ? (
          <Texto tono="secundario">Tu cuenta se administra en Configuración.</Texto>
        ) : (
          <Acciones usuario={u} />
        )}
      </ScrollView>
    </View>
  );
}

function Acciones({ usuario: u }: { usuario: Usuario }) {
  const { colores } = useTema();
  const cambiarRol = useCambiarRol();
  const cambiarEstado = useCambiarEstado();
  const restablecer = useRestablecerContrasena();
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // El estado `ocupado` llega en el siguiente render: la referencia frena un segundo toque inmediato.
  const enCurso = useRef(false);

  function abrir(h: Hoja) {
    setError(null);
    setHoja(h);
  }

  async function ejecutar(accion: () => Promise<Hoja | null>) {
    if (enCurso.current) return;
    enCurso.current = true;
    setOcupado(true);
    setError(null);
    try {
      setHoja(await accion());
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      enCurso.current = false;
      setOcupado(false);
    }
  }

  function confirmar() {
    if (!hoja) return;
    if (hoja.tipo === "rol") {
      const rol = hoja.rol;
      void ejecutar(async () => {
        await cambiarRol.mutateAsync({ id: u.id, rol });
        return null;
      });
    } else if (hoja.tipo === "estado") {
      const activo = hoja.activo;
      void ejecutar(async () => {
        await cambiarEstado.mutateAsync({ id: u.id, activo });
        return null;
      });
    } else if (hoja.tipo === "restablecer") {
      void ejecutar(async () => {
        const { password } = await restablecer.mutateAsync(u.id);
        return { tipo: "contrasena", password };
      });
    }
  }

  return (
    <>
      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="etiqueta" tono="secundario">
          Rol
        </Texto>
        <Segmentado opciones={ROLES} valor={u.rol} onCambio={(rol) => rol !== u.rol && abrir({ tipo: "rol", rol })} />
      </View>
      <Tarjeta>
        <FilaLista
          titulo="Restablecer contraseña"
          izquierda={<Icono nombre="candado" tamano={22} color={colores.primario} />}
          onPress={() => abrir({ tipo: "restablecer" })}
        />
        {u.activo ? (
          <FilaLista
            titulo="Desactivar usuario"
            tono="peligro"
            izquierda={<Icono nombre="salir" tamano={22} color={colores.peligro} />}
            onPress={() => abrir({ tipo: "estado", activo: false })}
          />
        ) : (
          <FilaLista
            titulo="Reactivar usuario"
            izquierda={<Icono nombre="check" tamano={22} color={colores.primario} />}
            onPress={() => abrir({ tipo: "estado", activo: true })}
          />
        )}
      </Tarjeta>
      {hoja ? (
        // La hoja no se cierra mientras la acción está en curso.
        <HojaInferior bloqueado={ocupado} onCerrar={() => setHoja(null)}>
          <View style={{ padding: ESPACIO.xl, gap: ESPACIO.l }}>
            {hoja.tipo === "contrasena" ? (
              <ContrasenaTemporal
                nombre={u.nombre}
                password={hoja.password}
                onCompartir={() => void Share.share({ message: mensajeAcceso({ usuario: u.usuario, password: hoja.password }) })}
                onListo={() => setHoja(null)}
              />
            ) : (
              <>
                <View style={{ gap: ESPACIO.s }}>
                  <Texto variante="subtitulo">{titulo(hoja, u.nombre)}</Texto>
                  <Texto tono="secundario">{texto(hoja)}</Texto>
                </View>
                {error ? <AvisoAdvertencia tono="peligro" alerta texto={error} /> : null}
                <View style={{ gap: ESPACIO.s }}>
                  <Boton
                    titulo={boton(hoja)}
                    variante={hoja.tipo === "estado" && !hoja.activo ? "peligro" : "primario"}
                    loading={ocupado}
                    onPress={confirmar}
                  />
                  <Boton titulo="Cancelar" variante="secundario" disabled={ocupado} onPress={() => setHoja(null)} />
                </View>
              </>
            )}
          </View>
        </HojaInferior>
      ) : null}
    </>
  );
}

type HojaConfirmar = Exclude<Hoja, { tipo: "contrasena" }>;

function titulo(h: HojaConfirmar, nombre: string): string {
  if (h.tipo === "rol") return h.rol === "admin" ? `¿Hacer administrador a ${nombre}?` : `¿Cambiar a ${nombre} a operativo?`;
  if (h.tipo === "restablecer") return "¿Restablecer la contraseña?";
  return h.activo ? `¿Reactivar a ${nombre}?` : `¿Desactivar a ${nombre}?`;
}

function texto(h: HojaConfirmar): string {
  if (h.tipo === "rol") {
    return h.rol === "admin"
      ? "Podrá registrar y editar productos, dar de baja, ver reportes y alertas, y administrar usuarios."
      : "Solo podrá consultar existencias y registrar entradas y salidas.";
  }
  if (h.tipo === "restablecer") return "Se generará una contraseña temporal y la actual dejará de funcionar.";
  return h.activo
    ? "Podrá volver a entrar con su contraseña actual."
    : "No podrá entrar ni ver el inventario. Su historial se conserva.";
}

function boton(h: HojaConfirmar): string {
  if (h.tipo === "rol") return "Cambiar rol";
  if (h.tipo === "restablecer") return "Restablecer";
  return h.activo ? "Reactivar" : "Desactivar";
}

function ContrasenaTemporal({
  nombre,
  password,
  onCompartir,
  onListo,
}: {
  nombre: string;
  password: string;
  onCompartir: () => void;
  onListo: () => void;
}) {
  return (
    <>
      <View style={{ gap: ESPACIO.s }}>
        <Texto variante="etiqueta" tono="secundario">
          Contraseña temporal
        </Texto>
        <Texto variante="titulo" selectable style={{ fontFamily: "monospace", letterSpacing: 2 }}>
          {password}
        </Texto>
        <Texto tono="secundario">{`Compártela con ${nombre}. Podrá cambiarla en Configuración.`}</Texto>
      </View>
      <View style={{ gap: ESPACIO.s }}>
        <Boton titulo="Compartir" onPress={onCompartir} />
        <Boton titulo="Listo" variante="secundario" onPress={onListo} />
      </View>
    </>
  );
}
