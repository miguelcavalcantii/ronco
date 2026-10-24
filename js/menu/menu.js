/**
 * Menu principal em forma de painel de bordo: nome + botão de partida, o painel do
 * piloto (conta-giros com leituras digitais e conquistas) e os módulos do app como
 * teclas de painel com LED. Os módulos vêm do registro central (js/secoes/registro.js).
 */
import { SECOES } from '../secoes/registro.js?v=202610240909';
import { CONQUISTAS } from '../nucleo/conquistas.js?v=202610240909';
import { icone } from '../nucleo/icones.js?v=202610240909';
import { movimentoReduzido } from '../nucleo/util.js?v=202610240909';

const URL_DOPAMINA = 'https://miguelcavalcantii.github.io/dopamina/';
const URL_INSTITUTO = 'https://institutoayrtonsenna.org.br/';
const MARCAS_RPM = 9; // 0 a 8 mil rpm

/** Conta-giros em SVG: arco de 240°, marcações, faixa vermelha e ponteiro. */
function svgContaGiros() {
  const cx = 150;
  const cy = 150;
  const r = 118;
  const inicio = 150; // graus
  const varredura = 240;
  const ponto = (graus, raio) => {
    const a = (graus * Math.PI) / 180;
    return [cx + Math.cos(a) * raio, cy + Math.sin(a) * raio];
  };
  let marcas = '';
  for (let i = 0; i <= (MARCAS_RPM - 1) * 4; i++) {
    const graus = inicio + (varredura * i) / ((MARCAS_RPM - 1) * 4);
    const grande = i % 4 === 0;
    const [x1, y1] = ponto(graus, r);
    const [x2, y2] = ponto(graus, r - (grande ? 16 : 8));
    const vermelha = i >= 7 * 4;
    marcas += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${vermelha ? '#ff3b2f' : 'currentColor'}" stroke-width="${grande ? 3 : 1.5}" stroke-linecap="round"/>`;
    if (grande) {
      const [tx, ty] = ponto(graus, r - 32);
      marcas += `<text x="${tx.toFixed(1)}" y="${(ty + 6).toFixed(1)}" text-anchor="middle" class="giros__numero">${i / 4}</text>`;
    }
  }
  const [ax, ay] = ponto(inicio + (varredura * 7) / 8, r - 3);
  const [bx, by] = ponto(inicio + varredura, r - 3);
  return `
    <svg class="giros" viewBox="0 0 300 300" aria-hidden="true">
      <defs>
        <radialGradient id="giros-fundo" cx="50%" cy="45%" r="60%">
          <stop offset="0" stop-color="#1c2420"/><stop offset="1" stop-color="#070a08"/>
        </radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="140" fill="url(#giros-fundo)" stroke="var(--linha-forte)" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="140" fill="none" stroke="var(--a1)" stroke-opacity=".35" stroke-width="1" stroke-dasharray="2 6"/>
      <path d="M ${ax.toFixed(1)} ${ay.toFixed(1)} A ${r - 3} ${r - 3} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="#ff3b2f" stroke-width="6" stroke-opacity=".8"/>
      <g class="giros__marcas">${marcas}</g>
      <text x="${cx}" y="${cy + 42}" text-anchor="middle" class="giros__unidade">×1000 rpm</text>
      <g class="giros__ponteiro" data-ponteiro style="transform-origin:${cx}px ${cy}px">
        <path d="M ${cx - 4} ${cy + 18} L ${cx} ${cy - 108} L ${cx + 4} ${cy + 18} Z" fill="var(--a1)"/>
      </g>
      <circle cx="${cx}" cy="${cy}" r="13" fill="#0b0d0c" stroke="var(--a1)" stroke-width="3"/>
    </svg>`;
}

