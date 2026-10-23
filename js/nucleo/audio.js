/**
 * Motor de áudio do Ronco (Web Audio API). O AudioContext nasce no primeiro gesto.
 *
 * Cadeia: fontes → canal (motor | efeitos | radio | interface) → mestre → compressor → saída
 *                       └────────── envio de reverberação ──────────┘
 *
 * Cada canal tem volume próprio (Configurações). Os sons da interface mudam com o
 * pacote escolhido. Módulos com síntese própria (o ronco do carro, o rádio) pedem o
 * nó de destino de um canal com `destino(canal)` e montam o próprio grafo.
 */
import { ler, gravar } from './armazenamento.js?v=202610231819';
import { clamp } from './util.js?v=202610231819';

export const midiParaHz = (nota) => 440 * 2 ** ((nota - 69) / 12);

export const CANAIS = [
  { id: 'motor', nome: 'Motor', descricao: 'Ronco e pneus' },
  { id: 'efeitos', nome: 'Efeitos', descricao: 'Vento, chuva, buzina' },
  { id: 'radio', nome: 'Rádio', descricao: 'Música do carro' },
  { id: 'interface', nome: 'Interface', descricao: 'Botões e avisos' },
];

export const PACOTES_SOM = [
  { id: 'painel', nome: 'Painel', descricao: 'Bipes de painel de bordo' },
  { id: 'turbo', nome: 'Turbo', descricao: 'Sopros e "pssh" de válvula' },
  { id: 'retro', nome: 'Fliperama', descricao: 'Bipes de 8 bits dos anos 80' },
  { id: 'mecanico', nome: 'Mecânico', descricao: 'Cliques de chave e alavanca' },
];

const SONS_INTERFACE = new Set(['clique', 'hover', 'abrir', 'fechar', 'alternar', 'conquista', 'nivel', 'erro', 'luz', 'largada']);
const GANHO_CANAL = { motor: 0.9, efeitos: 0.8, radio: 0.55, interface: 0.8 };

let decodificador = null;
const cacheAmostras = new Map();

class MotorAudio {
  ctx = null;
  #mestre = null;
  #canais = {};
  #canalAtual = null;
  #reverb = null;
  #bufferRuido = null;
  #config = { volume: 0.75, mudo: false, motor: 1, efeitos: 1, radio: 0.8, interface: 0.9, pacote: 'painel', ...ler('audio', {}) };
  #ouvintes = new Set();
  #ultimoPorSom = new Map();

