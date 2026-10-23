/**
 * Ruído suave (value noise) com semente, em 1D e 2D, e a soma de oitavas (fbm).
 * Usado para relevo, curvas da estrada e posição de árvores.
 */
import { geradorComSemente } from '../nucleo/util.js?v=202610231834';

export function criarRuido(semente = 1) {
  const aleatorio = geradorComSemente(semente);
  const TAM = 512;
  const valores = new Float32Array(TAM);
  for (let i = 0; i < TAM; i++) valores[i] = aleatorio() * 2 - 1;
  const perm = new Uint16Array(TAM * 2);
  const base = Array.from({ length: TAM }, (_, i) => i);
  for (let i = TAM - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < TAM * 2; i++) perm[i] = base[i % TAM];

  const suavizar = (t) => t * t * (3 - 2 * t);
  const m = TAM - 1;

  function r1(x) {
    const i = Math.floor(x);
    const f = suavizar(x - i);
    const a = valores[perm[i & m]];
    const b = valores[perm[(i + 1) & m]];
    return a + (b - a) * f;
  }

  function r2(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = suavizar(x - ix);
    const fy = suavizar(y - iy);
    const v = (cx, cy) => valores[perm[(perm[cx & m] + cy) & m]];
    const a = v(ix, iy);
    const b = v(ix + 1, iy);
    const c = v(ix, iy + 1);
    const d = v(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  /** Soma de oitavas em 2D: resultado aproximadamente entre -1 e 1. */
  function fbm2(x, y, oitavas = 4) {
    let soma = 0;
    let amp = 0.5;
    let freq = 1;
    let total = 0;
    for (let o = 0; o < oitavas; o++) {
      soma += r2(x * freq, y * freq) * amp;
      total += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return soma / total;
  }

  return { r1, r2, fbm2, aleatorio };
}