export function criarMenu({ progresso, audio, aoEscolher, aoConfigurar }) {
  const raiz = document.getElementById('tela-menu');
  raiz.innerHTML = `
    <section class="menu__topo">
      <div class="menu__heroi">
        <p class="menu__selo">${icone('bandeira')}<span>Seu app de carros</span></p>
        <h1 class="menu__titulo" aria-label="Ronco"><span>RONCO</span></h1>
        <div class="faixas menu__faixas" aria-hidden="true"></div>
        <p class="menu__subtitulo">Estrada infinita, garagem, clima, trânsito e a homenagem ao maior piloto brasileiro. Gire a chave.</p>
        <div class="menu__acoes">
          <button type="button" class="partida" data-partida aria-label="Dar a partida: dirigir">
            <span class="partida__anel"></span>
            <span class="partida__texto"><small>Engine</small>START<small>STOP</small></span>
          </button>
          <p class="menu__dica">Aperte para ir direto para a estrada.</p>
        </div>
      </div>
      <aside class="cluster carbono" aria-label="Painel do piloto">
        <div class="cluster__giros">
          ${svgContaGiros()}
          <div class="cluster__nivel">
            <span class="cluster__rotulo">NÍVEL</span>
            <strong data-nivel>1</strong>
            <span data-titulo></span>
          </div>
        </div>
        <div class="cluster__barra-xp" role="progressbar" aria-label="Experiência até o próximo nível" data-barra-xp><span></span></div>
        <dl class="cluster__leituras">
          <div><dt>Km rodados</dt><dd data-km>0</dd></div>
          <div><dt>Vel. máxima</dt><dd data-vmax>0</dd></div>
          <div><dt>Tempo ao volante</dt><dd data-tempo>0 min</dd></div>
          <div><dt>Conquistas</dt><dd data-conquistas>0</dd></div>
        </dl>
        <ul class="cluster__medalhas" data-medalhas></ul>
        <p class="cluster__detalhe" data-detalhe aria-live="polite">Toque numa medalha para ver como ganhar.</p>
      </aside>
    </section>

    <div class="quadriculado menu__divisor" aria-hidden="true"></div>

    <section class="modulos" aria-labelledby="titulo-modulos">
      <div class="modulos__cabecalho">
        <h2 id="titulo-modulos">Painel de módulos</h2>
        <button type="button" class="chip" data-configurar>${icone('engrenagem')}<span>Configurações</span></button>
      </div>
      <div class="modulos__grade" id="modulos">
        ${SECOES.map((s, i) => `
          <${s.disponivel ? 'a' : 'button'} class="modulo ${s.destaque ? 'modulo--destaque' : ''} ${s.disponivel ? '' : 'modulo--fechado'}"
            ${s.disponivel ? `href="#/s/${s.id}"` : 'type="button" aria-disabled="true"'} data-secao="${s.id}" style="--cor:${s.cor};--ordem:${i}">
            <span class="modulo__led ${s.disponivel ? 'modulo__led--verde' : ''}" aria-hidden="true"></span>
            <span class="modulo__icone">${icone(s.icone)}</span>
            <span class="modulo__nome">${s.nome}</span>
            <span class="modulo__desc">${s.descricao}</span>
            <span class="modulo__rodape">${s.disponivel ? `Entrar ${icone('seta')}` : s.emBreve ? 'Em breve' : 'Em construção'}</span>
          </${s.disponivel ? 'a' : 'button'}>`).join('')}
      </div>
    </section>

    <footer class="menu__rodape">
      <div class="faixas" aria-hidden="true"></div>
      <p class="menu__dedicatoria">Ronco é dedicado a <strong>Ayrton Senna</strong> (1960–1994). Obrigado pelas manhãs de domingo.</p>
      <div class="menu__links">
        <a class="chip" href="${URL_INSTITUTO}" target="_blank" rel="noopener">${icone('coracao')}<span>Instituto Ayrton Senna</span>${icone('externo')}</a>
        <a class="chip" href="${URL_DOPAMINA}">${icone('voltar')}<span>Voltar ao Dopamina</span></a>
      </div>
    </footer>`;

  const $ = (seletor) => raiz.querySelector(seletor);
  const ponteiro = $('[data-ponteiro]');
  let visivel = true;

  /* ---------- Conta-giros: varredura de partida e marcha lenta ---------- */

  const anguloRpm = (rpm) => -120 + (rpm / 8000) * 240; // 0 rpm = -120°, 8000 = +120°
  let rpmAtual = 0;
  let rpmAlvo = 850;
  let animacao = 0;
  function animarPonteiro() {
    const passo = () => {
      rpmAtual += (rpmAlvo - rpmAtual) * 0.12;
      // Marcha lenta com uma leve tremida
      const tremida = rpmAlvo < 1200 && !movimentoReduzido() ? Math.sin(performance.now() / 70) * 25 : 0;
      ponteiro.style.transform = `rotate(${anguloRpm(rpmAtual + tremida)}deg)`;
      if (visivel) animacao = requestAnimationFrame(passo);
    };
    cancelAnimationFrame(animacao);
    animacao = requestAnimationFrame(passo);
  }

  /** Varredura 0 → 8000 → marcha lenta, como no painel de um carro ao ligar. */
  function varrer() {
    rpmAlvo = 8000;
    setTimeout(() => { rpmAlvo = 850; }, movimentoReduzido() ? 50 : 650);
  }

  /** Acelerada rápida no hover do botão de partida. */
  const botaoPartida = $('[data-partida]');
  botaoPartida.addEventListener('pointerenter', () => { rpmAlvo = 3200; audio.tocar('hover'); });
  botaoPartida.addEventListener('pointerleave', () => { rpmAlvo = 850; });
  botaoPartida.addEventListener('click', () => {
    rpmAlvo = 6500;
    aoEscolher('dirigir', origem(botaoPartida));
  });

  /* ---------- Painel do piloto ---------- */

  const medalhas = $('[data-medalhas]');
  const detalhe = $('[data-detalhe]');

  function atualizar() {
    const info = progresso.infoNivel();
    $('[data-nivel]').textContent = String(info.nivel);
    $('[data-titulo]').textContent = info.titulo;
    $('[data-barra-xp]').style.setProperty('--p', `${(info.fracao * 100).toFixed(1)}%`);
    $('[data-barra-xp]').title = `${Math.floor(info.xpNoNivel)} de ${info.necessario} XP`;
    $('[data-km]').textContent = (progresso.estatistica('distancia') / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    $('[data-vmax]').textContent = `${Math.round(progresso.estatistica('velocidadeMaxima'))} km/h`;
    $('[data-tempo]').textContent = `${Math.floor(progresso.estatistica('tempoDirigindo') / 60)} min`;
    const ganhas = CONQUISTAS.filter((c) => progresso.conquistaDesbloqueada(c.id)).length;
    $('[data-conquistas]').textContent = `${ganhas}/${CONQUISTAS.length}`;
    medalhas.innerHTML = CONQUISTAS.map((c) => {
      const ganha = progresso.conquistaDesbloqueada(c.id);
      return `<li><button type="button" class="medalha ${ganha ? '' : 'medalha--bloqueada'} ${c.senna ? 'medalha--senna' : ''}" style="--cor:${c.cor}"
        data-medalha="${c.id}" aria-label="${c.nome}${ganha ? ', conquistada' : ', ainda bloqueada'}">${icone(ganha ? c.icone : 'cadeado')}</button></li>`;
    }).join('');
  }

  function mostrarDetalhe(botao) {
    const c = CONQUISTAS.find((x) => x.id === botao.dataset.medalha);
    const ganha = progresso.conquistaDesbloqueada(c.id);
    detalhe.textContent = `${c.nome}: ${c.descricao}${c.senna ? ' (homenagem a Senna)' : ''}${ganha ? ' ✓' : ''}`;
  }
  for (const evento of ['click', 'pointerover', 'focusin']) {
    medalhas.addEventListener(evento, (e) => {
      const botao = e.target.closest('[data-medalha]');
      if (botao) mostrarDetalhe(botao);
    });
  }

  /* ---------- Módulos ---------- */

  $('#modulos').addEventListener('click', (e) => {
    const modulo = e.target.closest('[data-secao]');
    if (!modulo) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    if (modulo.getAttribute('aria-disabled') === 'true') {
      audio.tocar('erro');
      modulo.classList.remove('modulo--tremer');
      void modulo.offsetWidth;
      modulo.classList.add('modulo--tremer');
      return;
    }
    aoEscolher(modulo.dataset.secao, origem(modulo));
  });
  $('#modulos').addEventListener('pointerover', (e) => {
    const modulo = e.target.closest('[data-secao]');
    if (modulo && e.pointerType === 'mouse' && !modulo.contains(e.relatedTarget)) audio.tocar('hover', { intervaloMin: 0.06 });
  });
  $('[data-configurar]').addEventListener('click', aoConfigurar);

  let atualizacaoPendente = false;
  progresso.on('mudou', () => {
    if (!visivel || atualizacaoPendente) return;
    atualizacaoPendente = true;
    requestAnimationFrame(() => {
      atualizacaoPendente = false;
      atualizar();
    });
  });

  atualizar();
  animarPonteiro();

  return {
    varrer,
    mostrar() {
      visivel = true;
      atualizar();
      rpmAlvo = 850;
      animarPonteiro();
    },
    ocultar() {
      visivel = false;
      cancelAnimationFrame(animacao);
    },
    focar(id) {
      raiz.querySelector(`[data-secao="${id}"]`)?.focus({ preventScroll: false });
    },
  };
}

function origem(elemento) {
  const caixa = elemento.getBoundingClientRect();
  return { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 };
}
