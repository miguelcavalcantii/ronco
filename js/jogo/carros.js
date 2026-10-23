/**
 * Catálogo de carros. Os modelos são estilizados (feitos em código) e não
 * usam logotipos; os nomes identificam o carro que inspirou cada um.
 * Quando houver um modelo real em assets/modelos/ (ver MODELOS.md), a garagem
 * e o jogo trocam automaticamente.
 *
 * Números de jogo (arcade), baseados nos de fábrica arredondados:
 * - vmax em km/h, zeroCem em segundos, estabilidade 0–1 (aderência nas curvas)
 * - motor: perfil de som (motorSom.js); marchas: relações da 1ª até a última
 */
export const CATEGORIAS = [
  { id: 'esportivo', nome: 'Esportivos' },
  { id: 'super', nome: 'Supercarros' },
  { id: 'rua', nome: 'Dia a dia' },
  { id: 'pista', nome: 'Pista' },
];

const SEIS = [3.4, 2.2, 1.6, 1.25, 1.0, 0.82];
const SETE = [3.6, 2.4, 1.8, 1.4, 1.12, 0.92, 0.76];

export const CARROS = [
  {
    id: 'ronco-gt', nome: 'Ronco GT', inspiracao: 'Original do Ronco', categoria: 'esportivo',
    descricao: 'O cupê da casa: V8 dianteiro, tração traseira e um ronco grave.',
    forma: 'cupe', cor: '#ffd60a', motor: 'v8', vmax: 265, zeroCem: 4.6, estabilidade: 0.72, rpmMax: 7200, rpmLenta: 850, marchas: SEIS,
  },
  {
    id: 'porsche-911', nome: 'Porsche 911 Carrera S', inspiracao: 'Cupê de motor traseiro', categoria: 'esportivo',
    descricao: 'Seis cilindros boxer atrás do eixo traseiro: sai das curvas como um estilingue.',
    forma: 'cupeTraseiro', cor: '#c3c7cc', motor: 'l6', vmax: 308, zeroCem: 3.5, estabilidade: 0.84, rpmMax: 7500, rpmLenta: 900, marchas: SETE,
  },
  {
    id: 'bmw-m3', nome: 'BMW M3', inspiracao: 'Sedã esportivo', categoria: 'esportivo',
    descricao: 'Sedã de quatro portas com seis em linha biturbo e alma de pista.',
    forma: 'sedan', cor: '#1e5bff', motor: 'l6', vmax: 290, zeroCem: 3.9, estabilidade: 0.78, rpmMax: 7200, rpmLenta: 800, marchas: SEIS,
  },
  {
    id: 'mercedes-amg-gt', nome: 'Mercedes-AMG GT', inspiracao: 'Cupê de capô longo', categoria: 'esportivo',
    descricao: 'Capô comprido, V8 biturbo e um escapamento que estala.',
    forma: 'cupe', cor: '#e8e8e8', acabamento: 'solida', motor: 'v8', vmax: 315, zeroCem: 3.8, estabilidade: 0.8, rpmMax: 7200, rpmLenta: 750, marchas: SETE,
  },
  {
    id: 'toyota-supra', nome: 'Toyota GR Supra', inspiracao: 'Cupê japonês', categoria: 'esportivo',
    descricao: 'Seis em linha turbo, entre-eixos curto e muita vontade de girar.',
    forma: 'cupe', cor: '#e10600', motor: 'l6', vmax: 250, zeroCem: 4.3, estabilidade: 0.74, rpmMax: 7000, rpmLenta: 800, marchas: SEIS,
  },
  {
    id: 'ford-mustang', nome: 'Ford Mustang GT', inspiracao: 'Muscle car', categoria: 'esportivo',
    descricao: 'V8 aspirado de 5 litros: torque de sobra e uma traseira que gosta de sair.',
    forma: 'muscle', cor: '#0a6b3a', motor: 'v8', vmax: 250, zeroCem: 4.3, estabilidade: 0.66, rpmMax: 7400, rpmLenta: 700, marchas: SEIS, roda: 'classica',
  },
  {
    id: 'audi-r8', nome: 'Audi R8 V10', inspiracao: 'Supercarro de motor central', categoria: 'super',
    descricao: 'V10 aspirado logo atrás dos bancos e tração integral.',
    forma: 'supercarro', cor: '#8a9099', motor: 'v12', vmax: 324, zeroCem: 3.4, estabilidade: 0.86, rpmMax: 8500, rpmLenta: 1000, marchas: SETE, roda: 'multi',
  },
  {
    id: 'ferrari-f8', nome: 'Ferrari F8 Tributo', inspiracao: 'Berlineta V8', categoria: 'super',
    descricao: 'V8 biturbo central, direção afiadíssima e vermelho de corrida.',
    forma: 'supercarro', cor: '#d10a0a', motor: 'v8', vmax: 340, zeroCem: 2.9, estabilidade: 0.87, rpmMax: 8000, rpmLenta: 1000, marchas: SETE,
  },
  {
    id: 'lamborghini-aventador', nome: 'Lamborghini Aventador', inspiracao: 'Cunha V12', categoria: 'super',
    descricao: 'Desenho de cunha, V12 aspirado e portas que abrem para cima.',
    forma: 'cunha', cor: '#7ad61a', motor: 'v12', vmax: 350, zeroCem: 2.9, estabilidade: 0.83, rpmMax: 8500, rpmLenta: 1000, marchas: SETE, roda: 'multi', corRoda: '#141516',
  },
  {
    id: 'porsche-taycan', nome: 'Porsche Taycan Turbo S', inspiracao: 'Sedã elétrico', categoria: 'super',
    descricao: 'Dois motores elétricos e uma arrancada silenciosa e brutal.',
    forma: 'sedan', cor: '#5b2a86', acabamento: 'perolizada', motor: 'eletrico', vmax: 260, zeroCem: 2.8, estabilidade: 0.85, rpmMax: 16000, rpmLenta: 0, marchas: [7.5], roda: 'aero',
  },
  {
    id: 'vw-golf-gti', nome: 'Volkswagen Golf GTI', inspiracao: 'Hatch esportivo', categoria: 'rua',
    descricao: 'O hatch esportivo clássico: 2.0 turbo, leve e divertido.',
    forma: 'hatch', cor: '#d8d8d8', acabamento: 'solida', motor: 'l4turbo', vmax: 250, zeroCem: 6.3, estabilidade: 0.74, rpmMax: 6800, rpmLenta: 800, marchas: SEIS,
  },
  {
    id: 'peugeot-208', nome: 'Peugeot 208 Style', inspiracao: 'Hatch compacto (cinza)', categoria: 'rua',
    descricao: 'Compacto do dia a dia, 1.0 turbo, econômico e esperto no trânsito.',
    forma: 'hatch', cor: '#6e7378', motor: 'popular', vmax: 190, zeroCem: 9.6, estabilidade: 0.7, rpmMax: 6200, rpmLenta: 850, marchas: SEIS, roda: 'aero', corRoda: '#4a4f55',
  },
  {
    id: 'toyota-corolla', nome: 'Toyota Corolla', inspiracao: 'Sedã médio', categoria: 'rua',
    descricao: 'Confortável, confiável e com um motor tranquilo.',
    forma: 'sedan', cor: '#9aa3ab', motor: 'popular', vmax: 195, zeroCem: 9.2, estabilidade: 0.68, rpmMax: 6200, rpmLenta: 750, marchas: SEIS,
  },
  {
    id: 'f1-brasil-88', nome: 'Fórmula Brasil 88', inspiracao: 'F1 dos anos 80 (homenagem)', categoria: 'pista',
    descricao: 'Monoposto de 1988 nas cores do Brasil, V6 turbo gritando a 12 mil giros.',
    forma: 'f1', cor: '#009c3b', motor: 'f1turbo', vmax: 330, zeroCem: 2.7, estabilidade: 0.95, rpmMax: 12500, rpmLenta: 2500, marchas: SEIS, roda: 'classica', corRoda: '#d7dbe0',
  },
];

export const obterCarro = (id) => CARROS.find((c) => c.id === id) ?? CARROS[0];

/* ---------- Números de 0 a 1 para as barras da garagem ---------- */

const normalizar = (v, min, max) => Math.min(1, Math.max(0.05, (v - min) / (max - min)));
export const notas = (c) => ({
  aceleracao: normalizar(11 - c.zeroCem, 0.5, 8.5),
  velocidade: normalizar(c.vmax, 150, 355),
  estabilidade: normalizar(c.estabilidade, 0.55, 0.97),
});
