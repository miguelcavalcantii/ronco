/**
 * Paisagens: cada uma define céu, neblina, cores do chão, tipo de vegetação,
 * relevo e as montanhas do horizonte. O motor 3D só lê estes dados,
 * então uma paisagem nova é só mais uma entrada aqui.
 *
 * `relevo(d, n)`: altura do terreno (m) a `d` metros da beira da pista, onde `n` é
 * o ruído do lugar (−1 a 1). Perto da pista o terreno acompanha a estrada.
 */

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const PAISAGENS = [
  {
    id: 'serra',
    nome: 'Serra Verde',
    descricao: 'Morros verdes, pinheiros e araucárias.',
    ceu: { topo: '#2f7fe0', horizonte: '#cfe6f5', sol: '#fff4d6' },
    neblina: { cor: '#cfe2ee', densidade: 1 },
    luz: { sol: 2.6, ceu: 1.1, corCeu: '#bfe0ff', corChao: '#4a6b2a' },
    asfalto: '#3a3d40',
    acostamento: '#8a8270',
    grama: ['#4f8f2f', '#3f7d27', '#6a9f35', '#5c8a2c'],
    terra: '#6e5a3a',
    rocha: '#7d7f78',
    vegetacao: { tipo: 'pinheiro', densidade: 1, cores: ['#1f5a2a', '#2a6b30', '#245f2c', '#357a35'] },
    tracado: { relevo: 1, sinuosidade: 1 },
    relevo: (d, n) => -0.5 * suave(1, 4, d) * (1 - suave(6, 14, d)) + suave(8, 70, d) * (6 + n * 22) + suave(60, 140, d) * (14 + n * 30),
    montanhas: { cor: '#6f93a8', altura: 260, rugosidade: 1 },
  },
];

export const obterPaisagem = (id) => PAISAGENS.find((p) => p.id === id) ?? PAISAGENS[0];
