/**
 * Traçado da estrada infinita: uma linha central gerada aos poucos, amostra a
 * cada PASSO metros, com curvas suaves (curvatura que entra e sai devagar),
 * subidas e descidas e inclinação lateral nas curvas (banking).
 *
 * Coordenadas: `s` é a distância percorrida ao longo da estrada (em metros, desde o início).
 * Rumo θ: frente = (sen θ, 0, cos θ); direita = (−cos θ, 0, sen θ).
 * Curvatura positiva vira para a direita (θ diminui).
 */
import { clamp } from '../nucleo/util.js?v=202610240909';
import { criarRuido } from './ruido.js?v=202610240909';

export const PASSO = 2;
export const MEIA_LARGURA = 7.2; // 4 faixas de 3,6 m
export const ACOSTAMENTO = 1.6;
const CURVATURA_MAX = 1 / 110;

/** Tipos de trecho: [peso, curvatura mínima, curvatura máxima, comprimento mínimo, máximo] */
const TRECHOS = [
  { peso: 3, kMin: 0, kMax: 0, cMin: 80, cMax: 300 },
  { peso: 4, kMin: 1 / 650, kMax: 1 / 320, cMin: 140, cMax: 380 },
  { peso: 3, kMin: 1 / 320, kMax: 1 / 170, cMin: 90, cMax: 240 },
  { peso: 1.5, kMin: 1 / 170, kMax: CURVATURA_MAX, cMin: 60, cMax: 140 },
];

export class Tracado {
  /** Amostras em ordem; a primeira tem índice global `base`. */
  #amostras = [];
  base = 0;
  #ruido;
  #trecho = null;
  #curvatura = 0;
  #lateral = 0;
  #ultimoSinal = 1;
  /** Quanto o relevo sobe e desce (0 = plano). Cada paisagem define o seu. */
  relevo = 1;
  /** Quão sinuosa é a estrada (multiplica as curvaturas). */
  sinuosidade = 1;

  constructor(semente = 7) {
    this.#ruido = criarRuido(semente);
    // Começa numa reta para a largada
    this.#trecho = { k: 0, restante: 420 };
    this.#amostras.push({ x: 0, y: 0, z: 0, rumo: 0, inclinacao: 0, lateral: 0, curvatura: 0 });
  }

  get inicio() { return this.base * PASSO; }
  get fim() { return (this.base + this.#amostras.length - 1) * PASSO; }

  /** Gera amostras até cobrir a distância `s`. */
  garantir(s) {
    while (this.fim < s) this.#gerarAmostra();
  }

  /** Esquece as amostras antes de `s` (economia de memória). */
  descartarAte(s) {
    const n = Math.floor(s / PASSO) - this.base - 2;
    if (n > 0) {
      this.#amostras.splice(0, n);
      this.base += n;
    }
  }

  /** Desloca tudo (origem flutuante: evita perder precisão longe da origem). */
  deslocar(dx, dy, dz) {
    for (const a of this.#amostras) {
      a.x -= dx;
      a.y -= dy;
      a.z -= dz;
    }
  }

  /** Amostra exata pelo índice global. */
  indice(i) {
    return this.#amostras[i - this.base];
  }

  /**
   * Ponto interpolado na distância `s`. Escreve em `saida` (evita criar objetos por quadro).
   */
  em(s, saida = {}) {
    this.garantir(s + PASSO);
    const t = s / PASSO - this.base;
    const i = clamp(Math.floor(t), 0, this.#amostras.length - 2);
    const f = clamp(t - i, 0, 1);
    const a = this.#amostras[i];
    const b = this.#amostras[i + 1];
    saida.x = a.x + (b.x - a.x) * f;
    saida.y = a.y + (b.y - a.y) * f;
    saida.z = a.z + (b.z - a.z) * f;
    saida.rumo = a.rumo + (b.rumo - a.rumo) * f;
    saida.inclinacao = a.inclinacao + (b.inclinacao - a.inclinacao) * f;
    saida.lateral = a.lateral + (b.lateral - a.lateral) * f;
    saida.curvatura = a.curvatura + (b.curvatura - a.curvatura) * f;
    return saida;
  }

  #sortearTrecho() {
    const r = this.#ruido.aleatorio;
    const total = TRECHOS.reduce((soma, t) => soma + t.peso, 0);
    let sorteio = r() * total;
    let tipo = TRECHOS[0];
    for (const t of TRECHOS) {
      sorteio -= t.peso;
      if (sorteio <= 0) { tipo = t; break; }
    }
    // Curvas tendem a alternar de lado (formam "S"), mas nem sempre
    const sinal = r() < 0.68 ? -this.#ultimoSinal : this.#ultimoSinal;
    if (tipo.kMax > 0) this.#ultimoSinal = sinal;
    const k = (tipo.kMin + r() * (tipo.kMax - tipo.kMin)) * sinal;
    return { k: clamp(k * this.sinuosidade, -CURVATURA_MAX, CURVATURA_MAX), restante: tipo.cMin + r() * (tipo.cMax - tipo.cMin) };
  }

  #gerarAmostra() {
    if (this.#trecho.restante <= 0) this.#trecho = this.#sortearTrecho();
    this.#trecho.restante -= PASSO;

    const ultima = this.#amostras[this.#amostras.length - 1];
    const s = this.fim + PASSO;
    // Curvatura entra e sai suavemente (~35 m de transição)
    this.#curvatura += (this.#trecho.k - this.#curvatura) * (PASSO / 35);
    const rumo = ultima.rumo - this.#curvatura * PASSO;
    // Subidas e descidas: soma de ondas lentas (até ~7%), com rampa na largada
    const rampa = clamp((s - 360) / 300, 0, 1);
    const declive = (this.#ruido.r1(s / 420) * 0.055 + this.#ruido.r1(s / 130 + 50) * 0.018) * this.relevo * rampa;
    // Banking: a pista inclina para dentro da curva
    const alvoLateral = clamp(-this.#curvatura * 15, -0.11, 0.11);
    this.#lateral += (alvoLateral - this.#lateral) * (PASSO / 25);

    this.#amostras.push({
      x: ultima.x + Math.sin(rumo) * PASSO,
      y: ultima.y + declive * PASSO,
      z: ultima.z + Math.cos(rumo) * PASSO,
      rumo,
      inclinacao: Math.atan(declive),
      lateral: this.#lateral,
      curvatura: this.#curvatura,
    });
  }
}
