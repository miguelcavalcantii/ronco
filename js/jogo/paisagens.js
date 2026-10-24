/**
 * Paisagens: cada uma define céu, neblina, luz, cores do chão, vegetação,
 * relevo e as montanhas do horizonte. O motor 3D só lê estes dados,
 * então uma paisagem nova é só mais uma entrada aqui.
 *
 * `relevo(d, n, lado)`: altura do terreno (m, relativa à pista) a `d` metros da
 * beira, onde `n` é o ruído do lugar (−1 a 1) e `lado` é −1 (esquerda) ou 1 (direita).
 * `marcacao`: pintura do asfalto ('estrada', 'avenida' ou 'pista').
 * `aderencia`: multiplica a aderência dos pneus (neve escorrega).
 */

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Valeta rasa ao lado do acostamento (comum a quase todas)
const valeta = (d) => -0.5 * suave(1, 4, d) * (1 - suave(6, 14, d));

export const PAISAGENS = [
  {
    id: 'serra',
    nome: 'Serra Verde',
    descricao: 'Morros verdes e pinheirais.',
    icone: 'montanha',
    ceu: { topo: '#2f7fe0', horizonte: '#cfe6f5', sol: '#fff4d6' },
    neblina: { cor: '#cfe2ee' },
    luz: { sol: 2.6, ceu: 1.1, corCeu: '#bfe0ff', corChao: '#4a6b2a' },
    asfalto: '#3a3d40', acostamento: '#8a8270', marcacao: 'estrada',
    grama: ['#4f8f2f', '#3f7d27', '#6a9f35', '#5c8a2c'], terra: '#6e5a3a', rocha: '#7d7f78',
    vegetacao: { tipo: 'pinheiro', densidade: 1, cores: ['#1f5a2a', '#2a6b30', '#245f2c', '#357a35'] },
    tracado: { relevo: 1, sinuosidade: 1 },
    relevo: (d, n) => valeta(d) + suave(8, 70, d) * (6 + n * 22) + suave(60, 140, d) * (14 + n * 30),
    montanhas: { cor: '#6f93a8', altura: 260, rugosidade: 1 },
  },
  {
    id: 'litoral',
    nome: 'Litoral',
    descricao: 'Estrada beira-mar: praia de um lado, encosta do outro.',
    icone: 'sol',
    ceu: { topo: '#1f86e8', horizonte: '#d6f0fb', sol: '#fff3d0' },
    neblina: { cor: '#d3ecf6' },
    luz: { sol: 2.8, ceu: 1.15, corCeu: '#c4ecff', corChao: '#c9b98a' },
    asfalto: '#36393c', acostamento: '#b9ab86', marcacao: 'estrada',
    grama: ['#6f9f42', '#7fae4a', '#5f8f3a'], terra: '#b59b6a', rocha: '#8a8174', areia: '#e8d6a2',
    vegetacao: { tipo: 'palmeira', densidade: 0.45, cores: ['#3f8f3a', '#4c9a3f', '#358032'] },
    agua: { cor: '#1f86b8', nivel: -10, lado: -1 },
    tracado: { relevo: 0.12, sinuosidade: 0.9 },
    // Esquerda desce até o mar; direita sobe numa encosta
    relevo: (d, n, lado) => (lado < 0
      ? valeta(d) - suave(4, 40, d) * 15 - suave(40, 120, d) * 6
      : valeta(d) + suave(8, 60, d) * (10 + n * 26) + suave(60, 140, d) * (20 + n * 30)),
    montanhas: { cor: '#7ea6b8', altura: 200, rugosidade: 1 },
  },
  {
    id: 'montanha',
    nome: 'Montanhas',
    descricao: 'Estrada de serra com paredões, vales e picos nevados.',
    icone: 'montanha',
    ceu: { topo: '#2a6fd0', horizonte: '#dbe8f2', sol: '#ffffff' },
    neblina: { cor: '#d5e2ec' },
    luz: { sol: 2.5, ceu: 1.0, corCeu: '#c8dcff', corChao: '#56604a' },
    asfalto: '#3b3e42', acostamento: '#7c7a72', marcacao: 'estrada',
    grama: ['#5d7d3a', '#6b8a45', '#76835e'], terra: '#5e5244', rocha: '#808586',
    vegetacao: { tipo: 'pinheiro', densidade: 0.55, cores: ['#1d4d2b', '#25582f', '#2e6234'] },
    tracado: { relevo: 2.2, sinuosidade: 1.35 },
    // Paredão de um lado, precipício do outro (o lado muda com o ruído)
    relevo: (d, n, lado) => (lado > 0
      ? valeta(d) + suave(5, 40, d) * (14 + n * 30) + suave(40, 140, d) * (50 + n * 90)
      : valeta(d) - suave(8, 60, d) * (18 + n * 20) + suave(80, 150, d) * (30 + n * 60)),
    montanhas: { cor: '#7d8ea3', altura: 560, rugosidade: 1.3, neve: true },
  },
  {
    id: 'floresta',
    nome: 'Floresta',
    descricao: 'Mata fechada dos dois lados, luz filtrada.',
    icone: 'estrada',
    ceu: { topo: '#3d84d6', horizonte: '#cfe3d8', sol: '#fff1cf' },
    neblina: { cor: '#b8d0c2' },
    luz: { sol: 2.2, ceu: 1.0, corCeu: '#bfe6cc', corChao: '#2e4a22' },
    asfalto: '#383b3e', acostamento: '#6d6650', marcacao: 'estrada',
    grama: ['#2f6b2a', '#3a7a2e', '#2a5f26', '#44812f'], terra: '#4f3f2a', rocha: '#6b6f66',
    vegetacao: { tipo: 'redonda', densidade: 2.1, escala: 1.35, cores: ['#1f5520', '#2a6628', '#245d24', '#317030', '#1b4a1d'] },
    tracado: { relevo: 0.7, sinuosidade: 1.15 },
    relevo: (d, n) => valeta(d) + suave(10, 70, d) * (4 + n * 12) + suave(60, 140, d) * (8 + n * 16),
    montanhas: { cor: '#4f7a62', altura: 180, rugosidade: 0.9 },
  },
  {
    id: 'canion',
    nome: 'Cânion do Deserto',
    descricao: 'Paredões de pedra vermelha, cactos e sol forte.',
    icone: 'sol',
    ceu: { topo: '#2f6fd4', horizonte: '#f6d2a8', sol: '#fff0c8' },
    neblina: { cor: '#ecc9a2' },
    luz: { sol: 3.0, ceu: 0.9, corCeu: '#ffd9b0', corChao: '#9a5232' },
    asfalto: '#45403b', acostamento: '#b98b62', marcacao: 'estrada',
    grama: ['#c4703a', '#b35f2e', '#d0824a', '#a8572c'], terra: '#9c5a32', rocha: '#a0482a',
    vegetacao: { tipo: 'cacto', densidade: 0.28, cores: ['#4f7a3a', '#5b8a44', '#466e34'] },
    tracado: { relevo: 0.6, sinuosidade: 1.0 },
    relevo: (d, n) => valeta(d) + suave(6, 30, d) * (3 + n * 8) + suave(22, 60, d) * (35 + n * 45) + suave(80, 150, d) * (10 + n * 20),
    montanhas: { cor: '#c07a52', altura: 320, rugosidade: 1.6 },
  },
  {
    id: 'cidade',
    nome: 'Cidade Neon',
    descricao: 'Avenida à noite entre prédios iluminados.',
    icone: 'lua',
    ceu: { topo: '#07041a', horizonte: '#40175c', sol: '#ff5fd8' },
    neblina: { cor: '#2a0f3a' },
    luz: { sol: 0.35, ceu: 0.55, corCeu: '#7a5bff', corChao: '#1a0b2a' },
    asfalto: '#24262c', acostamento: '#3c3c46', marcacao: 'avenida',
    grama: ['#2c2c35', '#26262e', '#32323c'], terra: '#3a3a44', rocha: '#3a3a44',
    vegetacao: { tipo: 'predio', densidade: 0.55, dMin: 14, dMax: 70, cores: ['#5a5f7a', '#4a4f6a', '#6a6f8a', '#3e4258'] },
    postes: { cor: '#ff3fd4', distancia: 30 },
    tracado: { relevo: 0.08, sinuosidade: 0.55 },
    relevo: () => 0,
    montanhas: { cor: '#160c26', altura: 220, rugosidade: 2.6 },
    noite: true,
  },
  {
    id: 'campo',
    nome: 'Campo',
    descricao: 'Planície de fazendas, árvores soltas e céu aberto.',
    icone: 'sol',
    ceu: { topo: '#3d8fe8', horizonte: '#e2f0f7', sol: '#fff6dc' },
    neblina: { cor: '#dceaf0' },
    luz: { sol: 2.7, ceu: 1.1, corCeu: '#cfe8ff', corChao: '#7a8a3a' },
    asfalto: '#3c3f42', acostamento: '#9a8c6a', marcacao: 'estrada',
    grama: ['#86b043', '#9cbb4c', '#b3c25a', '#76a03c', '#c4b866'], terra: '#7b6440', rocha: '#8c8a7a',
    vegetacao: { tipo: 'redonda', densidade: 0.3, cores: ['#3e7a2c', '#4a8a32', '#356b28'] },
    tracado: { relevo: 0.35, sinuosidade: 0.7 },
    relevo: (d, n) => valeta(d) + suave(10, 80, d) * (1.5 + n * 4) + suave(60, 150, d) * (3 + n * 8),
    montanhas: { cor: '#90acbc', altura: 110, rugosidade: 0.8 },
  },
  {
    id: 'neve',
    nome: 'Neve',
    descricao: 'Tudo branco, pinheiros carregados e pista escorregadia.',
    icone: 'neve',
    ceu: { topo: '#7fa6d0', horizonte: '#eef3f8', sol: '#ffffff' },
    neblina: { cor: '#e4ebf2' },
    luz: { sol: 1.9, ceu: 1.25, corCeu: '#e6f0ff', corChao: '#c8d2dc' },
    asfalto: '#3d4247', acostamento: '#cfd6dc', marcacao: 'estrada',
    grama: ['#eef2f6', '#e3e9ef', '#f6f8fa', '#dbe2ea'], terra: '#aab3bc', rocha: '#7c858e',
    vegetacao: { tipo: 'pinheiro', densidade: 0.8, cores: ['#a9c2b8', '#b9cec6', '#9ab6ab'] },
    tracado: { relevo: 0.9, sinuosidade: 1.0 },
    relevo: (d, n) => valeta(d) + suave(8, 70, d) * (6 + n * 20) + suave(60, 140, d) * (16 + n * 34),
    montanhas: { cor: '#c4d0dc', altura: 380, rugosidade: 1.1, neve: true },
    aderencia: 0.72,
  },
  {
    id: 'autodromo',
    nome: 'Autódromo (inspirado em Interlagos)',
    descricao: 'Circuito fechado com o S do Senna, Reta Oposta, Bico de Pato e Subida dos Boxes.',
    icone: 'bandeira',
    ceu: { topo: '#3a86d8', horizonte: '#dde9f0', sol: '#fff4d8' },
    neblina: { cor: '#d6e3ea' },
    luz: { sol: 2.6, ceu: 1.1, corCeu: '#cfe3ff', corChao: '#5a7a3a' },
    asfalto: '#34373a', acostamento: '#5f8f3a', marcacao: 'pista',
    grama: ['#4f9a35', '#5aa63c', '#478f31'], terra: '#5a8a38', rocha: '#7d7f78',
    vegetacao: { tipo: 'redonda', densidade: 0, cores: ['#2f6b2a', '#3a7a2e', '#2a5f26'] },
    circuito: 'interlagos',
    zebras: true,
    tracado: { relevo: 0, sinuosidade: 1 },
    relevo: () => -1.2,
    montanhas: { cor: '#95a3b1', altura: 150, rugosidade: 2.2 },
  },
];

export const obterPaisagem = (id) => PAISAGENS.find((p) => p.id === id) ?? PAISAGENS[0];
