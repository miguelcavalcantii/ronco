/**
 * Peças de interface compartilhadas: avisos, controles de som da barra,
 * selo de nível, preenchimento dos deslizadores e as luzes de largada.
 */
import { icone } from './icones.js?v=202610231912';
import { movimentoReduzido } from './util.js?v=202610231912';

const pilha = document.getElementById('avisos');

/** Aviso curto no topo da tela. */
export function avisar({ titulo, texto = '', icone: nomeIcone = 'estrela', cor = 'var(--destaque)', duracao = 3800 }) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso';
  aviso.style.setProperty('--cor', cor);
  aviso.innerHTML = `<span class="aviso__icone">${icone(nomeIcone)}</span><div><strong class="aviso__titulo"></strong><p class="aviso__texto"></p></div>`;
  aviso.querySelector('.aviso__titulo').textContent = titulo;
  aviso.querySelector('.aviso__texto').textContent = texto;
  pilha.append(aviso);
  while (pilha.children.length > 3) pilha.firstElementChild.remove();
  requestAnimationFrame(() => aviso.classList.add('aviso--visivel'));
  setTimeout(() => {
    aviso.classList.remove('aviso--visivel');
    setTimeout(() => aviso.remove(), 450);
  }, duracao);
}

export function atualizarDeslizador(entrada) {
  const min = Number(entrada.min || 0);
  const max = Number(entrada.max || 100);
  entrada.style.setProperty('--p', `${((Number(entrada.value) - min) / (max - min)) * 100}%`);
}

document.addEventListener('input', (e) => {
  if (e.target.matches?.('input.deslizador')) atualizarDeslizador(e.target);
});

/** Mudo e volume geral da barra (sempre visíveis). */
export function ligarControlesSom(audio) {
  const botao = document.getElementById('botao-mudo');
  const volume = document.getElementById('volume');
  const atualizar = () => {
    botao.innerHTML = icone(audio.mudo ? 'mudo' : 'som');
    botao.setAttribute('aria-pressed', String(audio.mudo));
    botao.setAttribute('aria-label', audio.mudo ? 'Ativar som' : 'Silenciar tudo');
    botao.title = audio.mudo ? 'Ativar som (M)' : 'Silenciar tudo (M)';
    volume.value = String(Math.round(audio.volume * 100));
    atualizarDeslizador(volume);
  };
  botao.addEventListener('click', () => audio.alternarMudo());
  volume.addEventListener('input', () => {
    audio.definirVolume(Number(volume.value) / 100);
    if (audio.mudo && Number(volume.value) > 0) audio.definirMudo(false);
  });
  audio.aoMudar(atualizar);
  atualizar();
}

export function ligarChipNivel(progresso) {
  const chip = document.getElementById('chip-nivel');
  const atualizar = () => {
    const info = progresso.infoNivel();
    chip.querySelector('[data-nv]').textContent = `NV ${info.nivel}`;
    chip.style.setProperty('--p', `${(info.fracao * 100).toFixed(1)}%`);
    chip.title = `${info.titulo} · ${Math.floor(info.xpNoNivel)} de ${info.necessario} XP`;
  };
  progresso.on('xp', atualizar);
  atualizar();
}

/**
 * Luzes de largada: cinco colunas acendem uma por segundo e apagam juntas.
 * Resolve quando apagam (hora de acelerar). `cancelar()` aborta.
 */
export function luzesDeLargada(audio, { intervalo = 0.8 } = {}) {
  const camada = document.createElement('div');
  camada.className = 'largada';
  camada.setAttribute('role', 'status');
  camada.setAttribute('aria-live', 'assertive');
  camada.innerHTML = `
    <div>
      <div class="largada__painel">${'<div class="largada__coluna"><span class="largada__luz"></span><span class="largada__luz"></span></div>'.repeat(5)}</div>
      <p class="largada__texto">VAI!</p>
    </div>`;
  document.body.append(camada);
  const colunas = [...camada.querySelectorAll('.largada__coluna')];
  const timers = [];
  let cancelado = false;
  const passo = movimentoReduzido() ? Math.min(intervalo, 0.4) : intervalo;
  const promessa = new Promise((resolver) => {
    colunas.forEach((coluna, i) => {
      timers.push(setTimeout(() => {
        coluna.querySelectorAll('.largada__luz').forEach((l) => l.classList.add('largada__luz--acesa'));
        audio.tocar('luz', { intervaloMin: 0 });
      }, (i + 1) * passo * 1000));
    });
    // Como na F1: depois da quinta, as luzes apagam após uma pausa curta e imprevisível
    const apagar = (5 * passo + 0.4 + Math.random() * 0.9) * 1000;
    timers.push(setTimeout(() => {
      camada.querySelectorAll('.largada__luz').forEach((l) => l.classList.remove('largada__luz--acesa'));
      camada.querySelector('.largada__texto').classList.add('largada__texto--visivel');
      audio.tocar('largada');
      resolver(true);
      timers.push(setTimeout(() => camada.remove(), 900));
    }, apagar));
  });
  return {
    promessa,
    cancelar() {
      if (cancelado) return;
      cancelado = true;
      timers.forEach(clearTimeout);
      camada.remove();
    },
  };
}
