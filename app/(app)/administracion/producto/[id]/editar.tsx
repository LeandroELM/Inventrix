import { Text } from "react-native";
import { Pantalla } from "@/components/Pantalla";
import { RequiereRol } from "@/features/auth/RequiereRol";

export default function Placeholder() {
  return (
    <RequiereRol rol="admin">
      <Pantalla>
        <Text>Editar producto</Text>
      </Pantalla>
    </RequiereRol>
  );
}
