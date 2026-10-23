/**
 * Controles do jogo: teclado (teclas remapeáveis nas configurações), controle de
 * videogame (Gamepad API, padrão "standard") e celular (botões na tela ou inclinar).
 * `ler()` devolve o estado do quadro: eixos contínuos e ações de "um toque".
 */
import { clamp } from '../nucleo/util.js?v=202610231912';

const ACOES_TOQUE = ['marchaAcima', 'marchaAbaixo', 'camera', 'buzina', 'farol', 'setaEsquerda', 'setaDireita', 'radio', 'pausar', 'esconderPainel', 'foto'];

// Botões do controle no mapeamento "standard"
const BOTOES = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, select: 8, start: 9, cima: 12, baixo: 13, esquerda: 14, direita: 15 };
const ACOES_CONTROLE = { marchaAcima: BOTOES.rb, marchaAbaixo: BOTOES.lb, camera: BOTOES.y, buzina: BOTOES.b, pausar: BOTOES.start, esconderPainel: BOTOES.select, farol: BOTOES.cima, radio: BOTOES.direita };

export function criarEntrada({ preferencias, alvoToque }) {
  const apertadas = new Set();
  const disparos = new Set(); // ações de um toque esperando leitura
  const toque = { acelerar: 0, frear: 0, esquerda: 0, direita: 0, freioDeMao: false, buzina: false };
  const botoesAnteriores = new Map();
  let inclinacao = null; // −1..1 quando o modo inclinar está ativo
  let usouControle = false;

  const teclas = () => preferencias.get('teclas');
  const acaoDaTecla = (codigo) => Object.keys(teclas()).filter((acao) => teclas()[acao].includes(codigo));

  function aoApertar(e) {
    if (e.target.closest?.('input:not([type="range"]), textarea, dialog[open]')) return;
    const acoes = acaoDaTecla(e.code);
    if (!acoes.length) return;
    e.preventDefault();
    // Um deslizador (volume) com foco não pode "roubar" as setas do jogo
    if (e.target.matches?.('input[type="range"]')) e.target.blur();
    if (!e.repeat) for (const acao of acoes) if (ACOES_TOQUE.includes(acao)) disparos.add(acao);
    apertadas.add(e.code);
  }
  function aoSoltar(e) {
    apertadas.delete(e.code);
  }
  function aoPerderFoco() {
    apertadas.clear();
    Object.assign(toque, { acelerar: 0, frear: 0, esquerda: 0, direita: 0, freioDeMao: false, buzina: false });
  }
  window.addEventListener('keydown', aoApertar);
  window.addEventListener('keyup', aoSoltar);
  window.addEventListener('blur', aoPerderFoco);

  const ativa = (acao) => teclas()[acao]?.some((c) => apertadas.has(c)) ?? false;

  /* ---------- Toque: botões na tela (atributo data-controle) ---------- */

  const ponteiros = new Map(); // id do ponteiro → controle
  function aoTocar(e) {
    const botao = e.target.closest('[data-controle]');
    if (!botao) return;
    e.preventDefault();
    botao.setPointerCapture?.(e.pointerId);
    const controle = botao.dataset.controle;
    ponteiros.set(e.pointerId, { controle, botao });
    botao.classList.add('ativo');
    if (controle === 'buzina') toque.buzina = true; // buzina toca enquanto o dedo estiver em cima
    if (ACOES_TOQUE.includes(controle)) disparos.add(controle);
    else if (controle === 'freioDeMao') toque.freioDeMao = true;
    else toque[controle] = 1;
    navigator.vibrate?.(8);
    pedirInclinacao();
  }
  function aoLevantar(e) {
    const p = ponteiros.get(e.pointerId);
    if (!p) return;
    ponteiros.delete(e.pointerId);
    if ([...ponteiros.values()].some((q) => q.controle === p.controle)) return;
    p.botao.classList.remove('ativo');
    if (p.controle === 'freioDeMao' || p.controle === 'buzina') toque[p.controle] = false;
    else if (p.controle in toque) toque[p.controle] = 0;
  }
  alvoToque?.addEventListener('pointerdown', aoTocar);
  alvoToque?.addEventListener('pointerup', aoLevantar);
  alvoToque?.addEventListener('pointercancel', aoLevantar);
  alvoToque?.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- Inclinar o celular ---------- */

  let pediuInclinacao = false;
  function aoOrientar(e) {
    if (e.gamma === null) return;
    // Celular deitado (paisagem): o eixo que vira o "volante" é o beta
    const paisagem = Math.abs(window.orientation ?? screen.orientation?.angle ?? 0) === 90;
    const anguloTela = screen.orientation?.angle ?? window.orientation ?? 0;
    const bruto = paisagem ? e.beta * (anguloTela === 90 ? 1 : -1) : e.gamma;
    inclinacao = clamp(bruto / 28, -1, 1);
  }
  function pedirInclinacao() {
    if (pediuInclinacao || preferencias.get('controleCelular') !== 'inclinar') return;
    pediuInclinacao = true;
    const pedir = window.DeviceOrientationEvent?.requestPermission;
    if (pedir) pedir().then((r) => { if (r === 'granted') window.addEventListener('deviceorientation', aoOrientar); }).catch(() => {});
    else window.addEventListener('deviceorientation', aoOrientar);
  }

  /* ---------- Leitura do quadro ---------- */

  function lerControle() {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const b = (i) => pad.buttons[i] ?? { pressed: false, value: 0 };
      const eixo = pad.axes[0] ?? 0;
      const direcao = Math.abs(eixo) > 0.12 ? Math.sign(eixo) * ((Math.abs(eixo) - 0.12) / 0.88) : 0;
      const resultado = {
        acelerar: b(BOTOES.rt).value,
        frear: b(BOTOES.lt).value,
        direcao: direcao + (b(BOTOES.direita).pressed ? 1 : 0) - (b(BOTOES.esquerda).pressed ? 1 : 0),
        freioDeMao: b(BOTOES.a).pressed || b(BOTOES.x).pressed,
        buzina: b(BOTOES.b).pressed,
      };
      for (const [acao, i] of Object.entries(ACOES_CONTROLE)) {
        const chave = `${pad.index}:${i}`;
        const agora = b(i).pressed;
        if (agora && !botoesAnteriores.get(chave)) disparos.add(acao);
        botoesAnteriores.set(chave, agora);
      }
      if (resultado.acelerar > 0.05 || resultado.frear > 0.05 || Math.abs(resultado.direcao) > 0.05) usouControle = true;
      return resultado;
    }
    return null;
  }

  const estado = { acelerar: 0, frear: 0, direcao: 0, freioDeMao: false, buzina: false, acoes: new Set() };

  return {
    get usouControle() { return usouControle; },
    ler() {
      const pad = lerControle();
      const teclado = {
        acelerar: ativa('acelerar') ? 1 : 0,
        frear: ativa('frear') ? 1 : 0,
        direcao: (ativa('direita') ? 1 : 0) - (ativa('esquerda') ? 1 : 0),
      };
      const direcaoToque = inclinacao !== null && preferencias.get('controleCelular') === 'inclinar' ? inclinacao : toque.direita - toque.esquerda;
      estado.acelerar = clamp(Math.max(teclado.acelerar, toque.acelerar, pad?.acelerar ?? 0), 0, 1);
      estado.frear = clamp(Math.max(teclado.frear, toque.frear, pad?.frear ?? 0), 0, 1);
      estado.direcao = clamp(teclado.direcao + direcaoToque + (pad?.direcao ?? 0), -1, 1);
      estado.freioDeMao = ativa('freioDeMao') || toque.freioDeMao || Boolean(pad?.freioDeMao);
      estado.buzina = ativa('buzina') || toque.buzina || Boolean(pad?.buzina);
      estado.acoes = new Set(disparos);
      disparos.clear();
      return estado;
    },
    /** Esquece teclas apertadas (ao pausar, para o carro não "grudar" acelerando). */
    soltarTudo: aoPerderFoco,
    destruir() {
      window.removeEventListener('keydown', aoApertar);
      window.removeEventListener('keyup', aoSoltar);
      window.removeEventListener('blur', aoPerderFoco);
      window.removeEventListener('deviceorientation', aoOrientar);
    },
  };
}
