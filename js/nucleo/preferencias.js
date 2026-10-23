/**
 * Preferências do piloto: tema, cor de destaque, gráficos, câmera, unidades, câmbio,
 * teclas e opções de tela. Ficam no localStorage; o tema salvo já é aplicado por um
 * script no <head> antes da primeira pintura. Emite 'mudou' com a chave alterada.
 */
import { ler, gravar } from './armazenamento.js?v=202610231834';
import { Emissor, movimentoReduzido } from './util.js?v=202610231834';

const CHAVE = 'preferencias';

export const TEMAS = [
  { id: 'brasil', nome: 'Brasil', fundo: '#04130b', amostra: ['#ffd60a', '#00b84a', '#1e5bff'] },
  { id: 'noturna', nome: 'Pista Noturna', fundo: '#04050d', amostra: ['#22e4ff', '#ff2e97', '#ffb020'] },
  { id: 'anos80', nome: 'Clássico Anos 80', fundo: '#170827', amostra: ['#ff6ec7', '#ffd166', '#00e5ff'] },
  { id: 'carbono', nome: 'Carbono', fundo: '#0a0b0d', amostra: ['#e10600', '#f2f2f2', '#8a9099'] },
  { id: 'rua', nome: 'Corrida de Rua', fundo: '#0b0b10', amostra: ['#a3ff12', '#ff7a18', '#8b5cff'] },
];

export const DESTAQUES_SUGERIDOS = ['#ffd60a', '#00d45a', '#1e6bff', '#e10600', '#ff7a18', '#22e4ff', '#ff2e97', '#a3ff12'];

/** Teclas padrão. Cada ação aceita várias teclas (valores de KeyboardEvent.code). */
export const TECLAS_PADRAO = {
  acelerar: ['KeyW', 'ArrowUp'],
  frear: ['KeyS', 'ArrowDown'],
  esquerda: ['KeyA', 'ArrowLeft'],
  direita: ['KeyD', 'ArrowRight'],
  freioDeMao: ['Space'],
  marchaAcima: ['KeyE'],
  marchaAbaixo: ['KeyQ'],
  camera: ['KeyC'],
  buzina: ['KeyH'],
  farol: ['KeyL'],
  setaEsquerda: ['KeyZ'],
  setaDireita: ['KeyX'],
  radio: ['KeyR'],
  pausar: ['KeyP', 'Escape'],
  esconderPainel: ['KeyI'],
  foto: ['KeyF'],
};

const PADRAO = {
  tema: 'brasil',
  destaque: null,
  qualidade: 'auto', // baixo | medio | alto | ultra | auto
  camera: 'terceira', // terceira | primeira | capo | cinema
  unidade: 'kmh', // kmh | mph
  cambio: 'automatico', // automatico | manual
  mostrarFps: false,
  controleCelular: 'botoes', // botoes | inclinar
  teclas: TECLAS_PADRAO,
  introVista: false,
};

/** Texto legível sobre uma cor qualquer. */
export function textoSobre(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  return l > 0.28 ? '#0b0d0a' : '#ffffff';
}

class Preferencias extends Emissor {
  #p;

  constructor() {
    super();
    const salvo = ler(CHAVE, {});
    this.#p = { ...PADRAO, ...(salvo && typeof salvo === 'object' ? salvo : {}) };
    this.#p.teclas = { ...TECLAS_PADRAO, ...(this.#p.teclas ?? {}) };
    if (!TEMAS.some((t) => t.id === this.#p.tema)) this.#p.tema = 'brasil';
    this.#aplicarTema();
  }

  get(chave) {
    return this.#p[chave];
  }

  definir(chave, valor) {
    if (this.#p[chave] === valor) return;
    this.#p[chave] = valor;
    gravar(CHAVE, this.#p);
    if (chave === 'tema' || chave === 'destaque') {
      if (document.startViewTransition && !movimentoReduzido() && chave === 'tema') document.startViewTransition(() => this.#aplicarTema());
      else this.#aplicarTema();
    }
    this.emit('mudou', { chave, valor });
  }

  definirTecla(acao, codigos) {
    this.definir('teclas', { ...this.#p.teclas, [acao]: codigos });
  }

  restaurarTeclas() {
    this.definir('teclas', { ...TECLAS_PADRAO });
  }

  #aplicarTema() {
    const html = document.documentElement;
    const tema = TEMAS.find((t) => t.id === this.#p.tema);
    html.dataset.tema = tema.id;
    if (this.#p.destaque) {
      html.style.setProperty('--destaque', this.#p.destaque);
      html.style.setProperty('--destaque-texto', textoSobre(this.#p.destaque));
    } else {
      html.style.removeProperty('--destaque');
      html.style.removeProperty('--destaque-texto');
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema.fundo);
  }
}

export const preferencias = new Preferencias();
