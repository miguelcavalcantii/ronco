/**
 * Seção Dirigir: estrada infinita em 3D. Junta o mundo, a estrada em pedaços,
 * o carro, a física, as câmeras, os controles e o som, e desenha o painel (HUD).
 */
import * as THREE from 'three';
import { icone } from '../../nucleo/icones.js?v=202610240909';
import { carregarEstilo, clamp } from '../../nucleo/util.js?v=202610240909';
import { luzesDeLargada } from '../../nucleo/ui.js?v=202610240909';
import { Tracado, MEIA_LARGURA } from '../../jogo/tracado.js?v=202610240909';
import { criarRuido } from '../../jogo/ruido.js?v=202610240909';
import { Estrada } from '../../jogo/estrada.js?v=202610240909';
import { obterPaisagem, PAISAGENS } from '../../jogo/paisagens.js?v=202610240909';
import { Circuito, INTERLAGOS } from '../../jogo/circuito.js?v=202610240909';
import { criarCenarioCircuito } from '../../jogo/cenarioCircuito.js?v=202610240909';
import { garagem } from '../../jogo/garagemDados.js?v=202610240909';
import { criarCarro } from '../../jogo/modelosReais.js?v=202610240909';
import { criarFisica } from '../../jogo/fisica.js?v=202610240909';
import { criarControleCamera } from '../../jogo/cameras.js?v=202610240909';
import { criarEntrada } from '../../jogo/entrada.js?v=202610240909';
import { criarSomDoCarro } from '../../jogo/motorSom.js?v=202610240909';
import { criarMundo } from '../../jogo/mundo.js?v=202610240909';
import { criarControleQualidade } from '../../jogo/qualidade.js?v=202610240909';

const DISTANCIA_REBASE = 2500; // origem flutuante: recentra o mundo a cada 2,5 km
const NOMES_QUALIDADE = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', ultra: 'Ultra' };

