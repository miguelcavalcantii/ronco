/**
 * Ponto de entrada do Ronco: liga o áudio, a barra, o menu, as configurações,
 * a tela de abertura e o roteador por hash (#/ = menu, #/s/<id> = seção).
 */
import { audio } from './nucleo/audio.js?v=202610240909';
import { preferencias } from './nucleo/preferencias.js?v=202610240909';
import { progresso } from './nucleo/progresso.js?v=202610240909';
import { icone } from './nucleo/icones.js?v=202610240909';
import { avisar, ligarControlesSom, ligarChipNivel } from './nucleo/ui.js?v=202610240909';
import { movimentoReduzido } from './nucleo/util.js?v=202610240909';
import { criarConfiguracoes } from './nucleo/configuracoes.js?v=202610240909';
import { criarMenu } from './menu/menu.js?v=202610240909';
import { obterSecao } from './secoes/registro.js?v=202610240909';

const telaMenu = document.getElementById('tela-menu');
const telaSecao = document.getElementById('tela-secao');
const palco = document.getElementById('palco-secao');
const tituloSecao = document.getElementById('titulo-secao');
const cortina = document.getElementById('cortina');
const intro = document.getElementById('intro');

/* ---------- Áudio: destrava no primeiro gesto e dá clique em todo botão ---------- */

for (const evento of ['pointerdown', 'keydown']) {
  window.addEventListener(evento, () => audio.desbloquear(), { once: true, capture: true });
}
document.addEventListener('click', (e) => {
  const alvo = e.target.closest('button, a.chip, .opcao');
  if (alvo && !alvo.matches('[data-secao], [data-partida], [data-intro-ligar], [data-pacote], [data-aba], #botao-mudo')) audio.tocar('clique');
});

/* ---------- Barra, configurações e progresso ---------- */

document.getElementById('botao-config').innerHTML = icone('engrenagem');
ligarControlesSom(audio);
ligarChipNivel(progresso);
const configuracoes = criarConfiguracoes({ audio, preferencias });
document.getElementById('botao-config').addEventListener('click', () => configuracoes.abrir());

progresso.on('conquista', (c) => {
  audio.tocar('conquista');
  avisar({ titulo: `Conquista: ${c.nome}`, texto: c.descricao, icone: c.icone, cor: c.cor });
});
progresso.on('nivel', ({ nivel, titulo }) => {
  audio.tocar('nivel');
  avisar({ titulo: `Nível ${nivel}`, texto: `Agora você é ${titulo}.`, icone: 'trofeu' });
});

/* ---------- Menu ---------- */

const menu = criarMenu({
  progresso,
  audio,
  aoEscolher: (id, origem) => irPara(id, origem),
  aoConfigurar: () => configuracoes.abrir(),
});

/* ---------- Cortina de transição ---------- */

let origemCortina = null;
async function passarCortina(texto, trocar) {
  if (movimentoReduzido()) {
    await trocar();
    return;
  }
  cortina.querySelector('[data-cortina-texto]').textContent = texto;
  const x = origemCortina?.x ?? innerWidth / 2;
  const y = origemCortina?.y ?? innerHeight / 2;
  origemCortina = null;
  const raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  cortina.classList.add('cortina--ativa');
  audio.tocar('abrir');
  await cortina.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
    { duration: 420, easing: 'cubic-bezier(0.7, 0, 0.3, 1)', fill: 'forwards' },
  ).finished;
  await trocar();
  await new Promise((r) => setTimeout(r, 220));
  await cortina.animate(
    { transform: ['translateX(0)', 'translateX(105%) skewX(-12deg)'] },
    { duration: 420, easing: 'cubic-bezier(0.7, 0, 0.3, 1)', fill: 'forwards' },
  ).finished;
  cortina.classList.remove('cortina--ativa');
  cortina.getAnimations().forEach((a) => a.cancel());
}

/* ---------- Roteador ---------- */

let secaoAtual = null; // { id, instancia }
let navegando = Promise.resolve();

