import { Animated } from "react-native";
import { interpolarPestana } from "@/animacion/transicionPestanas";

type Estilo = { opacity: Animated.AnimatedInterpolation<number>; transform: { translateX: Animated.AnimatedInterpolation<number> }[] };

function estiloEn(progreso: number) {
  const valor = new Animated.Value(progreso);
  const { sceneStyle } = interpolarPestana({ current: { progress: valor } });
  const estilo = sceneStyle as unknown as Estilo;
  const leer = (v: Animated.AnimatedInterpolation<number>) => (v as unknown as { __getValue(): number }).__getValue();
  return { opacidad: leer(estilo.opacity), x: leer(estilo.transform[0].translateX) };
}

describe("transición entre pestañas", () => {
  it("la pestaña visible está opaca y en su lugar", () => {
    expect(estiloEn(0)).toEqual({ opacidad: 1, x: 0 });
  });

  it("una pestaña fuera de pantalla está transparente", () => {
    expect(estiloEn(1).opacidad).toBe(0);
    expect(estiloEn(-1).opacidad).toBe(0);
  });

  // La nueva (encima) va de ±1 a 0 y la anterior (debajo) de 0 a ∓1, al mismo ritmo. Si en algún
  // momento las dos estuvieran a medias, el fondo se vería a través: eso era el parpadeo.
  it.each([1, -1])("en ningún instante las dos pantallas están a medias (lado %d)", (lado) => {
    for (let paso = 0; paso <= 20; paso++) {
      const t = paso / 20;
      const nueva = estiloEn(lado * (1 - t));
      const anterior = estiloEn(-lado * t);
      expect({ t, cubierto: nueva.opacidad === 1 || anterior.opacidad === 1 }).toEqual({ t, cubierto: true });
    }
  });

  it("la anterior no se mueve mientras todavía se ve", () => {
    for (const p of [0, 0.25, 0.5, -0.25, -0.5]) expect(estiloEn(p).x).toBe(0);
  });
});