export async function montar(raiz, { audio, preferencias, progresso, avisar, configuracoes, voltar }) {
  await carregarEstilo(new URL('../../../css/secoes/dirigir.css?v=202610240909', import.meta.url));

  raiz.innerHTML = `
    <div class="jogo" data-jogo>
      <div class="jogo__palco" data-palco></div>
      <div class="jogo__veu" data-veu></div>

      <div class="hud" data-hud>
        <div class="hud__topo">
          <span class="hud__info"><small>Distância</small><strong data-hud-distancia>0,0 km</strong></span>
          <span class="hud__info"><small>Tempo</small><strong data-hud-tempo>0:00</strong></span>
          <span class="hud__info hud__info--volta" data-hud-volta hidden><small data-volta-titulo>Volta</small><strong data-volta-tempo>0:00.0</strong></span>
          <span class="hud__info hud__info--volta" data-hud-melhor hidden><small>Melhor</small><strong data-volta-melhor>–</strong></span>
        </div>
        <span class="hud__fps" data-hud-fps hidden></span>
        <div class="painel carbono" aria-hidden="true">
          <div class="painel__topo">
            <span class="painel__seta" data-seta-indicador="esquerda">${icone('voltar')}</span>
            <div class="painel__leds" data-leds>${'<i></i>'.repeat(10)}</div>
            <span class="painel__seta" data-seta-indicador="direita">${icone('seta')}</span>
          </div>
          <svg class="painel__giros" viewBox="0 0 200 120">
            <path class="painel__trilho" d="M20 110 A80 80 0 0 1 180 110" pathLength="100"/>
            <path class="painel__vermelho" d="M20 110 A80 80 0 0 1 180 110" pathLength="100"/>
            <path class="painel__ponteiro" data-arco d="M20 110 A80 80 0 0 1 180 110" pathLength="100"/>
          </svg>
          <div class="painel__leitura">
            <strong data-velocidade>0</strong>
            <small data-unidade>km/h</small>
          </div>
          <div class="painel__marcha"><small>Marcha</small><strong data-marcha>N</strong></div>
          <div class="painel__rpm"><span data-rpm>850</span> rpm</div>
        </div>
        <div class="hud__aviso" data-aviso-camera></div>
      </div>

      <div class="controles-toque" data-controles-toque>
        <div class="controles-toque__lado">
          <button type="button" class="tecla-toque tecla-toque--mini" data-controle="buzina" aria-label="Buzina">BI</button>
          <button type="button" class="tecla-toque" data-controle="esquerda" aria-label="Virar à esquerda">${icone('voltar')}</button>
          <button type="button" class="tecla-toque" data-controle="direita" aria-label="Virar à direita">${icone('seta')}</button>
        </div>
        <div class="controles-toque__lado">
          <button type="button" class="tecla-toque tecla-toque--mini" data-controle="freioDeMao" aria-label="Freio de mão">FM</button>
          <button type="button" class="tecla-toque tecla-toque--pedal tecla-toque--freio" data-controle="frear" aria-label="Frear">FREIO</button>
          <button type="button" class="tecla-toque tecla-toque--pedal" data-controle="acelerar" aria-label="Acelerar">GÁS</button>
        </div>
      </div>
      <div class="jogo__botoes">
        <button type="button" class="botao-icone pilula" data-controle="camera" aria-label="Trocar câmera (C)" title="Trocar câmera (C)">${icone('camera')}</button>
        <button type="button" class="botao-icone pilula" data-abrir-paisagens aria-label="Trocar paisagem" title="Trocar paisagem">${icone('montanha')}</button>
        <button type="button" class="botao-icone pilula" data-pausar aria-label="Pausar (P ou Esc)" title="Pausar (P ou Esc)">${icone('pausa')}</button>
      </div>

      <div class="pausa" data-pausa hidden>
        <div class="pausa__caixa carbono" role="dialog" aria-modal="true" aria-labelledby="pausa-titulo">
          <h2 id="pausa-titulo">Box</h2>
          <div class="faixas"></div>
          <div class="pausa__botoes">
            <button type="button" class="botao" data-continuar>${icone('jogar')}<span>Voltar à pista</span></button>
            <button type="button" class="botao botao--secundario" data-recomecar>${icone('recarregar')}<span>Recomeçar</span></button>
            <button type="button" class="botao botao--secundario" data-abrir-config>${icone('engrenagem')}<span>Configurações</span></button>
            <button type="button" class="botao botao--secundario" data-sair>${icone('voltar')}<span>Sair para o menu</span></button>
          </div>
          <h3 class="pausa__subtitulo" id="pausa-paisagens">Paisagem</h3>
          <div class="pausa__paisagens" role="group" aria-labelledby="pausa-paisagens">
            ${PAISAGENS.map((x) => `<button type="button" class="paisagem-botao" data-paisagem="${x.id}" title="${x.descricao}" style="--c1:${x.ceu.topo};--c2:${x.grama[0]};--c3:${x.ceu.horizonte}">
              <span class="paisagem-botao__previa" aria-hidden="true"></span><span>${x.nome}</span></button>`).join('')}
          </div>
          <p class="pausa__dica" data-dica-controles></p>
        </div>
      </div>
    </div>`;

  const $ = (s) => raiz.querySelector(s);
  const palco = $('[data-palco]');
  const elPausa = $('[data-pausa]');

  /* ---------- Montagem do mundo ---------- */

  let paisagem = obterPaisagem(preferencias.get('paisagem') ?? 'serra');
  const carroDados = garagem.carro;
  const ajustes = garagem.ajustesDe(carroDados.id);
  let qualidade;
  const aoMudarQualidade = (nivel) => {
    mundo.aplicarPreset(qualidade.preset);
    estrada.definirPreset(qualidade.preset);
    carro.definirSombras(qualidade.preset.sombras);
    if (qualidade.automatico) mostrarAviso(`Qualidade automática: ${NOMES_QUALIDADE[nivel]}`);
  };
  qualidade = criarControleQualidade(preferencias.get('qualidade'), aoMudarQualidade);

  const mundo = criarMundo({ raiz: palco, preset: qualidade.preset, paisagem });
  const ruido = criarRuido(2024);
  // Traçado (estrada infinita ou circuito fechado), estrada em pedaços e cenário fixo do autódromo
  let tracado;
  let estrada;
  let cenario = null;
  function montarCenario() {
    if (paisagem.circuito) {
      tracado = new Circuito(INTERLAGOS);
    } else {
      tracado = new Tracado(5 + PAISAGENS.findIndex((x) => x.id === paisagem.id) * 31);
      tracado.relevo = paisagem.tracado.relevo;
      tracado.sinuosidade = paisagem.tracado.sinuosidade;
    }
    estrada = new Estrada({ cena: mundo.cena, tracado, ruido, paisagem, renderizador: mundo.renderizador, preset: qualidade.preset });
    cenario = paisagem.circuito ? criarCenarioCircuito({ cena: mundo.cena, circuito: tracado, paisagem }) : null;
  }
  montarCenario();
  const carro = await criarCarro(carroDados, { ambiente: mundo.ambiente, ajustes });
  carro.definirSombras(qualidade.preset.sombras);
  mundo.cena.add(carro.grupo);
  carro.farois(paisagem.noite ? 3 : 1.2);
  const fisica = criarFisica(carroDados, { raioRoda: carro.raioRoda, entreEixos: carro.entreEixos, altura: ajustes.altura });
  fisica.definirCambio(preferencias.get('cambio'));
  const e = fisica.estado;
  // No autódromo a largada é na Reta dos Boxes, 60 m antes da linha
  const posicionarLargada = () => {
    if (paisagem.circuito) {
      e.s = tracado.comprimento - 60;
      e.x = 3.2;
    }
  };
  posicionarLargada();

  const ponto = {};
  function pontoNaEstrada(s, x, saida) {
    const c = tracado.em(s, ponto);
    return saida.set(c.x - Math.cos(c.rumo) * x, c.y + x * c.lateral, c.z + Math.sin(c.rumo) * x);
  }
  const cameras = criarControleCamera(mundo.camera, { pontoNaEstrada });
  cameras.definirModo(preferencias.get('camera'));
  const entrada = criarEntrada({ preferencias, alvoToque: $('[data-jogo]') });

  // Constrói os pedaços iniciais todos de uma vez (atrás das luzes de largada)
  estrada.atualizar(e.s, e.s, 999);
  progresso.registrar('dirigir:paisagem', 1, paisagem.id);
  progresso.registrar('dirigir:carro', 1, carroDados.id);

  /* ---------- Som ---------- */

  let som = null;
  const garantirSom = () => {
    if (!som && audio.ativo) som = criarSomDoCarro(audio, carroDados.motor, { rpmMax: carroDados.rpmMax });
  };

  /* ---------- HUD ---------- */

  const hud = {
    distancia: $('[data-hud-distancia]'),
    tempo: $('[data-hud-tempo]'),
    fps: $('[data-hud-fps]'),
    velocidade: $('[data-velocidade]'),
    unidade: $('[data-unidade]'),
    marcha: $('[data-marcha]'),
    rpm: $('[data-rpm]'),
    arco: $('[data-arco]'),
    leds: [...raiz.querySelectorAll('[data-leds] i')],
    aviso: $('[data-aviso-camera]'),
  };
  const ultimo = {};
  const escrever = (chave, el, texto) => {
    if (ultimo[chave] === texto) return;
    ultimo[chave] = texto;
    el.textContent = texto;
  };
  let timerAviso = 0;
  function mostrarAviso(texto) {
    hud.aviso.textContent = texto;
    hud.aviso.classList.add('hud__aviso--visivel');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => hud.aviso.classList.remove('hud__aviso--visivel'), 1600);
  }
  function aplicarFps() {
    hud.fps.hidden = !preferencias.get('mostrarFps');
  }
  aplicarFps();
  $('[data-dica-controles]').textContent = matchMedia('(pointer: coarse)').matches
    ? 'Toque nos pedais para acelerar e frear; nas setas para virar.'
    : 'W/↑ acelera · S/↓ freia · A D vira · Espaço freio de mão · C câmera · H buzina · I esconde o painel. Controle de videogame também funciona.';

  let distanciaSessao = 0;
  let tempoSessao = 0;
  function atualizarHud() {
    const mph = preferencias.get('unidade') === 'mph';
    const vel = Math.abs(fisica.kmh) * (mph ? 0.621371 : 1);
    escrever('vel', hud.velocidade, String(Math.round(vel)));
    escrever('uni', hud.unidade, mph ? 'mph' : 'km/h');
    escrever('marcha', hud.marcha, fisica.marchaTexto);
    escrever('rpm', hud.rpm, String(Math.round(e.rpm / 50) * 50));
    const fracao = clamp(e.rpm / carroDados.rpmMax, 0, 1);
    const fr = Math.round(fracao * 200) / 2;
    if (ultimo.arco !== fr) {
      ultimo.arco = fr;
      hud.arco.style.strokeDasharray = `${fr} 100`;
      // Luzes de troca: acendem do verde ao vermelho perto do giro máximo
      const acesas = Math.round(clamp((fracao - 0.55) / 0.4, 0, 1) * hud.leds.length);
      hud.leds.forEach((led, i) => led.classList.toggle('aceso', i < acesas));
      hud.leds[0].parentElement.classList.toggle('piscando', fracao > 0.96);
    }
    escrever('dist', hud.distancia, `${(distanciaSessao / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`);
    const seg = Math.floor(tempoSessao);
    escrever('tempo', hud.tempo, `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`);
  }

  /* ---------- Pausa ---------- */

  let pausado = false;
  let largadaLiberada = false;
  let luzes = null;
  function pausar() {
    if (pausado) return;
    pausado = true;
    elPausa.hidden = false;
    entrada.soltarTudo();
    som?.pausar();
    audio.tocar('abrir');
    $('[data-continuar]').focus({ preventScroll: true });
  }
  function continuar() {
    if (!pausado) return;
    pausado = false;
    elPausa.hidden = true;
    som?.retomar();
    entrada.ler(); // descarta o "pausar" que ficou na fila
    ultimoTempo = 0;
    audio.tocar('fechar');
  }
  elPausa.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-continuar]')) continuar();
    else if (ev.target.closest('[data-recomecar]')) recomecar();
    else if (ev.target.closest('[data-abrir-config]')) configuracoes.abrir();
    else if (ev.target.closest('[data-sair]')) voltar();
  });
  $('[data-pausar]').addEventListener('click', () => (pausado ? continuar() : pausar()));
  // Na pausa, Esc ou P voltam à pista (a fila de teclas do jogo está parada)
  const teclaNaPausa = (ev) => {
    if (!pausado || configuracoes.aberta) return;
    if (preferencias.get('teclas').pausar.includes(ev.code)) {
      ev.preventDefault();
      continuar();
    }
  };
  window.addEventListener('keydown', teclaNaPausa);
  const aoOcultar = () => { if (document.hidden) pausar(); };
  document.addEventListener('visibilitychange', aoOcultar);

  function largar() {
    largadaLiberada = false;
    luzes?.cancelar();
    luzes = luzesDeLargada(audio, { intervalo: 0.7 });
    cenario?.luzes(true);
    luzes.promessa.then((ok) => {
      cenario?.luzes(false);
      if (ok !== false) largadaLiberada = true;
    });
  }

  /* ---------- Setas (pisca-pisca) ---------- */

  let seta = null; // 'esquerda' | 'direita' | null
  let faseSeta = 0;
  let setaAcesa = false;
  let tempoSeta = 0;
  const indicadores = { esquerda: $('[data-seta-indicador="esquerda"]'), direita: $('[data-seta-indicador="direita"]') };
  function alternarSeta(lado) {
    seta = seta === lado ? null : lado;
    faseSeta = 0;
    tempoSeta = 0;
    setaAcesa = false;
    if (!seta) acenderSeta(false);
  }
  function acenderSeta(acesa) {
    setaAcesa = acesa;
    carro.setas(acesa && seta === 'esquerda', acesa && seta === 'direita');
    indicadores.esquerda.classList.toggle('aceso', acesa && seta === 'esquerda');
    indicadores.direita.classList.toggle('aceso', acesa && seta === 'direita');
    if (seta || !acesa) som?.seta(acesa);
  }
  function piscarSetas(dt) {
    if (!seta) return;
    tempoSeta += dt;
    // Desliga sozinha depois de 12 s (esquecer a seta ligada é coisa de motorista distraído)
    if (tempoSeta > 12) { seta = null; acenderSeta(false); return; }
    faseSeta -= dt;
    if (faseSeta <= 0) {
      acenderSeta(!setaAcesa);
      faseSeta = 0.36;
    }
  }

  function recomecar() {
    fisica.reiniciar();
    posicionarLargada();
    reiniciarCronometro();
    distanciaSessao = 0;
    tempoSessao = 0;
    cameras.definirModo(cameras.modo);
    continuar();
    largar();
  }

  /* ---------- Preferências mudando durante o jogo ---------- */

  const aoMudarPreferencia = ({ chave }) => {
    if (chave === 'qualidade') {
      qualidade = criarControleQualidade(preferencias.get('qualidade'), aoMudarQualidade);
      aoMudarQualidade(qualidade.nivel);
    }
    if (chave === 'cambio') fisica.definirCambio(preferencias.get('cambio'));
    if (chave === 'mostrarFps') aplicarFps();
    if (chave === 'camera') cameras.definirModo(preferencias.get('camera'));
  };
  const pararDePreferencias = preferencias.on('mudou', aoMudarPreferencia);

  /* ---------- Troca de paisagem (com véu suave) ---------- */

  const veu = $('[data-veu]');
  let trocando = false;
  function marcarPaisagem() {
    raiz.querySelectorAll('[data-paisagem]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.paisagem === paisagem.id)));
  }
  marcarPaisagem();
  async function trocarPaisagem(id) {
    if (trocando || id === paisagem.id) return;
    trocando = true;
    audio.tocar('abrir');
    veu.style.background = obterPaisagem(id).neblina.cor;
    veu.classList.add('jogo__veu--ativo');
    await new Promise((r) => setTimeout(r, 450));
    paisagem = obterPaisagem(id);
    preferencias.definir('paisagem', id);
    estrada.destruir();
    cenario?.destruir();
    mundo.aplicarPaisagem(paisagem);
    // O reflexo do carro vem do céu novo
    carro.grupo.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.envMap) { m.envMap = mundo.ambiente; m.needsUpdate = true; }
      }
    });
    carro.farois(paisagem.noite ? 3 : 1.2);
    montarCenario();
    fisica.reiniciar();
    e.s = 160;
    posicionarLargada();
    reiniciarCronometro();
    cameras.definirModo(cameras.modo);
    estrada.atualizar(e.s, e.s, 999);
    progresso.registrar('dirigir:paisagem', 1, paisagem.id);
    marcarPaisagem();
    elPausa.hidden = true;
    pausado = false;
    som?.retomar();
    ultimoTempo = 0;
    veu.classList.remove('jogo__veu--ativo');
    qualidade.carencia(4);
    trocando = false;
    largar();
    mostrarAviso(paisagem.nome);
  }
  elPausa.addEventListener('click', (ev) => {
    const botao = ev.target.closest('[data-paisagem]');
    if (botao) trocarPaisagem(botao.dataset.paisagem);
  });
  $('[data-abrir-paisagens]').addEventListener('click', () => {
    pausar();
    raiz.querySelector('[data-paisagem][aria-pressed="true"]')?.focus({ preventScroll: true });
  });

  /* ---------- Cronômetro do autódromo ---------- */

  const elVolta = $('[data-hud-volta]');
  const elMelhor = $('[data-hud-melhor]');
  let voltaAnterior = 0;
  let tempoVolta = 0;
  let cronometrando = false;
  let trechoAtual = '';
  const formatarVolta = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  function reiniciarCronometro() {
    voltaAnterior = paisagem.circuito ? Math.floor(e.s / tracado.comprimento) : 0;
    tempoVolta = 0;
    cronometrando = false;
    trechoAtual = '';
    elVolta.hidden = !paisagem.circuito;
    elMelhor.hidden = !paisagem.circuito;
    const melhor = progresso.recorde('volta:interlagos');
    $('[data-volta-melhor]').textContent = melhor ? formatarVolta(melhor) : '–';
    $('[data-volta-titulo]').textContent = 'Volta';
    $('[data-volta-tempo]').textContent = '0:00.0';
  }
  reiniciarCronometro();
  function cronometrar(dt) {
    if (cronometrando && largadaLiberada) tempoVolta += dt;
    const volta = Math.floor(e.s / tracado.comprimento);
    if (volta > voltaAnterior) {
      // Cruzou a linha de chegada
      if (cronometrando) {
        const recorde = progresso.definirRecorde('volta:interlagos', tempoVolta, { menorMelhor: true });
        progresso.registrar('autodromo:volta');
        progresso.ganharXp(25);
        avisar({ titulo: `Volta ${volta - 1}: ${formatarVolta(tempoVolta)}`, texto: recorde ? 'Nova melhor volta!' : 'Continue acelerando.', icone: 'bandeira', cor: recorde ? 'var(--a1)' : 'var(--a2)' });
        if (recorde) $('[data-volta-melhor]').textContent = formatarVolta(tempoVolta);
        audio.tocar(recorde ? 'conquista' : 'checkpoint');
      }
      cronometrando = true;
      tempoVolta = 0;
      voltaAnterior = volta;
    }
    $('[data-volta-titulo]').textContent = cronometrando ? `Volta ${volta}` : 'Volta';
    escrever('volta', $('[data-volta-tempo]'), formatarVolta(tempoVolta));
    const nome = tracado.nomeTrecho(e.s);
    if (nome !== trechoAtual) {
      if (trechoAtual) mostrarAviso(nome);
      trechoAtual = nome;
    }
  }

  /* ---------- Laço principal ---------- */

  const posCarro = new THREE.Vector3();
  const desloc = new THREE.Vector3();
  const c = {};
  let ultimoTempo = 0;
  let acumuladoProgresso = 0;
  let metrosProgresso = 0;
  let vmaxProgresso = 0;
  let metrosXp = 0;

  function quadro(agora) {
    let dtReal = ultimoTempo ? (agora - ultimoTempo) / 1000 : 1 / 60;
    ultimoTempo = agora;
    if (pausado) return;
    if (!(dtReal > 0) || !Number.isFinite(dtReal)) dtReal = 1 / 60; // tempo inválido (troca de aba, relógio)
    const dt = Math.min(dtReal, 1 / 30);
    qualidade.medir(dtReal);
    if (!hud.fps.hidden) escrever('fps', hud.fps, `${Math.round(qualidade.fps)} FPS · ${NOMES_QUALIDADE[qualidade.nivel]}`);
    garantirSom();

    const comando = entrada.ler();
    for (const acao of comando.acoes) {
      if (acao === 'pausar') { pausar(); return; }
      if (acao === 'camera') {
        const novo = cameras.proximo();
        mostrarAviso(`Câmera: ${novo.nome}`);
        audio.tocar('alternar');
      }
      if (acao === 'setaEsquerda' || acao === 'setaDireita') alternarSeta(acao === 'setaEsquerda' ? 'esquerda' : 'direita');
      if (acao === 'esconderPainel') document.body.classList.toggle('interface-oculta');
    }
    comando.subir = comando.acoes.has('marchaAcima');
    comando.descer = comando.acoes.has('marchaAbaixo');

    // Antes do "VAI!" o carro fica parado, mas dá para acelerar em ponto morto
    const sAntes = e.s;
    tracado.em(e.s, c);
    const seguro = { ...e };
    const eventos = fisica.passo(dt, comando, { curvatura: c.curvatura, inclinacao: c.inclinacao, aderencia: paisagem.aderencia ?? 1 });
    // Proteção: se algum número da física ficar inválido, volta ao último estado bom
    if (![e.s, e.x, e.v, e.angulo, e.rpm, e.esterco].every(Number.isFinite)) {
      console.warn('Física inválida neste quadro; estado restaurado.', { ...e }, comando);
      Object.assign(e, seguro, { v: 0 });
    }
    if (!largadaLiberada) {
      e.s = sAntes;
      e.v = 0;
      e.angulo = 0;
    }
    for (const ev of eventos) {
      if (ev.tipo === 'troca') som?.trocarMarcha(ev.subiu);
      if (ev.tipo === 'batida') {
        audio.tocar('batida', { forca: ev.forca });
        cameras.sacudir(ev.forca);
        navigator.vibrate?.(Math.round(30 + ev.forca * 60));
      }
    }

    // Pose do carro sobre a pista (posição, rumo, subida e banking)
    tracado.em(e.s, c);
    posCarro.set(c.x - Math.cos(c.rumo) * e.x, c.y + e.x * c.lateral, c.z + Math.sin(c.rumo) * e.x);
    carro.grupo.position.copy(posCarro);
    carro.grupo.rotation.set(-c.inclinacao, c.rumo + e.angulo, -Math.asin(clamp(c.lateral, -0.5, 0.5)), 'YXZ');
    carro.grupo.updateMatrixWorld();
    // Suspensão: a carroceria inclina com as acelerações
    const alvoRolagem = clamp(-e.aceleracaoLateral * 0.0045, -0.06, 0.06);
    const alvoArfagem = clamp(-e.aceleracaoLongitudinal * 0.0045, -0.05, 0.05);
    carro.carroceria.rotation.z += (alvoRolagem - carro.carroceria.rotation.z) * Math.min(1, dt * 8);
    carro.carroceria.rotation.x += (alvoArfagem - carro.carroceria.rotation.x) * Math.min(1, dt * 8);
    for (const roda of carro.rodas) roda.rotation.x = e.giroRodas;
    for (const pivo of carro.pivos) pivo.rotation.y = -e.esterco;
    carro.frear(comando.frear > 0 && e.v > 0.5);

    cameras.atualizar(dt, { grupo: carro.grupo, s: e.s, x: e.x, v: e.v, cockpit: carro.cockpit, capo: carro.capo });
    estrada.atualizar(e.s);
    tracado.descartarAte(e.s - 300);

    // Origem flutuante
    if (Math.abs(posCarro.x) > DISTANCIA_REBASE || Math.abs(posCarro.z) > DISTANCIA_REBASE || Math.abs(posCarro.y) > 600) {
      desloc.copy(posCarro);
      tracado.deslocar(desloc.x, desloc.y, desloc.z);
      estrada.deslocar(desloc.x, desloc.y, desloc.z);
      carro.grupo.position.sub(desloc);
      posCarro.sub(desloc);
      mundo.camera.position.sub(desloc);
      cameras.deslocar(desloc);
    }
    mundo.acompanhar(mundo.camera.position, posCarro, estrada.origem.y);
    cenario?.acompanhar();
    if (paisagem.circuito) cronometrar(dt);

    som?.atualizar(dt, {
      rpm: e.rpm,
      rpmMax: carroDados.rpmMax,
      carga: e.trocando ? 0.1 : comando.acelerar,
      kmh: fisica.kmh,
      derrapagem: e.derrapagem,
      limitador: e.limitador,
      foraDaPista: e.foraDaPista && Math.abs(e.x) > MEIA_LARGURA,
    });
    som?.buzina(comando.buzina);
    piscarSetas(dt);

    // Estatísticas e XP
    const metros = Math.max(0, e.s - sAntes);
    if (largadaLiberada) {
      distanciaSessao += metros;
      if (Math.abs(e.v) > 0.5) tempoSessao += dt;
    }
    metrosProgresso += metros;
    metrosXp += metros;
    vmaxProgresso = Math.max(vmaxProgresso, Math.abs(fisica.kmh));
    acumuladoProgresso += dt;
    if (acumuladoProgresso >= 1) {
      progresso.dirigiu({ metros: metrosProgresso, segundos: Math.abs(e.v) > 0.5 ? acumuladoProgresso : 0, kmh: vmaxProgresso });
      if (metrosXp >= 250) {
        progresso.ganharXp(Math.floor(metrosXp / 250));
        metrosXp %= 250;
      }
      acumuladoProgresso = 0;
      metrosProgresso = 0;
      vmaxProgresso = 0;
    }
    atualizarHud();
    mundo.desenhar();
  }

  mundo.renderizador.setAnimationLoop(quadro);
  // Para testes: ?depurar no endereço expõe as peças do jogo no console
  if (new URLSearchParams(location.search).has('depurar')) window.ronco = { fisica, estrada, tracado, mundo, qualidade: () => qualidade, cameras, som: () => som, carro };
  largar();

  return {
    capturaEsc: true,
    destruir() {
      mundo.renderizador.setAnimationLoop(null);
      luzes?.cancelar();
      clearTimeout(timerAviso);
      document.removeEventListener('visibilitychange', aoOcultar);
      pararDePreferencias();
      window.removeEventListener('keydown', teclaNaPausa);
      document.body.classList.remove('interface-oculta');
      progresso.salvarAgora();
      entrada.destruir();
      som?.destruir();
      estrada.destruir();
      cenario?.destruir();
      carro.destruir();
      mundo.destruir();
    },
  };
}

