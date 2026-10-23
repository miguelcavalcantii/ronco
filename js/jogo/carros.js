/**
 * Catálogo de carros. Por enquanto só o carro de base (estilizado, sem marca);
 * a garagem acrescenta os outros numa etapa seguinte.
 *
 * Números de jogo (arcade), não fichas técnicas:
 * - vmax em km/h, zeroCem em segundos, estabilidade 0–1 (aderência nas curvas)
 * - motor: perfil de som (ver motorSom.js); marchas: relações de 1ª até a última
 */
export const CARROS = [
  {
    id: 'ronco-gt',
    nome: 'Ronco GT',
    descricao: 'Cupê esportivo do Ronco, V8 dianteiro.',
    forma: 'cupe',
    cor: '#ffd60a',
    vmax: 265,
    zeroCem: 4.6,
    estabilidade: 0.72,
    motor: 'v8',
    rpmMax: 7200,
    rpmLenta: 850,
    marchas: [3.2, 2.1, 1.55, 1.2, 0.98, 0.82],
  },
];

export const obterCarro = (id) => CARROS.find((c) => c.id === id) ?? CARROS[0];