function irPara(id, origem) {
  origemCortina = origem ?? null;
  location.hash = `#/s/${id}`;
}

function lerRota() {
  const m = location.hash.match(/^#\/s\/([\w-]+)/);
  return m ? m[1] : null;
}

async function aplicarRota() {
  const id = lerRota();
  if ((secaoAtual?.id ?? null) === id) return;
  const secao = id ? obterSecao(id) : null;

  if (id && (!secao || !secao.disponivel)) {
    avisar({
      titulo: secao ? `${secao.nome}: em construção` : 'Seção não encontrada',
      texto: secao ? 'Essa parte chega numa das próximas etapas.' : 'Voltando para o menu.',
      icone: 'chave',
      cor: 'var(--a1)',
    });
    audio.tocar('erro');
    history.replaceState(null, '', '#/');
    if (secaoAtual) await aplicarRota();
    return;
  }

  await passarCortina(secao ? secao.nome : 'Box', async () => {
    secaoAtual?.instancia?.destruir?.();
    secaoAtual = null;
    palco.replaceChildren();

    if (!secao) {
      document.body.dataset.tela = 'menu';
      telaSecao.hidden = true;
      telaMenu.hidden = false;
      tituloSecao.textContent = '';
      document.title = 'Ronco · gire a chave';
      menu.mostrar();
      return;
    }

    menu.ocultar();
    document.body.dataset.tela = 'secao';
    telaMenu.hidden = true;
    telaSecao.hidden = false;
    tituloSecao.textContent = secao.nome;
    document.title = `${secao.nome} · Ronco`;
    try {
      const modulo = await secao.carregar();
      const instancia = await modulo.montar(palco, { audio, preferencias, progresso, avisar, configuracoes, voltar: () => { location.hash = '#/'; } });
      secaoAtual = { id: secao.id, instancia };
    } catch (erro) {
      console.error(erro);
      secaoAtual = { id: secao.id, instancia: null };
      palco.innerHTML = `<div class="secao__erro">${icone('chave')}<h2>Deu ruim no motor</h2><p>Não foi possível carregar ${secao.nome}. Verifique a conexão e tente de novo.</p><a class="botao" href="#/">Voltar ao menu</a></div>`;
    }
    palco.focus({ preventScroll: true });
  });
}

window.addEventListener('hashchange', () => {
  navegando = navegando.then(aplicarRota, aplicarRota);
});

/* Esc volta ao menu (quando nenhuma janela está aberta e a seção não segurou a tecla) */
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !configuracoes.aberta && document.body.dataset.tela === 'secao' && !secaoAtual?.instancia?.capturaEsc) location.hash = '#/';
  if (e.code === 'KeyM' && !e.repeat && !e.target.closest('input, textarea')) audio.alternarMudo();
});

/* ---------- Tela de abertura: "gire a chave" ---------- */

function abrirIntro() {
  return new Promise((resolver) => {
    intro.hidden = false;
    const ligar = intro.querySelector('[data-intro-ligar]');
    const fechar = (comSom) => {
      if (!comSom) audio.definirMudo(true);
      audio.desbloquear();
      if (comSom) audio.tocar('partida', { canal: 'motor' });
      menu.varrer();
      preferencias.definir('introVista', true);
      progresso.registrar('app:partida');
      intro.classList.add('intro--saindo');
      setTimeout(() => { intro.hidden = true; resolver(); }, movimentoReduzido() ? 0 : 650);
    };
    ligar.addEventListener('click', () => fechar(true), { once: true });
    intro.querySelector('[data-intro-mudo]').addEventListener('click', () => fechar(false), { once: true });
    ligar.focus({ preventScroll: true });
  });
}

/* ---------- Início ---------- */

const rotaInicial = lerRota();
if (!rotaInicial) {
  // Sem gesto o navegador não deixa tocar som: a tela de abertura pede o toque da partida
  await abrirIntro();
} else {
  navegando = aplicarRota();
}
