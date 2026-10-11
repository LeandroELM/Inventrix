import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useTema } from "@/tema/TemaProvider";

export function IconoTrix({ tamano = 24 }: { tamano?: number }) {
  const { colores } = useTema();
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" importantForAccessibility="no-hide-descendants">
      <Rect x={4} y={7} width={16} height={12} rx={5} stroke={colores.texto} strokeWidth={1.8} />
      <Circle cx={9.5} cy={13} r={1.3} fill={colores.texto} />
      <Circle cx={14.5} cy={13} r={1.3} fill={colores.texto} />
      <Path d="M12 7V4.5" stroke={colores.texto} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={3.5} r={1.4} fill={colores.exito} />
    </Svg>
  );
}

export function LogoMarca({ tamano = 20 }: { tamano?: number }) {
  const { colores } = useTema();
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" importantForAccessibility="no-hide-descendants">
      <Rect x={4} y={14} width={5} height={6} fill={colores.marca} />
      <Rect x={9.5} y={9} width={5} height={11} fill={colores.marca} />
      <Rect x={15} y={12} width={5} height={8} fill={colores.marca} />
      <Path d="M8 13l9-9M12 4h5v5" stroke={colores.marcaAcento} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
