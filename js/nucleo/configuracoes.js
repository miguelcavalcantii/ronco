/**
 * Janela de Configurações (engrenagem na barra, em qualquer tela), em abas:
 * Visual (tema e destaque), Som (pacote, volumes e mudo), Gráficos, Direção e Teclas.
 * Tudo é aplicado na hora e salvo pelos módulos de preferências e de áudio.
 */
import { icone } from './icones.js?v=202610231912';
import { TEMAS, DESTAQUES_SUGERIDOS, TECLAS_PADRAO } from './preferencias.js?v=202610231912';
import { CANAIS, PACOTES_SOM } from './audio.js?v=202610231912';
import { atualizarDeslizador } from './ui.js?v=202610231912';

const ABAS = [
  { id: 'visual', nome: 'Visual', icone: 'olho' },
  { id: 'som', nome: 'Som', icone: 'som' },
  { id: 'graficos', nome: 'Gráficos', icone: 'montanha' },
  { id: 'direcao', nome: 'Direção', icone: 'volante' },
  { id: 'teclas', nome: 'Teclas', icone: 'teclado' },
];

const QUALIDADES = [
  { id: 'auto', nome: 'Automático', descricao: 'Ajusta sozinho para manter 60 FPS' },
  { id: 'baixo', nome: 'Baixo', descricao: 'Celulares e PCs simples' },
  { id: 'medio', nome: 'Médio', descricao: 'Equilíbrio' },
  { id: 'alto', nome: 'Alto', descricao: 'Mais cenário e sombras' },
  { id: 'ultra', nome: 'Ultra', descricao: 'Tudo no máximo' },
];

const NOMES_ACOES = {
  acelerar: 'Acelerar', frear: 'Frear / ré', esquerda: 'Virar à esquerda', direita: 'Virar à direita',
  freioDeMao: 'Freio de mão', marchaAcima: 'Subir marcha', marchaAbaixo: 'Descer marcha', camera: 'Trocar câmera',
  buzina: 'Buzina', farol: 'Farol', setaEsquerda: 'Seta esquerda', setaDireita: 'Seta direita', radio: 'Trocar rádio',
  pausar: 'Pausar', esconderPainel: 'Esconder painel', foto: 'Modo foto',
};

/** Nome legível de uma tecla (KeyboardEvent.code). */
export function nomeTecla(codigo) {
  if (codigo.startsWith('Key')) return codigo.slice(3);
  if (codigo.startsWith('Digit')) return codigo.slice(5);
  const nomes = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espaço', Escape: 'Esc', ShiftLeft: 'Shift', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl', Enter: 'Enter', Tab: 'Tab' };
  return nomes[codigo] ?? codigo;
}

