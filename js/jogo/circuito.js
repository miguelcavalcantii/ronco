/**
 * Circuito fechado (autódromo). Tem a mesma interface do Tracado (em, indice,
 * garantir, descartarAte, deslocar), então a estrada em pedaços, a física e as
 * câmeras funcionam sem mudança: `s` continua crescendo volta após volta e o
 * circuito se repete.
 *
 * O traçado é uma curva Catmull-Rom centrípeta fechada passando por pontos de
 * controle (x = leste, y = norte, h = altura), reamostrada a cada PASSO metros.
 * O desenho é inspirado em Interlagos (sentido anti-horário, curvas com os nomes
 * conhecidos), não uma cópia exata das medidas.
 */
import { PASSO } from './tracado.js?v=202610240909';

export const INTERLAGOS = {
  id: 'interlagos',
  nome: 'Autódromo inspirado em Interlagos',
  escala: 1.35,
  // [leste, norte, altura]
  pontos: [
    [250, 480, 20], // 0  linha de chegada (Reta dos Boxes)
    [-60, 490, 18], // 1  freada do S
    [-150, 475, 13], // 2  S do Senna (esquerda)
    [-175, 430, 9], // 3
    [-215, 385, 6], // 4  S do Senna (direita)
    [-240, 300, 4], // 5  Curva do Sol
    [-210, 210, 3], // 6
    [-120, 160, 2], // 7  saída para a Reta Oposta
    [250, 110, -2], // 8
    [560, 70, -6], // 9  fim da Reta Oposta
    [650, 80, -8], // 10 Descida do Lago
    [700, 150, -8], // 11
    [680, 215, -6], // 12
    [600, 255, -3], // 13
    [500, 250, -1], // 14 Ferradura
    [440, 280, 0], // 15
    [450, 330, 2], // 16 Laranjinha
    [500, 365, 3], // 17
    [560, 368, 4], // 18 Pinheirinho
    [605, 380, 5], // 19
    [618, 418, 6], // 20 Bico de Pato
    [652, 446, 6], // 21
    [688, 418, 3], // 22 Mergulho
    [705, 350, -2], // 23
    [750, 330, -3], // 24 Junção
    [800, 380, 0], // 25 Subida dos Boxes
    [790, 450, 10], // 26
    [700, 490, 18], // 27
  ],
  // Nome de cada parte do circuito a partir de um ponto de controle
  trechos: [
    [0, 'Reta dos Boxes'], [1, 'S do Senna'], [5, 'Curva do Sol'], [7, 'Reta Oposta'], [10, 'Descida do Lago'],
    [13, 'Ferradura'], [16, 'Laranjinha'], [18, 'Pinheirinho'], [20, 'Bico de Pato'], [22, 'Mergulho'],
    [24, 'Junção'], [25, 'Subida dos Boxes'], [27, 'Reta dos Boxes'],
  ],
};

/** Catmull-Rom centrípeta (Barry–Goldman) entre p1 e p2, parâmetro u ∈ [0, 1]. */
function catmullRom(p0, p1, p2, p3, u) {
  const dist = (a, b) => Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) ** 0.5);
  const t0 = 0;
  const t1 = t0 + dist(p0, p1);
  const t2 = t1 + dist(p1, p2);
  const t3 = t2 + dist(p2, p3);
  const t = t1 + (t2 - t1) * u;
  const lerp = (a, b, ta, tb) => a.map((v, i) => ((tb - t) / (tb - ta)) * v + ((t - ta) / (tb - ta)) * b[i]);
  const a1 = lerp(p0, p1, t0, t1);
  const a2 = lerp(p1, p2, t1, t2);
  const a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2);
  const b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

