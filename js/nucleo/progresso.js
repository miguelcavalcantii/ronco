/**
 * Progresso do piloto: XP, nível, conquistas, recordes, contadores e estatísticas
 * de direção (distância total em metros, velocidade máxima em km/h, tempo dirigindo
 * em segundos). Salvo no localStorage. Emite: 'xp', 'nivel', 'conquista', 'mudou'.
 */
import { ler, gravar } from './armazenamento.js?v=202610240909';
import { Emissor } from './util.js?v=202610240909';
import { CONQUISTAS } from './conquistas.js?v=202610240909';

const CHAVE = 'progresso';

/** Nomes dos níveis, do kart à Fórmula 1. */
export const TITULOS = [
  [20, 'Lenda das pistas'],
  [15, 'Campeão mundial'],
  [10, 'Primeiro piloto'],
  [7, 'Fórmula 1'],
  [5, 'Piloto de testes'],
  [3, 'Fórmula 3'],
  [1, 'Kart'],
];

export const xpDoNivel = (nivel) => 100 + (nivel - 1) * 60;

const estadoInicial = () => ({
  versao: 1,
  xp: 0,
  conquistas: {},
  recordes: {},
  contadores: {},
  distintos: {},
  estatisticas: { distancia: 0, velocidadeMaxima: 0, tempoDirigindo: 0 },
});

class Progresso extends Emissor {
  #e;
  #timer = 0;

  constructor() {
    super();
    const salvo = ler(CHAVE, null);
    const inicial = estadoInicial();
    this.#e = { ...inicial, ...(salvo ?? {}) };
    this.#e.estatisticas = { ...inicial.estatisticas, ...(salvo?.estatisticas ?? {}) };
    addEventListener('pagehide', () => this.salvarAgora());
  }

  infoNivel() {
    let nivel = 1;
    let resto = this.#e.xp;
    while (resto >= xpDoNivel(nivel)) {
      resto -= xpDoNivel(nivel);
      nivel++;
    }
    const necessario = xpDoNivel(nivel);
    const titulo = TITULOS.find(([minimo]) => nivel >= minimo)[1];
    return { nivel, xpNoNivel: resto, necessario, fracao: resto / necessario, titulo };
  }

  ganharXp(quantidade) {
    if (!(quantidade > 0)) return;
    const antes = this.infoNivel().nivel;
    this.#e.xp += quantidade;
    const info = this.infoNivel();
    this.emit('xp', { quantidade, ...info });
    if (info.nivel > antes) this.emit('nivel', info);
    this.#verificar();
    this.#mudou();
  }

  /** Conta um evento; `valor` opcional registra itens distintos (ex.: qual paisagem). */
  registrar(evento, quantidade = 1, valor) {
    this.#e.contadores[evento] = (this.#e.contadores[evento] ?? 0) + quantidade;
    if (valor !== undefined) {
      const lista = (this.#e.distintos[evento] ??= []);
      if (!lista.includes(valor)) lista.push(valor);
    }
    this.#verificar();
    this.#mudou();
  }

  contador(evento) { return this.#e.contadores[evento] ?? 0; }
  distintos(evento) { return this.#e.distintos[evento]?.length ?? 0; }
  recorde(chave) { return this.#e.recordes[chave]; }
  estatistica(chave) { return this.#e.estatisticas[chave] ?? 0; }

  definirRecorde(chave, valor, { menorMelhor = false } = {}) {
    const atual = this.#e.recordes[chave];
    if (atual !== undefined && (menorMelhor ? valor >= atual : valor <= atual)) return false;
    this.#e.recordes[chave] = valor;
    this.#verificar();
    this.#mudou();
    return true;
  }

  /** Soma distância (m) e tempo (s) e atualiza a velocidade máxima (km/h). */
  dirigiu({ metros = 0, segundos = 0, kmh = 0 }) {
    const s = this.#e.estatisticas;
    s.distancia += metros;
    s.tempoDirigindo += segundos;
    if (kmh > s.velocidadeMaxima) s.velocidadeMaxima = kmh;
    this.#verificar();
    this.#mudou();
  }

  conquistaDesbloqueada(id) { return Boolean(this.#e.conquistas[id]); }

  salvarAgora() {
    clearTimeout(this.#timer);
    gravar(CHAVE, this.#e);
  }

  #verificar() {
    const visao = {
      contador: (ev) => this.contador(ev),
      distintos: (ev) => this.distintos(ev),
      recorde: (chave) => this.recorde(chave) ?? 0,
      estatistica: (chave) => this.estatistica(chave),
      nivel: this.infoNivel().nivel,
    };
    for (const c of CONQUISTAS) {
      if (this.#e.conquistas[c.id] || !c.condicao(visao)) continue;
      this.#e.conquistas[c.id] = Date.now();
      this.emit('conquista', c);
      this.ganharXp(c.xp ?? 60);
    }
  }

  #mudou() {
    this.emit('mudou');
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.salvarAgora(), 500);
  }
}

export const progresso = new Progresso();
