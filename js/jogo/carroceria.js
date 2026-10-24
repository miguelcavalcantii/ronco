/**
 * Carroceria modelada por seções (loft), como uma casca de carro de verdade.
 *
 * Cada desenho (desenhos.js) descreve, ao longo do comprimento (t = 0 na traseira,
 * t = 1 na frente): a linha de cima da carroceria, a linha de baixo, a largura e a
 * curva do teto (estufa). A seção transversal é uma "superelipse" (retângulo de
 * cantos redondos), mais estreita em cima (tumblehome). Faróis, lanternas, grades,
 * entradas de ar e escapes são colocados sobre a superfície calculada.
 */
import * as THREE from 'three';

/* ---------- Curvas a partir de pontos de controle ---------- */

/** Interpolação suave (Catmull-Rom) de pontos [t, valor] com t crescente. */
export function curva(pontos) {
  const n = pontos.length;
  return (t) => {
    if (t <= pontos[0][0]) return pontos[0][1];
    if (t >= pontos[n - 1][0]) return pontos[n - 1][1];
    let i = 0;
    while (i < n - 2 && t > pontos[i + 1][0]) i++;
    const [t1, v1] = pontos[i];
    const [t2, v2] = pontos[i + 1];
    const v0 = i > 0 ? pontos[i - 1][1] : v1;
    const v3 = i < n - 2 ? pontos[i + 2][1] : v2;
    const u = (t - t1) / (t2 - t1);
    const u2 = u * u;
    const u3 = u2 * u;
    const valor = 0.5 * (2 * v1 + (-v0 + v2) * u + (2 * v0 - 5 * v1 + 4 * v2 - v3) * u2 + (-v0 + 3 * v1 - 3 * v2 + v3) * u3);
    // Sem passar dos vizinhos (evita "ondas" entre pontos)
    return Math.min(Math.max(valor, Math.min(v1, v2)), Math.max(v1, v2));
  };
}

const sinal = (v) => (v < 0 ? -1 : 1);
/** Ponto da superelipse: ângulo → (sx, sy) em [−1, 1]. */
function superelipse(angulo, n) {
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  return [sinal(c) * Math.abs(c) ** (2 / n), sinal(s) * Math.abs(s) ** (2 / n)];
}

/* ---------- Construtor ---------- */