export function criarConfiguracoes({ audio, preferencias }) {
  const janela = document.createElement('dialog');
  janela.className = 'config';
  janela.setAttribute('aria-labelledby', 'config-titulo');
  janela.innerHTML = `
    <div class="config__caixa">
      <header class="config__topo carbono">
        <span class="config__selo">${icone('engrenagem')}</span>
        <h2 id="config-titulo">Configurações</h2>
        <button type="button" class="botao-icone" data-fechar aria-label="Fechar configurações">${icone('fechar')}</button>
      </header>
      <nav class="config__abas" role="tablist" aria-label="Seções das configurações">
        ${ABAS.map((a, i) => `<button type="button" role="tab" class="config__aba" data-aba="${a.id}" aria-selected="${i === 0}">${icone(a.icone)}<span>${a.nome}</span></button>`).join('')}
      </nav>
      <div class="config__conteudo">
        <section class="config__painel" data-painel="visual" role="tabpanel">
          <h3>Tema</h3>
          <div class="config__temas">
            ${TEMAS.map((t) => `
              <button type="button" class="tema" data-escolher-tema="${t.id}" style="--f:${t.fundo};--t1:${t.amostra[0]};--t2:${t.amostra[1]};--t3:${t.amostra[2]}">
                <span class="tema__previa" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="tema__nome">${t.nome}</span>
              </button>`).join('')}
          </div>
          <h3>Cor de destaque</h3>
          <div class="config__cores">
            <button type="button" class="chip" data-destaque="">${icone('estrela')}<span>Do tema</span></button>
            ${DESTAQUES_SUGERIDOS.map((c) => `<button type="button" class="amostra" data-destaque="${c}" style="--amostra:${c}" aria-label="Cor ${c}"></button>`).join('')}
            <label class="amostra amostra--livre" title="Qualquer cor"><input type="color" data-cor-livre aria-label="Escolher qualquer cor">+</label>
          </div>
        </section>

        <section class="config__painel" data-painel="som" role="tabpanel" hidden>
          <div class="config__linha">
            <h3>Volumes</h3>
            <button type="button" class="interruptor" data-mudo role="switch"><span class="interruptor__trilho"><span></span></span><span>Silenciar tudo</span></button>
          </div>
          <div class="config__volumes">
            ${[{ id: 'geral', nome: 'Geral', descricao: 'Tudo junto' }, ...CANAIS].map((c) => `
              <label class="volume">
                <span class="volume__nome"><strong>${c.nome}</strong><small>${c.descricao}</small></span>
                <input type="range" class="deslizador" min="0" max="100" data-canal="${c.id}" aria-label="Volume ${c.nome}">
                <output data-valor="${c.id}"></output>
              </label>`).join('')}
          </div>
          <h3>Sons da interface</h3>
          <p class="config__ajuda">Toque num pacote para ouvir.</p>
          <div class="config__opcoes">
            ${PACOTES_SOM.map((p) => `<button type="button" class="opcao" data-pacote="${p.id}"><strong>${p.nome}</strong><small>${p.descricao}</small></button>`).join('')}
          </div>
        </section>

        <section class="config__painel" data-painel="graficos" role="tabpanel" hidden>
          <h3>Qualidade gráfica</h3>
          <div class="config__opcoes">
            ${QUALIDADES.map((q) => `<button type="button" class="opcao" data-pref="qualidade" data-valor="${q.id}"><strong>${q.nome}</strong><small>${q.descricao}</small></button>`).join('')}
          </div>
          <div class="config__linha">
            <h3>Contador de FPS</h3>
            <button type="button" class="interruptor" data-alternar="mostrarFps" role="switch"><span class="interruptor__trilho"><span></span></span><span>Mostrar</span></button>
          </div>
        </section>

        <section class="config__painel" data-painel="direcao" role="tabpanel" hidden>
          <h3>Câmera padrão</h3>
          <div class="config__opcoes">
            ${[['terceira', 'Terceira pessoa'], ['primeira', 'Cockpit'], ['capo', 'Capô'], ['cinema', 'Cinematográfica']].map(([id, nome]) => `<button type="button" class="opcao opcao--curta" data-pref="camera" data-valor="${id}"><strong>${nome}</strong></button>`).join('')}
          </div>
          <h3>Velocidade em</h3>
          <div class="config__opcoes">
            ${[['kmh', 'km/h'], ['mph', 'mph']].map(([id, nome]) => `<button type="button" class="opcao opcao--curta" data-pref="unidade" data-valor="${id}"><strong>${nome}</strong></button>`).join('')}
          </div>
          <h3>Câmbio</h3>
          <div class="config__opcoes">
            ${[['automatico', 'Automático', 'Troca sozinho'], ['manual', 'Manual', 'Q e E trocam a marcha']].map(([id, nome, d]) => `<button type="button" class="opcao" data-pref="cambio" data-valor="${id}"><strong>${nome}</strong><small>${d}</small></button>`).join('')}
          </div>
          <h3>No celular</h3>
          <div class="config__opcoes">
            ${[['botoes', 'Botões na tela', 'Volante e pedais virtuais'], ['inclinar', 'Inclinar', 'Vire o aparelho para esterçar']].map(([id, nome, d]) => `<button type="button" class="opcao" data-pref="controleCelular" data-valor="${id}"><strong>${nome}</strong><small>${d}</small></button>`).join('')}
          </div>
        </section>

        <section class="config__painel" data-painel="teclas" role="tabpanel" hidden>
          <div class="config__linha">
            <h3>Teclas</h3>
            <button type="button" class="chip" data-restaurar-teclas>${icone('recarregar')}<span>Padrão</span></button>
          </div>
          <p class="config__ajuda">Clique numa tecla e aperte a nova. Controle de videogame funciona sem configurar.</p>
          <ul class="teclas" data-lista-teclas></ul>
        </section>
      </div>
    </div>`;
  document.body.append(janela);

  const $$ = (s) => janela.querySelectorAll(s);
  const corLivre = janela.querySelector('[data-cor-livre]');
  let gravandoTecla = null;

  function atualizar() {
    $$('[data-escolher-tema]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.escolherTema === preferencias.get('tema'))));
    const destaque = preferencias.get('destaque') ?? '';
    $$('[data-destaque]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.destaque === destaque)));
    corLivre.value = destaque || '#ffd60a';
    $$('[data-pacote]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pacote === audio.pacote)));
    $$('[data-canal]').forEach((entrada) => {
      const canal = entrada.dataset.canal;
      entrada.value = String(Math.round((canal === 'geral' ? audio.volume : audio.volumeCanal(canal)) * 100));
      atualizarDeslizador(entrada);
      janela.querySelector(`[data-valor="${canal}"]`).textContent = `${entrada.value}%`;
    });
    janela.querySelector('[data-mudo]').setAttribute('aria-checked', String(audio.mudo));
    $$('[data-pref]').forEach((b) => b.setAttribute('aria-pressed', String(preferencias.get(b.dataset.pref) === b.dataset.valor)));
    $$('[data-alternar]').forEach((b) => b.setAttribute('aria-checked', String(Boolean(preferencias.get(b.dataset.alternar)))));
    const teclas = preferencias.get('teclas');
    janela.querySelector('[data-lista-teclas]').innerHTML = Object.keys(TECLAS_PADRAO).map((acao) => `
      <li class="tecla-linha">
        <span>${NOMES_ACOES[acao]}</span>
        <button type="button" class="tecla-botao ${gravandoTecla === acao ? 'tecla-botao--gravando' : ''}" data-tecla="${acao}">
          ${gravandoTecla === acao ? 'Aperte uma tecla…' : teclas[acao].map((c) => `<kbd>${nomeTecla(c)}</kbd>`).join(' ')}
        </button>
      </li>`).join('');
  }

  janela.addEventListener('click', (e) => {
    if (e.target === janela) return fechar();
    const aba = e.target.closest('[data-aba]');
    if (aba) {
      $$('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b === aba)));
      $$('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== aba.dataset.aba; });
      audio.tocar('alternar');
      return undefined;
    }
    const tema = e.target.closest('[data-escolher-tema]');
    if (tema) return preferencias.definir('tema', tema.dataset.escolherTema);
    const destaque = e.target.closest('[data-destaque]');
    if (destaque) return preferencias.definir('destaque', destaque.dataset.destaque || null);
    const pacote = e.target.closest('[data-pacote]');
    if (pacote) {
      audio.definirPacote(pacote.dataset.pacote);
      setTimeout(() => audio.tocar('abrir'), 120);
      setTimeout(() => audio.tocar('conquista'), 500);
      return undefined;
    }
    if (e.target.closest('[data-mudo]')) return audio.alternarMudo();
    const pref = e.target.closest('[data-pref]');
    if (pref) return preferencias.definir(pref.dataset.pref, pref.dataset.valor);
    const alternar = e.target.closest('[data-alternar]');
    if (alternar) return preferencias.definir(alternar.dataset.alternar, !preferencias.get(alternar.dataset.alternar));
    const tecla = e.target.closest('[data-tecla]');
    if (tecla) {
      gravandoTecla = gravandoTecla === tecla.dataset.tecla ? null : tecla.dataset.tecla;
      atualizar();
      return undefined;
    }
    if (e.target.closest('[data-restaurar-teclas]')) {
      gravandoTecla = null;
      preferencias.restaurarTeclas();
      return undefined;
    }
    if (e.target.closest('[data-fechar]')) fechar();
    return undefined;
  });

  // Gravando uma tecla nova: a primeira tecla apertada substitui a principal
  janela.addEventListener('keydown', (e) => {
    if (!gravandoTecla) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') {
      gravandoTecla = null;
      atualizar();
      return;
    }
    const atuais = preferencias.get('teclas')[gravandoTecla];
    preferencias.definirTecla(gravandoTecla, [e.code, ...atuais.slice(1).filter((c) => c !== e.code)]);
    audio.tocar('alternar');
    gravandoTecla = null;
  });

  corLivre.addEventListener('input', () => preferencias.definir('destaque', corLivre.value));
  janela.addEventListener('input', (e) => {
    const entrada = e.target.closest('[data-canal]');
    if (!entrada) return;
    const v = Number(entrada.value) / 100;
    if (entrada.dataset.canal === 'geral') audio.definirVolume(v);
    else audio.definirVolumeCanal(entrada.dataset.canal, v);
    if (audio.mudo && v > 0) audio.definirMudo(false);
  });
  janela.addEventListener('change', (e) => {
    const canal = e.target.closest('[data-canal]')?.dataset.canal;
    if (canal === 'motor') audio.tocar('partida');
    else if (canal === 'efeitos') audio.tocar('buzina', { duracao: 0.25 });
    else if (canal) audio.tocar('clique');
  });

  preferencias.on('mudou', atualizar);
  audio.aoMudar(atualizar);

  let gatilho = null;
  function abrir() {
    if (janela.open) return;
    gatilho = document.activeElement;
    atualizar();
    janela.showModal();
    audio.tocar('abrir');
  }
  function fechar() {
    if (!janela.open || janela.classList.contains('config--saindo')) return;
    gravandoTecla = null;
    janela.classList.add('config--saindo');
    audio.tocar('fechar');
    setTimeout(() => {
      janela.close();
      janela.classList.remove('config--saindo');
      gatilho?.focus?.({ preventScroll: true });
    }, 200);
  }
  janela.addEventListener('cancel', (e) => {
    e.preventDefault();
    if (gravandoTecla) return;
    fechar();
  });

  return { abrir, fechar, get aberta() { return janela.open; } };
}
