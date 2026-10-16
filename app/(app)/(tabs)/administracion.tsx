import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Encabezado } from "@/components/Encabezado";
import { FilaLista } from "@/components/FilaLista";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { useAuth } from "@/features/auth/AuthProvider";
import { puede, type Accion } from "@/features/auth/permisos";
import { useEspacioInferior } from "@/components/BarraInferior";
import { ESPACIO } from "@/tema/tokens";
import { useTema } from "@/tema/TemaProvider";

const OPCIONES: { titulo: string; detalle: string; ruta: Href; accion: Accion; icono: NombreIcono }[] = [
  {
    titulo: "Reportes",
    detalle: "Indicadores, gráfico y exportación a Excel",
    ruta: "/administracion/reportes",
    accion: "ver_reportes",
    icono: "administracion",
  },
  {
    titulo: "Historial de movimientos",
    detalle: "Entradas y salidas con filtros y detalle",
    ruta: "/movimientos/historial",
    accion: "ver_historial",
    icono: "movimientos",
  },
  {
    titulo: "Usuarios",
    detalle: "Altas, roles, contraseñas y acceso",
    ruta: "/administracion/usuarios",
    accion: "gestionar_usuarios",
    icono: "usuario",
  },
  {
    titulo: "Dar de baja producto",
    detalle: "Retira un producto del catálogo",
    ruta: "/administracion/baja",
    accion: "dar_baja",
    icono: "alerta",
  },
];

export default function Administracion() {
  const { perfil } = useAuth();
  const router = useRouter();
  const { colores } = useTema();
  const espacio = useEspacioInferior();
  if (!perfil) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Encabezado variante="pantalla" titulo="Administración" subtitulo="Herramientas del administrador" />
      <View style={{ padding: ESPACIO.l, paddingBottom: ESPACIO.l + espacio }}>
        <Tarjeta>
          {OPCIONES.filter((o) => puede(perfil.rol, o.accion)).map((o) => (
            <FilaLista
              key={o.titulo}
              titulo={o.titulo}
              detalle={o.detalle}
              izquierda={<Icono nombre={o.icono} tamano={24} color={colores.primario} />}
              onPress={() => router.push(o.ruta)}
            />
          ))}
        </Tarjeta>
      </View>
    </View>
  );
}
