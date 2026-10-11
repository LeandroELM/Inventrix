import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { Boton } from "@/components/Boton";
import { Campo } from "@/components/Campo";
import { Pantalla } from "@/components/Pantalla";
import { cargarNotificaciones } from "@/features/alertas/notificaciones";
import { registrarPush, type ResultadoPush } from "@/features/alertas/push";
import { useAuth } from "@/features/auth/AuthProvider";
import { validarContrasenaNueva } from "@/features/configuracion/contrasena";
import { mensajeDeError } from "@/lib/errores";
import { supabase } from "@/lib/supabase";
import { useTema } from "@/tema/TemaProvider";

const ROLES = { admin: "Administrador", operativo: "Operativo" } as const;
const ESTADO_PERMISO = {
  granted: "Permitido",
  denied: "Denegado",
  undetermined: "Sin definir",
} as const;

function SeccionCuenta() {
  const { perfil } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function cambiar() {
    setExito(false);
    const invalido = validarContrasenaNueva(nueva, confirmacion);
    if (invalido) {
      setError(invalido);
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password: nueva });
      if (e) {
        setError(mensajeDeError(e));
        return;
      }
      setNueva("");
      setConfirmacion("");
      setAbierto(false);
      setExito(true);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Text accessibilityRole="header">Mi cuenta</Text>
      {perfil ? (
        <>
          <Text>Nombre: {perfil.nombre}</Text>
          <Text>Usuario: {perfil.usuario}</Text>
          <Text>Rol: {ROLES[perfil.rol]}</Text>
        </>
      ) : null}
      {exito ? <Text>Contraseña actualizada.</Text> : null}
      {abierto ? (
        <>
          <Campo label="Nueva contraseña" secureTextEntry autoCapitalize="none" value={nueva} onChangeText={setNueva} />
          <Campo
            label="Confirmar contraseña"
            secureTextEntry
            autoCapitalize="none"
            value={confirmacion}
            onChangeText={setConfirmacion}
          />
          {error ? <Text accessibilityRole="alert">{error}</Text> : null}
          <Boton titulo="Guardar contraseña" onPress={() => void cambiar()} loading={guardando} />
        </>
      ) : (
        <Boton titulo="Cambiar contraseña" onPress={() => setAbierto(true)} />
      )}
    </>
  );
}

function SeccionNotificaciones() {
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

  return (
    <>
      <Text accessibilityRole="header">Notificaciones</Text>
      <Text>Permiso: {permiso}</Text>
      {resultado === "autorizado" ? <Text>Dispositivo registrado.</Text> : null}
      {resultado === "denegado" ? <Text>Permiso denegado. Actívalo en los ajustes del teléfono.</Text> : null}
      {resultado === "no_disponible" ? <Text>Las notificaciones no están disponibles en este dispositivo.</Text> : null}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      <Boton titulo="Reintentar registro" onPress={() => void reintentar()} />
    </>
  );
}

function FilaModoOscuro() {
  const { esquema, alternarEsquema } = useTema();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text>Modo oscuro</Text>
      <Switch accessibilityLabel="Modo oscuro" value={esquema === "oscuro"} onValueChange={alternarEsquema} />
    </View>
  );
}

export default function Configuracion() {
  const { perfil, cerrarSesion } = useAuth();
  const router = useRouter();
  return (
    <Pantalla>
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <Text accessibilityRole="header">Configuración</Text>
        <SeccionCuenta />
        {perfil?.rol === "admin" ? <SeccionNotificaciones /> : null}
        <FilaModoOscuro />
        <Text accessibilityRole="header">Soporte técnico</Text>
        <Boton titulo="Abrir soporte" onPress={() => router.push("/soporte")} />
        <Boton titulo="Cerrar sesión" onPress={() => void cerrarSesion()} />
      </ScrollView>
    </Pantalla>
  );
}
