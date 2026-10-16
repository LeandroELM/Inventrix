import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Boton } from "@/components/Boton";
import { FilaLista } from "@/components/FilaLista";
import { Icono } from "@/components/Icono";
import { IconoTrix } from "@/components/Marca";
import { Pantalla } from "@/components/Pantalla";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { cargarNotificaciones } from "@/features/alertas/notificaciones";
import { registrarPush, type ResultadoPush } from "@/features/alertas/push";
import { useAuth } from "@/features/auth/AuthProvider";
import { HojaCerrarSesion } from "@/features/configuracion/HojaCerrarSesion";
import { HojaContrasena } from "@/features/configuracion/HojaContrasena";
import { TarjetaPerfil } from "@/features/configuracion/TarjetaPerfil";
import { mensajeDeError } from "@/lib/errores";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const ESTADO_PERMISO = {
  granted: "Permitido",
  denied: "Denegado",
  undetermined: "Sin definir",
} as const;

function Encabezado({ texto }: { texto: string }) {
  return (
    <Texto accessibilityRole="header" variante="pequeno" tono="secundario">
      {texto}
    </Texto>
  );
}

function useNotificaciones() {
  const [permiso, setPermiso] = useState<string>("Consultando…");
  const [resultado, setResultado] = useState<ResultadoPush | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    const Notifications = cargarNotificaciones();
    if (!Notifications) {
      setPermiso("No disponible");
      return;
    }
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermiso(ESTADO_PERMISO[status]);
    } catch {
      setPermiso("No disponible");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consulta asíncrona inicial del permiso
    void consultar();
  }, [consultar]);

  async function reintentar() {
    setError(null);
    try {
      setResultado(await registrarPush());
    } catch (e) {
      setError(mensajeDeError(e));
    }
    await consultar();
  }

  return { permiso, resultado, error, reintentar };
}

type EstadoNotificaciones = ReturnType<typeof useNotificaciones>;

function FilaNotificaciones({
  permiso,
  reintentar,
}: Pick<EstadoNotificaciones, "permiso" | "reintentar">) {
  const { colores } = useTema();
  return (
    <FilaLista
      titulo="Notificaciones"
      detalle={`Permiso: ${permiso}`}
      izquierda={<Icono nombre="campana" tamano={20} color={colores.textoSecundario} />}
      derecha={
        permiso !== "Permitido" ? (
          <Boton
            titulo="Reintentar"
            variante="secundario"
            accessibilityLabel="Reintentar registro de notificaciones"
            onPress={() => void reintentar()}
          />
        ) : undefined
      }
    />
  );
}

function MensajesNotificaciones({
  resultado,
  error,
}: Pick<EstadoNotificaciones, "resultado" | "error">) {
  return (
    <>
      {resultado === "autorizado" ? <Texto>Dispositivo registrado.</Texto> : null}
      {resultado === "denegado" ? (
        <Texto>Permiso denegado. Actívalo en los ajustes del teléfono.</Texto>
      ) : null}
      {resultado === "no_disponible" ? (
        <Texto>Las notificaciones no están disponibles en este dispositivo.</Texto>
      ) : null}
      {error ? (
        <Texto accessibilityRole="alert" tono="peligro">
          {error}
        </Texto>
      ) : null}
    </>
  );
}

export default function Configuracion() {
  const { perfil, cerrarSesion } = useAuth();
  const router = useRouter();
  const { colores, esquema, alternarEsquema } = useTema();
  const [hoja, setHoja] = useState<"contrasena" | "sesion" | null>(null);
  const [exito, setExito] = useState(false);
  const notificaciones = useNotificaciones();
  const esAdmin = perfil?.rol === "admin";
  const version = Constants.expoConfig?.version;

  return (
    <>
      <Pantalla scroll bordeSuperior>
        <Texto accessibilityRole="header" variante="titulo">
          Configuración
        </Texto>
        {perfil ? <TarjetaPerfil perfil={perfil} /> : null}
        {exito ? (
          <Texto tono="exito" accessibilityLiveRegion="polite">
            Contraseña actualizada.
          </Texto>
        ) : null}

        <Encabezado texto="CUENTA" />
        <Tarjeta>
          <FilaLista
            titulo="Cambiar contraseña"
            izquierda={<Icono nombre="candado" tamano={20} color={colores.textoSecundario} />}
            onPress={() => {
              setExito(false);
              setHoja("contrasena");
            }}
          />
        </Tarjeta>

        <Encabezado texto="PREFERENCIAS" />
        <View testID="tarjeta-preferencias">
          <Tarjeta>
            <FilaLista
              titulo="Modo oscuro"
              izquierda={<Icono nombre="luna" tamano={20} color={colores.textoSecundario} />}
              onPress={alternarEsquema}
              derecha={
                <Switch
                  accessibilityLabel="Modo oscuro"
                  value={esquema === "oscuro"}
                  onValueChange={alternarEsquema}
                  trackColor={{ false: colores.inactivo, true: colores.interactivo }}
                  thumbColor={colores.superficie}
                />
              }
            />
            {esAdmin ? (
              <FilaNotificaciones
                permiso={notificaciones.permiso}
                reintentar={notificaciones.reintentar}
              />
            ) : null}
          </Tarjeta>
        </View>
        {esAdmin ? (
          <MensajesNotificaciones
            resultado={notificaciones.resultado}
            error={notificaciones.error}
          />
        ) : null}

        <Encabezado texto="AYUDA" />
        <Tarjeta>
          <FilaLista
            titulo="Hablar con Trix"
            detalle="Dudas sobre cómo usar la app"
            izquierda={<IconoTrix tamano={20} />}
            onPress={() => router.push("/soporte")}
          />
        </Tarjeta>

        <Tarjeta>
          <FilaLista
            titulo="Cerrar sesión"
            tono="peligro"
            izquierda={<Icono nombre="salir" tamano={20} color={colores.peligro} />}
            onPress={() => setHoja("sesion")}
          />
        </Tarjeta>

        {version ? (
          <View style={{ alignItems: "center", paddingTop: ESPACIO.s }}>
            <Texto variante="pequeno" tono="secundario">{`Inventrix v${version}`}</Texto>
          </View>
        ) : null}
      </Pantalla>
      {hoja === "contrasena" ? (
        <HojaContrasena
          onCerrar={() => setHoja(null)}
          onGuardada={() => {
            setHoja(null);
            setExito(true);
          }}
        />
      ) : null}
      {hoja === "sesion" ? (
        <HojaCerrarSesion onCerrar={() => setHoja(null)} onConfirmar={cerrarSesion} />
      ) : null}
    </>
  );
}
