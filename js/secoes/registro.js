/**
 * Menu central do Ronco. Cada seção é um módulo independente em js/secoes/<id>/
 * que exporta `montar(raiz, contexto)` e devolve `{ destruir() }`.
 * Para criar uma seção nova: crie a pasta, registre aqui e marque `disponivel: true`.
 */

export const SECOES = [
  {
    id: 'dirigir',
    nome: 'Dirigir',
    descricao: 'Estrada infinita em 3D: paisagens, clima, trânsito e desafios.',
    icone: 'volante',
    cor: 'var(--a1)',
    destaque: true,
    disponivel: true,
    carregar: () => import('./dirigir/index.js?v=202610231834'),
  },
  {
    id: 'garagem',
    nome: 'Garagem',
    descricao: 'Escolha o carro, a pintura, as rodas e a suspensão.',
    icone: 'garagem',
    cor: 'var(--a2)',
    disponivel: true,
    carregar: () => import('./garagem/index.js?v=202610231834'),
  },
  {
    id: 'legado',
    nome: 'Legado',
    descricao: 'Uma homenagem a Ayrton Senna: carreira, números e corridas marcantes.',
    icone: 'capacete',
    cor: 'var(--a3)',
    disponivel: false,
    carregar: () => import('./legado/index.js?v=202610231834'),
  },
  {
    id: 'comparador',
    nome: 'Comparador',
    descricao: 'Coloque dois carros lado a lado e compare tudo.',
    icone: 'comparar',
    cor: 'var(--a1)',
    disponivel: false,
    emBreve: true,
  },
  {
    id: 'quiz',
    nome: 'Quiz',
    descricao: 'Quanto você sabe de carros e automobilismo?',
    icone: 'pergunta',
    cor: 'var(--a2)',
    disponivel: false,
    emBreve: true,
  },
  {
    id: 'curiosidades',
    nome: 'Curiosidades',
    descricao: 'Histórias e fatos do mundo dos carros.',
    icone: 'lampada',
    cor: 'var(--a3)',
    disponivel: false,
    emBreve: true,
  },
];

export const obterSecao = (id) => SECOES.find((s) => s.id === id);