export function construirCarroceria(d, m) {
  const L = d.comprimento;
  const W = d.largura;
  const zT = -L / 2;
  const topo = curva(d.topo);
  const base = curva(d.base);
  const meia = curva(d.meia);
  const teto = curva(d.estufa.teto);
  const n = d.redondeza ?? 3.2;
  const zDe = (t) => zT + t * L;
  const grupo = new THREE.Group();

  /** Seção da carroceria na posição t: centro, meia altura e meia largura. */
  const secao = (t) => {
    const yb = base(t);
    const yt = topo(t);
    return { yc: (yb + yt) / 2, hh: (yt - yb) / 2, hw: (meia(t) * W) / 2 };
  };
  /** Ponto da casca em t para o ângulo dado. */
  const pontoCasca = (t, angulo, saida) => {
    const { yc, hh, hw } = secao(t);
    const [sx, sy] = superelipse(angulo, n);
    const estreita = 1 - (d.tumblehome ?? 0.07) * Math.max(0, sy);
    saida[0] = sx * hw * estreita;
    saida[1] = yc + sy * hh;
    saida[2] = zDe(t);
    return saida;
  };

  /* ---------- Casca principal ---------- */
  const S = 64;
  const M = 32;
  const ts = Array.from({ length: S + 1 }, (_, i) => 0.5 - 0.5 * Math.cos((Math.PI * i) / S));
  const pos = [];
  const p = [0, 0, 0];
  for (const t of ts) {
    for (let j = 0; j < M; j++) {
      pontoCasca(t, (j / M) * Math.PI * 2, p);
      pos.push(p[0], p[1], p[2]);
    }
  }
  const indices = [];
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const c = a + M;
      const e = b + M;
      indices.push(a, b, c, b, e, c); // normais para fora
    }
  }
  // Tampas (para-choques): leque até o centro
  for (const [i, inverter] of [[0, true], [S, false]]) {
    const { yc } = secao(ts[i]);
    const centro = pos.length / 3;
    pos.push(0, yc, zDe(ts[i]));
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      if (inverter) indices.push(centro, b, a);
      else indices.push(centro, a, b);
    }
  }
  const geoCasca = new THREE.BufferGeometry();
  geoCasca.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geoCasca.setIndex(indices);
  geoCasca.computeVertexNormals();
  grupo.add(new THREE.Mesh(geoCasca, m.pintura));

  /* ---------- Estufa (vidros) com teto pintado ---------- */
  const tA = d.estufa.teto[0][0];
  const tB = d.estufa.teto[d.estufa.teto.length - 1][0];
  const tetoMax = Math.max(...d.estufa.teto.map(([, y]) => y));
  const S2 = 40;
  const M2 = 28;
  const pos2 = [];
  const tsE = [];
  for (let i = 0; i <= S2; i++) {
    const t = tA + ((tB - tA) * i) / S2;
    tsE.push(t);
    const { hw } = secao(t);
    const yb = topo(t) - 0.04;
    const yt = Math.max(yb + 0.01, teto(t));
    const wb = hw * (d.estufa.base ?? 0.86);
    const wt = hw * (d.estufa.topo ?? 0.66);
    for (let j = 0; j < M2; j++) {
      const [sx, sy] = superelipse((j / M2) * Math.PI * 2, 2.4);
      const k = (sy + 1) / 2;
      pos2.push(sx * (wb + (wt - wb) * k), yb + k * (yt - yb), zDe(t));
    }
  }
  const vidros = [];
  const pintados = [];
  for (let i = 0; i < S2; i++) {
    // Teto pintado onde a estufa está perto da altura máxima
    const tMeio = (tsE[i] + tsE[i + 1]) / 2;
    const noTeto = teto(tMeio) > tetoMax - (d.estufa.margemTeto ?? 0.05);
    for (let j = 0; j < M2; j++) {
      const a = i * M2 + j;
      const b = i * M2 + ((j + 1) % M2);
      const c = a + M2;
      const e = b + M2;
      const angulo = ((j + 0.5) / M2) * Math.PI * 2;
      const emCima = Math.sin(angulo) > 0.72;
      (noTeto && emCima ? pintados : vidros).push(a, b, c, b, e, c);
    }
  }
  const geoEstufa = new THREE.BufferGeometry();
  geoEstufa.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3));
  geoEstufa.setIndex([...vidros, ...pintados]);
  geoEstufa.addGroup(0, vidros.length, 0);
  geoEstufa.addGroup(vidros.length, pintados.length, 1);
  geoEstufa.computeVertexNormals();
  const estufa = new THREE.Mesh(geoEstufa, [m.vidro, m.pintura]);
  grupo.add(estufa);

  /* ---------- Localizar a superfície (para colar faróis, grades etc.) ---------- */

  /** z da superfície na frente (lado = 1) ou na traseira (lado = −1) para um ponto (x, y). */
  function superficieZ(x, y, lado) {
    const passos = 120;
    for (let i = 0; i <= passos; i++) {
      const t = lado > 0 ? 1 - i / passos : i / passos;
      const { yc, hh, hw } = secao(t);
      const ny = (y - yc) / hh;
      if (Math.abs(ny) > 1) continue;
      const nx = Math.abs(x) / (hw * (1 - (d.tumblehome ?? 0.07) * Math.max(0, ny)));
      if (nx ** n + Math.abs(ny) ** n <= 1) return zDe(t);
    }
    return zDe(lado > 0 ? 1 : 0);
  }
  /** Inclinação da superfície (para a peça "deitar" junto com ela). */
  function inclinacao(x, y, lado) {
    const z1 = superficieZ(x, y - 0.03, lado);
    const z2 = superficieZ(x, y + 0.03, lado);
    return Math.atan2(z2 - z1, 0.06);
  }
  /** Lateral da carroceria (meia largura) em t e altura y. */
  function lateralX(t, y) {
    const { yc, hh, hw } = secao(t);
    const ny = Math.max(-1, Math.min(1, (y - yc) / hh));
    return hw * (1 - (d.tumblehome ?? 0.07) * Math.max(0, ny)) * (1 - Math.abs(ny) ** n) ** (1 / n);
  }

  /** Cola uma peça na frente/traseira. `forma` é a geometria (plana em xy, de frente para +z). */
  function colar(geo, material, x, y, lado, recuo = 0.004) {
    const malha = new THREE.Mesh(geo, material);
    const z = superficieZ(x, y, lado);
    malha.position.set(x, y, z + lado * recuo);
    // Inclinação limitada: perto do fundo arredondado a superfície fica quase deitada
    malha.rotation.x = Math.max(-0.45, Math.min(0.45, inclinacao(x, y, lado)));
    if (lado < 0) malha.rotation.y = Math.PI;
    grupo.add(malha);
    return malha;
  }

  return { grupo, secao, superficieZ, lateralX, colar, zDe, topo, base, teto, zFrente: L / 2, zTras: -L / 2 };
}

/* ---------- Peças padronizadas ---------- */

export const pecas = {
  retangulo: (l, a, e = 0.03) => new THREE.BoxGeometry(l, a, e),
  redondo: (r, e = 0.04) => {
    const g = new THREE.CylinderGeometry(r, r, e, 20);
    g.rotateX(Math.PI / 2);
    return g;
  },
  hexagono: (l, a, e = 0.03) => {
    const forma = new THREE.Shape();
    const pts = [[-l / 2, a * 0.1], [-l * 0.38, a / 2], [l * 0.38, a / 2], [l / 2, a * 0.1], [l * 0.3, -a / 2], [-l * 0.3, -a / 2]];
    forma.moveTo(...pts[0]);
    pts.slice(1).forEach((p) => forma.lineTo(...p));
    const g = new THREE.ExtrudeGeometry(forma, { depth: e, bevelEnabled: false });
    g.translate(0, 0, -e / 2);
    return g;
  },
  /** Peça em forma de lâmina inclinada (faróis finos e "garras"). */
  lamina: (l, a, angulo, e = 0.03) => {
    const g = new THREE.BoxGeometry(l, a, e);
    g.rotateZ(angulo);
    return g;
  },
};
