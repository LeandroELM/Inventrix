import { RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Skeleton } from "@/animacion/Skeleton";
import { AvatarProducto } from "@/components/AvatarProducto";
import { AvisoRecarga } from "@/components/AvisoRecarga";
import { Encabezado } from "@/components/Encabezado";
import { EstadoError } from "@/components/EstadoError";
import { Etiqueta } from "@/components/Etiqueta";
import { FilaLista } from "@/components/FilaLista";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequiereRol } from "@/features/auth/RequiereRol";
import type { Usuario } from "@/features/usuarios/api";
import { useUsuarios } from "@/features/usuarios/hooks";
import { ETIQUETA_ROL } from "@/features/usuarios/validacion";
import { useEspacioInferior } from "@/components/BarraInferior";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

export default function Usuarios() {
  return (
    <RequiereRol rol="admin">
      <ListaUsuarios />
    </RequiereRol>
  );
}

function ListaUsuarios() {
  const { colores } = useTema();
  const router = useRouter();
  const { perfil } = useAuth();
  const { data, isPending, isError, isRefetching, refetch } = useUsuarios();
  const espacio = useEspacioInferior();
  const activos = data?.filter((u) => u.activo) ?? [];
  const inactivos = data?.filter((u) => !u.activo) ?? [];

  const fila = (u: Usuario) => (
    <View key={u.id} style={{ opacity: u.activo ? 1 : 0.6 }}>
      <FilaLista
        titulo={u.id === perfil?.id ? `${u.nombre} (tú)` : u.nombre}
        detalle={`@${u.usuario} · ${ETIQUETA_ROL[u.rol]}`}
        izquierda={<AvatarProducto nombre={u.nombre} />}
        derecha={u.activo ? undefined : <Etiqueta tipo="inactivo" texto="Inactivo" />}
        onPress={() => router.push(`/administracion/usuarios/${u.id}`)}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado
        variante="pantalla"
        titulo="Usuarios"
        onAtras={() => router.back()}
        accion={{
          icono: "mas",
          etiqueta: "Nuevo usuario",
          onPress: () => router.push("/administracion/usuarios/nuevo"),
        }}
      />
      <ScrollView
        testID="contenido-principal"
        contentContainerStyle={{
          padding: ESPACIO.l,
          paddingBottom: ESPACIO.l + espacio,
          gap: ESPACIO.l,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        {/* Si una recarga falla pero ya hay datos, se siguen mostrando. */}
        {data && isError ? <AvisoRecarga onReintentar={() => void refetch()} /> : null}
        {!data && isPending ? (
          <>
            <Skeleton.Fila />
            <Skeleton.Fila />
            <Skeleton.Fila />
          </>
        ) : null}
        {!data && isError ? (
          <EstadoError
            mensaje="No se pudo cargar la lista de usuarios."
            onReintentar={() => void refetch()}
          />
        ) : null}
        {data ? (
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="subtitulo">{`Activos (${activos.length})`}</Texto>
            <Tarjeta>{activos.map(fila)}</Tarjeta>
          </View>
        ) : null}
        {inactivos.length > 0 ? (
          <View style={{ gap: ESPACIO.s }}>
            <Texto variante="subtitulo">{`Inactivos (${inactivos.length})`}</Texto>
            <Tarjeta>{inactivos.map(fila)}</Tarjeta>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
