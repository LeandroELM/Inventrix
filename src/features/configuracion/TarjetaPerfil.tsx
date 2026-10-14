import { View } from "react-native";
import { AvatarProducto } from "@/components/AvatarProducto";
import { Tarjeta } from "@/components/Tarjeta";
import { Texto } from "@/components/Texto";
import type { Perfil } from "@/features/auth/AuthProvider";
import { ESPACIO } from "@/tema/tokens";

const ROL = { admin: "Administrador", operativo: "Operativo" } as const;

export function TarjetaPerfil({ perfil }: { perfil: Perfil }) {
  const rol = ROL[perfil.rol];
  return (
    <View accessible accessibilityLabel={`${perfil.nombre}, usuario ${perfil.usuario}, ${rol}`}>
      <Tarjeta style={{ flexDirection: "row", alignItems: "center", gap: ESPACIO.l }}>
        <AvatarProducto nombre={perfil.nombre} tamano={56} />
        <View style={{ flex: 1 }}>
          <Texto variante="cuerpoFuerte" numberOfLines={1}>
            {perfil.nombre}
          </Texto>
          <Texto tono="secundario" numberOfLines={1}>
            {`@${perfil.usuario} · ${rol}`}
          </Texto>
        </View>
      </Tarjeta>
    </View>
  );
}
