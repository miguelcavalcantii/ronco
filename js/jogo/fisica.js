/**
 * Física arcade do carro, calculada em coordenadas da estrada:
 * `s` = distância ao longo da estrada, `x` = afastamento do centro (+ = direita),
 * `angulo` = quanto o carro aponta para fora da direção da estrada (+ = esquerda).
 *
 * Isso deixa o carro sempre "preso" à pista (não cai do mapa), com curvas,
 * aderência limitada (derrapa se passar do limite), câmbio e batidas na mureta.
 */
import { clamp } from '../nucleo/util.js?v=202610231819';
import { MEIA_LARGURA, ACOSTAMENTO } from './tracado.js?v=202610231819';
import { ENTRE_EIXOS } from './carro3d.js?v=202610231819';

const G = 9.81;
const LIMITE_LATERAL = MEIA_LARGURA + ACOSTAMENTO - 0.75; // centro do carro encosta nos balizadores
const TEMPO_TROCA = 0.2;

export function criarFisica(carro, { raioRoda = 0.34 } = {}) {
  const vmax = carro.vmax / 3.6;
  const aceleracaoMax = (100 / 3.6 / carro.zeroCem) * 1.45;
  const ultima = carro.marchas[carro.marchas.length - 1];
  // Diferencial calculado para a última marcha chegar perto do giro máximo na velocidade máxima
  const diferencial = (carro.rpmMax * 0.95) / ((vmax / (2 * Math.PI * raioRoda)) * 60 * ultima);

  const e = {
    s: 160, // começa com estrada atrás (a câmera precisa de chão)
    x: 5.4, // começa na faixa da direita
    v: 0,
    angulo: 0,
    esterco: 0, // ângulo das rodas dianteiras (rad), + = direita
    marcha: 0, // índice em carro.marchas; −1 = ré
    rpm: carro.rpmLenta,
    trocando: 0,
    derrapagem: 0, // 0–1, para o som do pneu e as marcas
    foraDaPista: false,
    limitador: false,
    giroRodas: 0,
    aceleracaoLongitudinal: 0,
    aceleracaoLateral: 0,
    cambio: 'automatico',
  };

  const rpmNaMarcha = (v, m) => (Math.abs(v) / (2 * Math.PI * raioRoda)) * 60 * carro.marchas[m] * diferencial;
  const torque = (rpm) => {
    const t = clamp(rpm / carro.rpmMax, 0, 1);
    return 0.72 + 0.4 * Math.sin(Math.PI * Math.min(1, t * 1.05)); // curva "barriga" no meio do giro
  };

  function trocar(nova, eventos) {
    if (nova === e.marcha || nova < 0 || nova >= carro.marchas.length) return;
    eventos.push({ tipo: 'troca', subiu: nova > e.marcha, de: e.marcha, para: nova });
    e.marcha = nova;
    e.trocando = TEMPO_TROCA;
  }

  /**
   * Avança a simulação. `entrada`: { acelerar 0–1, frear 0–1, direcao −1..1 (+ = direita),
   * freioDeMao bool, subir bool, descer bool }. `pista`: { curvatura, inclinacao, aderencia }.
   * Devolve a lista de eventos do passo (trocas de marcha, batidas).
   */
  function passo(dt, entrada, pista) {
    const eventos = [];
    const aderencia = (pista.aderencia ?? 1) * (0.82 + 0.42 * carro.estabilidade);
    e.foraDaPista = Math.abs(e.x) > MEIA_LARGURA - 0.3;

    /* ---------- Direção ---------- */
    const velAbs = Math.abs(e.v);
    // Esterço máximo cai com a velocidade: no fim do curso pede ~20% além da aderência
    // (o pneu canta só quando se exige demais, não a cada toque)
    const estercoMax = Math.min(0.6, Math.atan((G * aderencia * 1.2 * ENTRE_EIXOS) / Math.max(velAbs * velAbs, 1)));
    const alvo = entrada.direcao * estercoMax;
    const rapidez = entrada.direcao === 0 ? 5 : 3.2;
    e.esterco += (alvo - e.esterco) * Math.min(1, dt * rapidez);

    // Taxa de giro pelo modelo de bicicleta, limitada pela aderência
    let giro = (e.v * Math.tan(e.esterco)) / ENTRE_EIXOS; // + = direita
    const lateralMax = G * aderencia * (e.foraDaPista ? 0.75 : 1) * (entrada.freioDeMao ? 0.55 : 1);
    const lateral = Math.abs(giro * e.v);
    e.derrapagem = 0;
    if (lateral > lateralMax && velAbs > 3) {
      e.derrapagem = clamp((lateral - lateralMax) / (lateralMax * 0.4), 0, 1);
      giro *= lateralMax / lateral;
    }
    if (entrada.freioDeMao && velAbs > 8) {
      giro *= 1.35;
      e.derrapagem = Math.max(e.derrapagem, 0.6);
    }
    e.aceleracaoLateral = giro * e.v;

    // A estrada faz curva por baixo do carro; o carro gira por conta própria
    e.angulo += (-giro + pista.curvatura * e.v * Math.cos(e.angulo)) * dt;
    // Ajuda arcade: sem mexer na direção, o carro se alinha com a estrada aos poucos
    if (Math.abs(entrada.direcao) < 0.05 && velAbs > 2) e.angulo *= Math.exp(-dt * 1.4);
    e.angulo = clamp(e.angulo, -0.9, 0.9);

    /* ---------- Câmbio ---------- */
    e.trocando = Math.max(0, e.trocando - dt);
    if (e.v < -0.3) {
      e.marcha = -1;
    } else if (e.marcha === -1 && e.v >= -0.3) {
      e.marcha = 0;
    }
    if (e.marcha >= 0) {
      if (e.cambio === 'automatico') {
        const rpmAtual = rpmNaMarcha(e.v, e.marcha);
        if (rpmAtual > carro.rpmMax * 0.92 && entrada.acelerar > 0.1 && !e.trocando) trocar(e.marcha + 1, eventos);
        else if (e.marcha > 0 && rpmNaMarcha(e.v, e.marcha - 1) < carro.rpmMax * (entrada.acelerar > 0.5 ? 0.8 : 0.55) && rpmAtual < carro.rpmMax * 0.5 && !e.trocando) trocar(e.marcha - 1, eventos);
      } else {
        if (entrada.subir) trocar(e.marcha + 1, eventos);
        if (entrada.descer && rpmNaMarcha(e.v, Math.max(0, e.marcha - 1)) < carro.rpmMax * 1.02) trocar(e.marcha - 1, eventos);
      }
    }

    /* ---------- Giro do motor ---------- */
    const marchaEf = Math.max(0, e.marcha);
    const rpmRodas = rpmNaMarcha(e.v, marchaEf);
    // Embreagem patinando na saída: o giro sobe com o acelerador
    // (só em 1ª e ré; até as rodas alcançarem esse giro)
    const rpmEmbreagem = e.marcha <= 0 ? carro.rpmLenta + entrada.acelerar * 2600 : 0;
    const rpmAlvo = clamp(Math.max(rpmRodas, rpmEmbreagem, carro.rpmLenta), carro.rpmLenta, carro.rpmMax * 1.01);
    e.rpm += (rpmAlvo - e.rpm) * Math.min(1, dt * (e.trocando ? 10 : 14));
    e.limitador = e.rpm >= carro.rpmMax * 0.995 && entrada.acelerar > 0.5;

    /* ---------- Aceleração e freio ---------- */
    let a = 0;
    const acelerador = e.trocando ? 0 : entrada.acelerar;
    if (e.v >= -0.3 && acelerador > 0) {
      a += aceleracaoMax * acelerador * torque(e.rpm) * (1 - (e.v / vmax) ** 2.4) * (e.limitador ? 0.1 : 1);
    }
    if (entrada.frear > 0) {
      if (e.v > 0.5) a -= 13 * entrada.frear * (e.foraDaPista ? 0.8 : 1);
      else if (e.v > -9) a -= 4.5 * entrada.frear; // ré
    }
    if (e.v < -0.3 && entrada.acelerar > 0) a += 13 * entrada.acelerar; // acelerar em ré = frear
    if (entrada.freioDeMao) a -= Math.sign(e.v) * 6;
    // Resistências: rolamento, ar, rampa e grama/acostamento
    a -= Math.sign(e.v) * (0.22 + 0.00042 * e.v * e.v);
    a -= G * Math.sin(pista.inclinacao) * 0.7;
    if (e.foraDaPista) a -= Math.sign(e.v) * (0.9 + 0.004 * e.v * e.v);
    a -= Math.sign(e.v) * e.derrapagem * 2.5;

    const vAntes = e.v;
    e.v += a * dt;
    // Freando até parar, o carro para (não sai de ré sozinho)
    if (vAntes * e.v < 0 && !(entrada.frear > 0 && vAntes <= 0.5)) e.v = 0;
    if (Math.abs(e.v) < 0.05 && !entrada.acelerar && !entrada.frear) e.v = 0;
    e.aceleracaoLongitudinal = a;

    /* ---------- Movimento na estrada ---------- */
    const fatorCurva = clamp(1 - pista.curvatura * e.x, 0.6, 1.4);
    e.s += (e.v * Math.cos(e.angulo) * dt) / fatorCurva;
    e.x += -e.v * Math.sin(e.angulo) * dt;
    e.giroRodas += (e.v / raioRoda) * dt;

    // Mureta (balizadores): rebate e perde velocidade
    if (Math.abs(e.x) > LIMITE_LATERAL) {
      const lado = Math.sign(e.x);
      e.x = lado * LIMITE_LATERAL;
      const velocidadeContra = Math.abs(e.v * Math.sin(e.angulo));
      e.angulo *= -0.25;
      // empurra o nariz de volta para a pista
      e.angulo += lado * 0.04;
      const perda = clamp(velocidadeContra / 25, 0.03, 0.5);
      e.v *= 1 - perda;
      if (velocidadeContra > 1.5) eventos.push({ tipo: 'batida', forca: clamp(velocidadeContra / 15, 0.1, 1), lado });
    }
    return eventos;
  }

  return {
    estado: e,
    passo,
    definirCambio(tipo) { e.cambio = tipo; },
    get kmh() { return e.v * 3.6; },
    get marchaTexto() {
      if (e.marcha === -1) return 'R';
      if (Math.abs(e.v) < 0.5 && e.marcha === 0) return 'N';
      return String(e.marcha + 1);
    },
    /** Volta à faixa da direita, parado, no mesmo ponto da estrada. */
    reiniciar() {
      Object.assign(e, { x: 5.4, v: 0, angulo: 0, esterco: 0, marcha: 0, rpm: carro.rpmLenta, trocando: 0 });
    },
  };
}