  get volume() { return this.#config.volume; }
  get mudo() { return this.#config.mudo; }
  get pacote() { return this.#config.pacote; }
  get ativo() { return Boolean(this.ctx) && this.ctx.state === 'running'; }
  get agora() { return this.ctx ? this.ctx.currentTime : performance.now() / 1000; }

  volumeCanal(canal) {
    return this.#config[canal] ?? 1;
  }

  /** Cria (ou retoma) o contexto. Chamar dentro de um gesto do usuário. */
  desbloquear() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
      return;
    }
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    const c = (this.ctx = new Contexto({ latencyHint: 'interactive' }));
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.25;
    compressor.connect(c.destination);
    this.#mestre = c.createGain();
    this.#mestre.gain.value = 0;
    this.#mestre.connect(compressor);
    for (const { id } of CANAIS) {
      this.#canais[id] = c.createGain();
      this.#canais[id].connect(this.#mestre);
    }
    this.#canalAtual = this.#canais.interface;
    this.#reverb = c.createConvolver();
    this.#reverb.buffer = this.#criarImpulso(2.2, 2.8);
    const retorno = c.createGain();
    retorno.gain.value = 0.35;
    this.#reverb.connect(retorno).connect(this.#mestre);
    this.#bufferRuido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const dados = this.#bufferRuido.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    this.#aplicarVolume();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) c.suspend();
      else c.resume();
    });
    this.#ouvintes.forEach((f) => f(this.#config));
  }

  /* ---------- Volumes ---------- */

  definirVolume(valor) {
    this.#config.volume = clamp(valor, 0, 1);
    this.#salvar();
  }

  definirVolumeCanal(canal, valor) {
    if (!(canal in GANHO_CANAL)) return;
    this.#config[canal] = clamp(valor, 0, 1);
    this.#salvar();
  }

  definirMudo(mudo) {
    this.#config.mudo = mudo;
    this.#salvar();
  }

  alternarMudo() {
    this.definirMudo(!this.#config.mudo);
  }

  definirPacote(id) {
    if (!PACOTES_SOM.some((p) => p.id === id)) return;
    this.#config.pacote = id;
    this.#salvar();
  }

  aoMudar(funcao) {
    this.#ouvintes.add(funcao);
    return () => this.#ouvintes.delete(funcao);
  }

  #salvar() {
    gravar('audio', this.#config);
    this.#aplicarVolume();
    this.#ouvintes.forEach((f) => f(this.#config));
  }

  #aplicarVolume() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.#mestre.gain.setTargetAtTime(this.#config.mudo ? 0 : this.#config.volume ** 2 * 0.95, t, 0.03);
    for (const { id } of CANAIS) this.#canais[id].gain.setTargetAtTime(this.volumeCanal(id) ** 2 * GANHO_CANAL[id], t, 0.03);
  }

  /** Nó de entrada de um canal, para módulos que montam a própria síntese. */
  destino(canal) {
    return this.#canais[canal] ?? this.#canais.efeitos;
  }

  /** Envio para a reverberação geral. */
  get reverb() {
    return this.#reverb;
  }

  /** Fonte de ruído branco em laço (para quem monta a própria síntese). */
  fonteRuido() {
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = this.#bufferRuido;
    fonte.loop = true;
    return fonte;
  }

  /* ---------- Efeitos curtos ---------- */

  /** Toca um som pelo nome. Opções: pan, tom, volume, intervaloMin, canal. */
  tocar(nome, opcoes = {}) {
    if (!this.ativo || this.#config.mudo) return;
    const agora = this.ctx.currentTime;
    if (agora - (this.#ultimoPorSom.get(nome) ?? -1) < (opcoes.intervaloMin ?? 0.03)) return;
    this.#ultimoPorSom.set(nome, agora);
    const interface_ = SONS_INTERFACE.has(nome);
    this.#canalAtual = this.#canais[opcoes.canal ?? (interface_ ? 'interface' : 'efeitos')];
    try {
      if (interface_) this.#somInterface(nome, opcoes);
      else this.#somEfeito(nome, opcoes);
    } finally {
      this.#canalAtual = this.#canais.interface;
    }
  }

  #somInterface(nome, o) {
    const pan = o.pan ?? 0;
    const p = this.#config.pacote;
    // Luzes de largada e a largada em si soam iguais em todos os pacotes (são "do carro")
    if (nome === 'luz') return this.#tom({ freq: 880, tipo: 'square', duracao: 0.16, volume: 0.06, filtro: { freq: 2600 } });
    if (nome === 'largada') {
      this.#tom({ freq: 1320, tipo: 'square', duracao: 0.4, volume: 0.07, filtro: { freq: 3000 } });
      return this.#ruido({ duracao: 0.5, filtro: 'bandpass', freq: 600, freqFinal: 3000, q: 1, volume: 0.06 });
    }
    if (p === 'turbo') {
      if (nome === 'clique') this.#ruido({ duracao: 0.09, filtro: 'highpass', freq: 3200, freqFinal: 1800, q: 0.7, volume: 0.07, pan });
      else if (nome === 'hover') this.#ruido({ duracao: 0.04, filtro: 'highpass', freq: 5000, q: 0.5, volume: 0.015, pan });
      else if (nome === 'abrir' || nome === 'fechar') this.#ruido({ duracao: 0.35, filtro: 'bandpass', freq: nome === 'abrir' ? 400 : 2400, freqFinal: nome === 'abrir' ? 2400 : 400, q: 1.4, volume: 0.09 });
      else if (nome === 'alternar') this.#ruido({ duracao: 0.18, filtro: 'highpass', freq: 2600, freqFinal: 6000, q: 0.6, volume: 0.06, pan });
      else if (nome === 'erro') this.#tom({ freq: 220, freqFinal: 150, tipo: 'sawtooth', duracao: 0.2, volume: 0.05, filtro: { freq: 900 } });
      else this.#arpejo([67, 74, 79, 86], 0.06, 'sawtooth', 0.05, 2400);
      return;
    }
    if (p === 'retro') {
      if (nome === 'clique') this.#arpejo([81, 88], 0.035, 'square', 0.04, 3800);
      else if (nome === 'hover') this.#arpejo([93], 0.03, 'square', 0.013, 3800);
      else if (nome === 'abrir') this.#arpejo([67, 72, 76, 79], 0.035, 'square', 0.035, 3800);
      else if (nome === 'fechar') this.#arpejo([79, 76, 72, 67], 0.035, 'square', 0.035, 3800);
      else if (nome === 'alternar') this.#arpejo([76, 83], 0.04, 'square', 0.04, 3800);
      else if (nome === 'erro') this.#arpejo([52, 48], 0.08, 'square', 0.05, 2000);
      else this.#arpejo([72, 76, 79, 84, 88, 91], 0.06, 'square', 0.045, 3500);
      return;
    }
    if (p === 'mecanico') {
      const estalo = (inicio = 0, tom = 1, vol = 0.12) => {
        this.#ruido({ inicio, duracao: 0.02, filtro: 'bandpass', freq: 2600 * tom, q: 2, volume: vol, pan, reverb: 0 });
        this.#tom({ freq: 900 * tom, inicio, duracao: 0.03, ataque: 0.001, volume: vol * 0.4, pan });
      };
      if (nome === 'clique') estalo();
      else if (nome === 'hover') estalo(0, 1.6, 0.025);
      else if (nome === 'abrir' || nome === 'fechar') { estalo(0, 0.8); estalo(0.07, 1.1, 0.08); }
      else if (nome === 'alternar') { estalo(0, 1.2); estalo(0.05, 0.7, 0.1); }
      else if (nome === 'erro') this.#tom({ freq: 160, freqFinal: 120, tipo: 'triangle', duracao: 0.2, volume: 0.12 });
      else [0, 0.08, 0.16].forEach((t, i) => estalo(t, 1 + i * 0.25, 0.1));
      return;
    }
    // Painel (padrão): bipes limpos de painel de bordo
    if (nome === 'clique') this.#tom({ freq: 1760, duracao: 0.05, volume: 0.06, pan, tipo: 'sine' });
    else if (nome === 'hover') this.#tom({ freq: 2640, duracao: 0.03, volume: 0.015, pan });
    else if (nome === 'abrir') { this.#tom({ freq: 1320, duracao: 0.06, volume: 0.05 }); this.#tom({ freq: 1760, inicio: 0.07, duracao: 0.08, volume: 0.05 }); }
    else if (nome === 'fechar') { this.#tom({ freq: 1760, duracao: 0.06, volume: 0.05 }); this.#tom({ freq: 1320, inicio: 0.07, duracao: 0.08, volume: 0.05 }); }
    else if (nome === 'alternar') this.#tom({ freq: 1480, freqFinal: 1980, duracao: 0.07, volume: 0.06, pan });
    else if (nome === 'erro') { this.#tom({ freq: 440, duracao: 0.12, volume: 0.07, tipo: 'triangle' }); this.#tom({ freq: 440, inicio: 0.16, duracao: 0.12, volume: 0.07, tipo: 'triangle' }); }
    else this.#arpejo([76, 79, 83, 88], 0.08, 'triangle', 0.08, 5000, true);
  }

  #arpejo(notas, passo, tipo, volume, filtro, sino = false) {
    notas.forEach((n, i) => {
      if (sino) this.#sino(midiParaHz(n), i * passo, 1.2, volume, 0);
      else this.#tom({ freq: midiParaHz(n), tipo, inicio: i * passo, duracao: passo * 1.4, volume, filtro: { freq: filtro } });
    });
  }

  #somEfeito(nome, o) {
    const pan = o.pan ?? 0;
    switch (nome) {
      case 'partida':
        this.#partida();
        break;
      case 'buzina': {
        // Buzina de carro: duas notas desafinadas (terça) em onda quadrada filtrada
        for (const f of [415, 523]) this.#tom({ freq: f, tipo: 'square', duracao: o.duracao ?? 0.45, ataque: 0.01, volume: 0.07, pan, filtro: { freq: 1800 } });
        break;
      }
      case 'seta':
        this.#ruido({ duracao: 0.015, filtro: 'bandpass', freq: 3200, q: 3, volume: 0.12, pan, reverb: 0 });
        this.#tom({ freq: 1400, duracao: 0.02, ataque: 0.001, volume: 0.04, pan });
        break;
      case 'checkpoint':
        [76, 83, 88].forEach((n, i) => this.#sino(midiParaHz(n), i * 0.06, 0.9, 0.07, 0));
        break;
      case 'batida': {
        const t = clamp(o.forca ?? 0.5, 0.1, 1);
        this.#ruido({ duracao: 0.35 * t + 0.1, filtro: 'lowpass', freq: 900, q: 0.7, volume: 0.25 * t, pan, reverb: 0.2 });
        this.#tom({ freq: 90, freqFinal: 40, duracao: 0.3, volume: 0.25 * t, pan });
        break;
      }
      case 'trovao':
        this.#ruido({ inicio: o.atraso ?? 0, duracao: 3.5, filtro: 'lowpass', freq: 260, freqFinal: 80, q: 0.5, volume: 0.35, reverb: 0.6 });
        break;
      default:
        break;
    }
  }

  /** Partida: arranque (motor de arranque girando), ignição e o motor pegando. */
  #partida() {
    const c = this.ctx;
    const t0 = c.currentTime;
    const destino = this.#canais.motor;
    // Arranque: rajadas rápidas de ruído grave (~11 por segundo) por 0,8 s
    for (let i = 0; i < 9; i++) this.#ruido({ inicio: i * 0.09, duracao: 0.07, filtro: 'bandpass', freq: 220 + i * 8, q: 1.6, volume: 0.16, reverb: 0.05 });
    this.#tom({ freq: 150, freqFinal: 190, tipo: 'sawtooth', duracao: 0.8, volume: 0.035, filtro: { freq: 500 } });
    // Ignição: rugido que sobe e volta à marcha lenta
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    const sub = c.createOscillator();
    sub.type = 'square';
    const filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.Q.value = 3;
    const ganho = c.createGain();
    const inicio = t0 + 0.82;
    for (const [o, mult] of [[osc, 1], [sub, 0.5]]) {
      o.frequency.setValueAtTime(30 * mult, inicio);
      o.frequency.exponentialRampToValueAtTime(115 * mult, inicio + 0.28);
      o.frequency.exponentialRampToValueAtTime(42 * mult, inicio + 1.1);
      o.frequency.setTargetAtTime(38 * mult, inicio + 1.1, 0.4);
      o.connect(filtro);
      o.start(inicio);
      o.stop(inicio + 2.6);
    }
    filtro.frequency.setValueAtTime(300, inicio);
    filtro.frequency.exponentialRampToValueAtTime(1400, inicio + 0.28);
    filtro.frequency.exponentialRampToValueAtTime(420, inicio + 1.2);
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.22, inicio + 0.06);
    ganho.gain.setValueAtTime(0.22, inicio + 0.5);
    ganho.gain.exponentialRampToValueAtTime(0.09, inicio + 1.3);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 2.55);
    filtro.connect(ganho).connect(destino);
    this.#ruido({ inicio: 0.82, duracao: 0.4, filtro: 'bandpass', freq: 700, freqFinal: 300, q: 0.8, volume: 0.07 });
  }

  /* ---------- Notas (rádio e conquistas) ---------- */

  nota(midi, { quando, duracao = 0.35, timbre = 'sino', volume = 0.1, pan = 0, canal = 'radio' } = {}) {
    if (!this.ativo || this.#config.mudo) return;
    const inicio = Math.max(0, (quando ?? this.ctx.currentTime) - this.ctx.currentTime);
    const freq = midiParaHz(midi);
    this.#canalAtual = this.#canais[canal] ?? this.#canais.radio;
    try {
      if (timbre === 'sino') this.#sino(freq, inicio, duracao * 2.5, volume, pan);
      else if (timbre === 'pluck') {
        this.#tom({ freq, tipo: 'triangle', inicio, duracao, volume, pan, reverb: 0.25 });
        this.#tom({ freq: freq * 2, inicio, duracao: duracao * 0.5, volume: volume * 0.3, pan });
      } else if (timbre === 'synth') {
        this.#tom({ freq, tipo: 'sawtooth', inicio, duracao, volume: volume * 0.55, pan, reverb: 0.2, filtro: { freq: 2400 } });
        this.#tom({ freq: freq * 1.006, tipo: 'square', inicio, duracao, volume: volume * 0.22, pan, filtro: { freq: 1600 } });
      } else if (timbre === 'baixo') {
        this.#tom({ freq, tipo: 'triangle', inicio, duracao, volume, pan, filtro: { freq: 700 } });
        this.#tom({ freq: freq / 2, inicio, duracao, volume: volume * 0.6, pan });
      } else if (timbre === 'pad') {
        this.#tom({ freq, tipo: 'triangle', inicio, duracao, ataque: Math.min(0.3, duracao / 3), volume, pan, reverb: 0.5, filtro: { freq: 1200 } });
      } else if (timbre === 'guitarra') {
        this.#tom({ freq, tipo: 'sawtooth', inicio, duracao, ataque: 0.004, volume: volume * 0.5, pan, filtro: { freq: 1800 } });
        this.#tom({ freq: freq * 1.5, tipo: 'sawtooth', inicio, duracao, ataque: 0.004, volume: volume * 0.3, pan, filtro: { freq: 1500 } });
      }
    } finally {
      this.#canalAtual = this.#canais.interface;
    }
  }

  batida(tipo, quando, canal = 'radio') {
    if (!this.ativo || this.#config.mudo) return;
    const inicio = Math.max(0, (quando ?? this.ctx.currentTime) - this.ctx.currentTime);
    this.#canalAtual = this.#canais[canal] ?? this.#canais.radio;
    try {
      if (tipo === 'bumbo') this.#tom({ freq: 150, freqFinal: 42, inicio, duracao: 0.3, volume: 0.45, ataque: 0.002 });
      else if (tipo === 'caixa') {
        this.#ruido({ inicio, duracao: 0.18, filtro: 'bandpass', freq: 1800, q: 0.7, volume: 0.18, reverb: 0.2 });
        this.#tom({ freq: 230, freqFinal: 160, inicio, duracao: 0.1, volume: 0.12 });
      } else if (tipo === 'chimbal') this.#ruido({ inicio, duracao: 0.045, filtro: 'highpass', freq: 7500, q: 0.5, volume: 0.06, reverb: 0 });
      else if (tipo === 'palma') for (let i = 0; i < 3; i++) this.#ruido({ inicio: inicio + i * 0.012, duracao: 0.08, filtro: 'bandpass', freq: 1300, q: 1.2, volume: 0.1, reverb: 0.3 });
    } finally {
      this.#canalAtual = this.#canais.interface;
    }
  }

  /* ---------- Amostras (gravações) ---------- */

  carregarAmostra(url) {
    const chave = String(url);
    if (!cacheAmostras.has(chave)) {
      cacheAmostras.set(chave, (async () => {
        try {
          const resposta = await fetch(chave);
          if (!resposta.ok) return null;
          decodificador ??= new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 44100, 44100);
          return await decodificador.decodeAudioData(await resposta.arrayBuffer());
        } catch (erro) {
          console.warn('Não deu para carregar o som', chave, erro);
          return null;
        }
      })());
    }
    return cacheAmostras.get(chave);
  }

  tocarAmostra(buffer, { inicio = 0, duracao, tom = 1, volume = 1, pan = 0, reverb = 0, canal = 'efeitos', ataque = 0.004, soltura = 0.03 } = {}) {
    if (!buffer || !this.ativo || this.#config.mudo) return;
    const c = this.ctx;
    const fonte = c.createBufferSource();
    fonte.buffer = buffer;
    fonte.playbackRate.value = tom;
    const trecho = Math.min(duracao ?? buffer.duration - inicio, buffer.duration - inicio);
    const real = trecho / tom;
    const t0 = c.currentTime;
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0, t0);
    envelope.gain.linearRampToValueAtTime(volume, t0 + ataque);
    envelope.gain.setValueAtTime(volume, t0 + Math.max(ataque, real - soltura));
    envelope.gain.linearRampToValueAtTime(0, t0 + real);
    fonte.connect(envelope);
    this.#rotear(envelope, pan, reverb, this.destino(canal));
    fonte.start(t0, inicio, trecho + 0.01);
  }

  /** Laço contínuo de uma gravação: { volume(v), tom(v), filtro(hz), parar() }. */
  iniciarLaco(buffer, { volume = 1, canal = 'efeitos', tom = 1, filtro } = {}) {
    if (!buffer || !this.ctx) return { volume() {}, parar() {}, tom() {}, filtro() {} };
    const c = this.ctx;
    const fonte = c.createBufferSource();
    fonte.buffer = buffer;
    fonte.loop = true;
    fonte.playbackRate.value = tom;
    const ganho = c.createGain();
    ganho.gain.value = 0;
    let no = fonte;
    let f = null;
    if (filtro) {
      f = c.createBiquadFilter();
      f.type = filtro.tipo ?? 'lowpass';
      f.frequency.value = filtro.freq;
      no = no.connect(f);
    }
    no.connect(ganho).connect(this.destino(canal));
    fonte.start(c.currentTime, Math.random() * buffer.duration);
    ganho.gain.setTargetAtTime(volume, c.currentTime, 0.3);
    let parado = false;
    return {
      volume: (v, suavidade = 0.15) => { if (!parado) ganho.gain.setTargetAtTime(Math.max(0, v), c.currentTime, suavidade); },
      tom: (v) => { if (!parado) fonte.playbackRate.setTargetAtTime(v, c.currentTime, 0.08); },
      filtro: (hz) => { if (!parado && f) f.frequency.setTargetAtTime(hz, c.currentTime, 0.1); },
      parar: (suavidade = 0.3) => {
        if (parado) return;
        parado = true;
        const t = c.currentTime;
        ganho.gain.cancelScheduledValues(t);
        ganho.gain.setTargetAtTime(0, t, suavidade);
        fonte.stop(t + suavidade * 6);
      },
    };
  }

  /* ---------- Primitivas ---------- */

  #tom({ freq, freqFinal, tipo = 'sine', inicio = 0, duracao = 0.2, ataque = 0.005, volume = 0.2, reverb = 0, pan = 0, filtro }) {
    const c = this.ctx;
    const t0 = c.currentTime + inicio;
    const osc = c.createOscillator();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqFinal) osc.frequency.exponentialRampToValueAtTime(freqFinal, t0 + duracao);
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, t0);
    envelope.gain.exponentialRampToValueAtTime(volume, t0 + ataque);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
    let no = osc;
    if (filtro) {
      const f = c.createBiquadFilter();
      f.type = filtro.tipo ?? 'lowpass';
      f.frequency.value = filtro.freq;
      no = no.connect(f);
    }
    no.connect(envelope);
    this.#rotear(envelope, pan, reverb, this.#canalAtual);
    osc.start(t0);
    osc.stop(t0 + duracao + 0.05);
  }

  #ruido({ duracao = 0.2, inicio = 0, filtro = 'bandpass', freq = 1000, freqFinal, q = 1, volume = 0.1, pan = 0, reverb = 0.15 }) {
    const c = this.ctx;
    const t0 = c.currentTime + inicio;
    const fonte = this.fonteRuido();
    const f = c.createBiquadFilter();
    f.type = filtro;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (freqFinal) f.frequency.exponentialRampToValueAtTime(freqFinal, t0 + duracao);
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, t0);
    envelope.gain.exponentialRampToValueAtTime(volume, t0 + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
    fonte.connect(f).connect(envelope);
    this.#rotear(envelope, pan, reverb, this.#canalAtual);
    fonte.start(t0, Math.random());
    fonte.stop(t0 + duracao + 0.05);
  }

  #sino(freq, inicio, duracao, volume, pan = 0) {
    const c = this.ctx;
    const t0 = c.currentTime + inicio;
    for (const [razao, peso] of [[1, 1], [2.76, 0.3], [5.4, 0.08]]) {
      const osc = c.createOscillator();
      osc.frequency.value = freq * razao;
      const envelope = c.createGain();
      envelope.gain.setValueAtTime(0.0001, t0);
      envelope.gain.exponentialRampToValueAtTime(volume * peso, t0 + 0.004);
      envelope.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao / razao ** 0.5);
      osc.connect(envelope);
      this.#rotear(envelope, pan, 0.4, this.#canalAtual);
      osc.start(t0);
      osc.stop(t0 + duracao + 0.05);
    }
  }

  #rotear(no, pan, reverb, destino) {
    let saida = no;
    if (pan && this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = clamp(pan, -1, 1);
      saida = no.connect(panner);
    }
    saida.connect(destino);
    if (reverb) {
      const envio = this.ctx.createGain();
      envio.gain.value = reverb;
      saida.connect(envio).connect(this.#reverb);
    }
  }

  #criarImpulso(duracao, decaimento) {
    const c = this.ctx;
    const tamanho = Math.floor(c.sampleRate * duracao);
    const impulso = c.createBuffer(2, tamanho, c.sampleRate);
    for (let canal = 0; canal < 2; canal++) {
      const dados = impulso.getChannelData(canal);
      for (let i = 0; i < tamanho; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / tamanho) ** decaimento;
    }
    return impulso;
  }
}

export const audio = new MotorAudio();