/** Amostra o circuito: pontos a cada PASSO metros com rumo, curvatura e inclinação. */
export function amostrarCircuito(def) {
  const e = def.escala ?? 1;
  // Mundo: x = leste, z = −norte (assim o sentido anti-horário do mapa se mantém visto de cima)
  const P = def.pontos.map(([x, y, h]) => [x * e, h, -y * e]);
  const n = P.length;
  const denso = [];
  const indiceControle = [];
  for (let i = 0; i < n; i++) {
    indiceControle.push(denso.length);
    const p0 = P[(i - 1 + n) % n];
    const p1 = P[i];
    const p2 = P[(i + 1) % n];
    const p3 = P[(i + 2) % n];
    for (let k = 0; k < 120; k++) denso.push(catmullRom(p0, p1, p2, p3, k / 120));
  }
  // Comprimento acumulado (no plano) e reamostragem uniforme
  const acumulado = [0];
  for (let i = 1; i <= denso.length; i++) {
    const a = denso[i - 1];
    const b = denso[i % denso.length];
    acumulado.push(acumulado[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2]));
  }
  const total = acumulado[denso.length];
  const N = Math.round(total / PASSO);
  const passo = total / N;
  const amostras = [];
  let j = 0;
  for (let i = 0; i < N; i++) {
    const alvo = i * passo;
    while (acumulado[j + 1] < alvo) j++;
    const f = (alvo - acumulado[j]) / (acumulado[j + 1] - acumulado[j]);
    const a = denso[j];
    const b = denso[(j + 1) % denso.length];
    amostras.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, z: a[2] + (b[2] - a[2]) * f });
  }
  // Suaviza as alturas (rampas suaves) e calcula rumo contínuo, curvatura e inclinação
  for (let volta = 0; volta < 3; volta++) {
    const ys = amostras.map((a) => a.y);
    for (let i = 0; i < N; i++) {
      let soma = 0;
      for (let k = -6; k <= 6; k++) soma += ys[(i + k + N) % N];
      amostras[i].y = soma / 13;
    }
  }
  let rumoAnterior = null;
  for (let i = 0; i < N; i++) {
    const a = amostras[(i - 1 + N) % N];
    const b = amostras[(i + 1) % N];
    let rumo = Math.atan2(b.x - a.x, b.z - a.z);
    if (rumoAnterior !== null) {
      while (rumo - rumoAnterior > Math.PI) rumo -= 2 * Math.PI;
      while (rumo - rumoAnterior < -Math.PI) rumo += 2 * Math.PI;
    }
    amostras[i].rumo = rumo;
    rumoAnterior = rumo;
  }
  // Giro total numa volta (±2π): fecha o rumo entre o fim e o começo
  let ultimo = amostras[0].rumo;
  {
    const a = amostras[N - 1];
    const b = amostras[1];
    let r = Math.atan2(b.x - a.x, b.z - a.z);
    while (r - amostras[N - 1].rumo > Math.PI) r -= 2 * Math.PI;
    while (r - amostras[N - 1].rumo < -Math.PI) r += 2 * Math.PI;
    ultimo = r;
  }
  const giroVolta = ultimo - amostras[0].rumo + (amostras[N - 1].rumo - amostras[N - 1].rumo);
  for (let i = 0; i < N; i++) {
    const anterior = i > 0 ? amostras[i - 1].rumo : amostras[N - 1].rumo - giroVolta;
    const proximo = i < N - 1 ? amostras[i + 1].rumo : amostras[0].rumo + giroVolta;
    amostras[i].curvatura = -(proximo - anterior) / (2 * passo); // + = direita
    const ya = amostras[(i - 1 + N) % N].y;
    const yb = amostras[(i + 1) % N].y;
    amostras[i].inclinacao = Math.atan((yb - ya) / (2 * passo));
    amostras[i].lateral = 0;
  }
  // Onde começa cada trecho com nome (em metros desde a linha de chegada)
  const trechos = def.trechos.map(([ponto, nome]) => {
    const alvo = P[ponto];
    let melhor = 0;
    let distancia = Infinity;
    amostras.forEach((a, i) => {
      const dd = Math.hypot(a.x - alvo[0], a.z - alvo[2]);
      if (dd < distancia) { distancia = dd; melhor = i; }
    });
    return { s: melhor * passo, nome };
  }).sort((a, b) => a.s - b.s);
  return { amostras, N, passo, comprimento: total, giroVolta, trechos };
}

export class Circuito {
  base = 0;
  relevo = 0;
  sinuosidade = 1;
  #off = { x: 0, y: 0, z: 0 };

  constructor(def = INTERLAGOS) {
    const r = amostrarCircuito(def);
    this.def = def;
    this.amostras = r.amostras;
    this.N = r.N;
    this.passo = r.passo;
    this.comprimento = r.N * PASSO;
    this.giroVolta = r.giroVolta;
    this.trechos = r.trechos;
  }

  get inicio() { return 0; }
  get fim() { return Infinity; }
  garantir() {}
  descartarAte() {}

  deslocar(dx, dy, dz) {
    this.#off.x += dx;
    this.#off.y += dy;
    this.#off.z += dz;
  }

  /** Amostra pelo índice global (voltas seguidas: o rumo continua somando). */
  indice(i, saida = {}) {
    const volta = Math.floor(i / this.N);
    const a = this.amostras[i - volta * this.N];
    saida.x = a.x - this.#off.x;
    saida.y = a.y - this.#off.y;
    saida.z = a.z - this.#off.z;
    saida.rumo = a.rumo + volta * this.giroVolta;
    saida.inclinacao = a.inclinacao;
    saida.lateral = 0;
    saida.curvatura = a.curvatura;
    return saida;
  }

  #a = {};
  #b = {};
  em(s, saida = {}) {
    const t = Math.max(0, s) / PASSO;
    const i = Math.floor(t);
    const f = t - i;
    const a = this.indice(i, this.#a);
    const b = this.indice(i + 1, this.#b);
    saida.x = a.x + (b.x - a.x) * f;
    saida.y = a.y + (b.y - a.y) * f;
    saida.z = a.z + (b.z - a.z) * f;
    saida.rumo = a.rumo + (b.rumo - a.rumo) * f;
    saida.inclinacao = a.inclinacao + (b.inclinacao - a.inclinacao) * f;
    saida.lateral = 0;
    saida.curvatura = a.curvatura + (b.curvatura - a.curvatura) * f;
    return saida;
  }

  /** Volta atual (0 antes de cruzar a linha pela primeira vez) e posição dentro dela. */
  volta(s) {
    return { numero: Math.floor(s / this.comprimento), dentro: s % this.comprimento };
  }

  /** Nome do trecho do circuito na distância `s`. */
  nomeTrecho(s) {
    const dentro = ((s % this.comprimento) + this.comprimento) % this.comprimento;
    let nome = this.trechos[this.trechos.length - 1].nome;
    for (const t of this.trechos) if (t.s <= dentro) nome = t.nome;
    return nome;
  }

  /** Deslocamento atual da origem flutuante (para o cenário fixo acompanhar). */
  get deslocamento() { return this.#off; }
}
