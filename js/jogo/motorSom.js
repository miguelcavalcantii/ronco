/**
 * Som do carro sintetizado com Web Audio (nenhuma gravação é baixada).
 *
 * Motor: um AudioWorklet gera cada explosão dos cilindros como um pulso curto
 * (um "tum" que ressoa no escapamento). A ordem, a força e o espaçamento
 * irregular das explosões dão o caráter de cada motor: o "lope" do V8, o liso do
 * 6 em linha, o grito do V10/V12, o ronco engasgado do 3 cilindros.
 * Depois do worklet: saturação, filtro que abre com o giro e um realce de "corpo".
 *
 * Extras: assobio e válvula de alívio do turbo, estalos ao tirar o pé em giro alto,
 * pneu cantando, vento, trepidação do acostamento, buzina (segurar), seta
 * (tique-taque) e chuva batendo no carro.
 */

/* ---------- Perfis de motor ---------- */

// amplitudes: força relativa de cada explosão; atrasos: deslocamento no tempo (fração do intervalo)
export const PERFIS_MOTOR = {
  v8: {
    nome: 'V8', cilindros: 8, nivel: 0.55,
    amplitudes: [1, 0.72, 0.95, 0.68, 1, 0.78, 0.9, 0.7], atrasos: [0, 0.12, -0.05, 0.16, 0, 0.1, -0.06, 0.14],
    tau: 0.013, ressonancia: 75, ruido: 0.35, saturacao: 0.6, corte: 320, abertura: 0.42, corpo: 110, estalos: 0.1, buzina: [370, 466],
  },
  l6: {
    nome: '6 em linha', cilindros: 6, nivel: 0.5,
    amplitudes: [1, 0.96, 1, 0.97, 1, 0.95], atrasos: [0, 0.01, 0, -0.01, 0, 0.01],
    tau: 0.008, ressonancia: 150, ruido: 0.22, saturacao: 0.4, corte: 520, abertura: 0.55, corpo: 210, estalos: 0.05, buzina: [415, 523],
  },
  v10: {
    nome: 'V10', cilindros: 10, nivel: 0.45,
    amplitudes: [1, 0.9, 0.97, 0.88, 1, 0.92, 0.95, 0.9, 1, 0.9], atrasos: [0, 0.04, 0, 0.05, 0, 0.03, 0, 0.05, 0, 0.04],
    tau: 0.006, ressonancia: 240, ruido: 0.25, saturacao: 0.55, corte: 700, abertura: 0.7, corpo: 300, estalos: 0.06, buzina: [440, 554],
  },
  v12: {
    nome: 'V12', cilindros: 12, nivel: 0.47,
    amplitudes: Array.from({ length: 12 }, (_, i) => (i % 2 ? 0.94 : 1)), atrasos: new Array(12).fill(0),
    tau: 0.005, ressonancia: 280, ruido: 0.22, saturacao: 0.5, corte: 760, abertura: 0.75, corpo: 340, estalos: 0.05, buzina: [440, 554],
  },
  l4turbo: {
    nome: '4 cilindros turbo', cilindros: 4, nivel: 0.42,
    amplitudes: [1, 0.92, 0.98, 0.9], atrasos: [0, 0.02, 0, 0.02],
    tau: 0.009, ressonancia: 120, ruido: 0.42, saturacao: 0.45, corte: 420, abertura: 0.5, corpo: 170, estalos: 0.08, turbo: 1, buzina: [440, 523],
  },
  f1turbo: {
    nome: 'V6 turbo F1 anos 80', cilindros: 6, nivel: 0.36,
    amplitudes: [1, 0.93, 1, 0.92, 1, 0.94], atrasos: [0, 0.03, 0, 0.03, 0, 0.03],
    tau: 0.0035, ressonancia: 380, ruido: 0.55, saturacao: 0.85, corte: 900, abertura: 0.85, corpo: 420, estalos: 0.14, turbo: 1.3, buzina: [494, 587],
  },
  popular: {
    nome: '4 cilindros', cilindros: 4, nivel: 0.42,
    amplitudes: [1, 0.95, 1, 0.95], atrasos: [0, 0.01, 0, 0.01],
    tau: 0.008, ressonancia: 110, ruido: 0.18, saturacao: 0.25, corte: 300, abertura: 0.3, corpo: 160, estalos: 0, buzina: [494, 622],
  },
  tres: {
    nome: '3 cilindros turbo', cilindros: 3, nivel: 0.42,
    amplitudes: [1, 0.85, 0.93], atrasos: [0, 0.05, -0.03],
    tau: 0.01, ressonancia: 95, ruido: 0.25, saturacao: 0.35, corte: 300, abertura: 0.32, corpo: 130, estalos: 0, turbo: 0.5, buzina: [494, 622],
  },
  eletrico: { nome: 'Elétrico', eletrico: true, nivel: 1.5, buzina: [440, 554] },
};

/* ---------- AudioWorklet: trem de explosões ---------- */

const CODIGO_WORKLET = `
class MotorProcessador extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rpm', defaultValue: 900, minValue: 0, maxValue: 20000, automationRate: 'k-rate' },
      { name: 'carga', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }
  constructor(opcoes) {
    super();
    Object.assign(this, opcoes.processorOptions);
    this.fase = 0;
    this.k = 0;
    this.semente = 12345;
    // Pulsos ativos em vetores fixos (sem criar objetos no áudio)
    this.N = 24;
    this.env = new Float32Array(this.N);
    this.dec = new Float32Array(this.N);
    this.s = new Float32Array(this.N);
    this.c = new Float32Array(this.N);
    this.cw = new Float32Array(this.N);
    this.sw = new Float32Array(this.N);
    this.rui = new Float32Array(this.N);
    this.livre = 0;
  }
  aleatorio() {
    let x = this.semente;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.semente = x >>> 0;
    return this.semente / 4294967296;
  }
  disparar(amp, tau, freq, ruido) {
    const i = this.livre;
    this.livre = (this.livre + 1) % this.N;
    const w = 2 * Math.PI * freq / sampleRate;
    this.env[i] = amp;
    this.dec[i] = Math.exp(-1 / (tau * sampleRate));
    this.s[i] = 0;
    this.c[i] = 1;
    this.cw[i] = Math.cos(w);
    this.sw[i] = Math.sin(w);
    this.rui[i] = ruido;
  }
  alvo() {
    return (this.k + this.atrasos[this.k] * 0.5) / this.cilindros;
  }
  process(entradas, saidas, parametros) {
    const saida = saidas[0][0];
    if (!saida) return true;
    const rpm = parametros.rpm[0];
    const carga = parametros.carga[0];
    const norm = Math.min(1, rpm / this.rpmMax);
    const passo = rpm / 120 / sampleRate; // um ciclo = duas voltas do virabrequim
    const tau = this.tau * (1.35 - norm * 0.7);
    const forca = (0.38 + 0.62 * carga) * (0.6 + 0.4 * norm);
    let alvo = this.alvo();
    for (let n = 0; n < saida.length; n++) {
      this.fase += passo;
      while (this.fase >= alvo) {
        // Estalo no escapamento: pé fora do acelerador em giro alto
        if (carga < 0.05 && norm > 0.45 && this.aleatorio() < this.estalos) {
          this.disparar(2.2, 0.0025, 700 + this.aleatorio() * 600, 1);
        } else {
          const variacao = 0.9 + this.aleatorio() * 0.2;
          this.disparar(this.amplitudes[this.k] * forca * variacao, tau, this.ressonancia * (0.95 + this.aleatorio() * 0.1), this.ruido);
        }
        this.k++;
        if (this.k >= this.cilindros) {
          this.k = 0;
          this.fase -= 1;
        }
        alvo = this.alvo();
      }
      let soma = 0;
      for (let i = 0; i < this.N; i++) {
        const e = this.env[i];
        if (e < 1e-4) continue;
        const s = this.s[i] * this.cw[i] + this.c[i] * this.sw[i];
        const c = this.c[i] * this.cw[i] - this.s[i] * this.sw[i];
        this.s[i] = s;
        this.c[i] = c;
        soma += e * (s * (1 - this.rui[i] * 0.5) + (this.aleatorio() * 2 - 1) * this.rui[i]);
        this.env[i] = e * this.dec[i];
      }
      saida[n] = soma * 0.5;
    }
    return true;
  }
}
registerProcessor('ronco-motor', MotorProcessador);
`;

const modulosCarregados = new WeakMap();
function carregarWorklet(ctx) {
  if (!ctx.audioWorklet) return Promise.reject(new Error('Sem AudioWorklet'));
  if (!modulosCarregados.has(ctx)) {
    const url = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: 'text/javascript' }));
    modulosCarregados.set(ctx, ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url)));
  }
  return modulosCarregados.get(ctx);
}

function curvaSaturacao(quantidade) {
  const n = 1024;
  const curva = new Float32Array(n);
  const k = 1 + quantidade * 10;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curva[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curva;
}

/* ---------- Som completo de um carro ---------- */

export function criarSomDoCarro(audio, idPerfil = 'v8', { rpmMax = 7000 } = {}) {
  const ctx = audio.ctx;
  if (!ctx) return null;
  const perfil = PERFIS_MOTOR[idPerfil] ?? PERFIS_MOTOR.v8;
  const agora = () => ctx.currentTime;
  const nos = [];
  const criar = (no) => { nos.push(no); return no; };
  const ajustar = (param, valor, constante = 0.04) => param.setTargetAtTime(valor, agora(), constante);

  // Limitador: nenhum motor passa do teto, mesmo com tudo no máximo
  const limitador = criar(ctx.createDynamicsCompressor());
  limitador.threshold.value = -8;
  limitador.knee.value = 4;
  limitador.ratio.value = 14;
  limitador.attack.value = 0.002;
  limitador.release.value = 0.12;
  limitador.connect(audio.destino('motor'));
  const saidaMotor = criar(ctx.createGain());
  saidaMotor.gain.value = 0;
  saidaMotor.connect(limitador);
  const saidaEfeitos = criar(ctx.createGain());
  saidaEfeitos.connect(audio.destino('efeitos'));

  /* ---------- Cadeia do motor ---------- */
  const corteGraves = criar(ctx.createBiquadFilter());
  corteGraves.type = 'highpass';
  corteGraves.frequency.value = 28;
  const saturacao = criar(ctx.createWaveShaper());
  saturacao.curve = curvaSaturacao(perfil.saturacao ?? 0.3);
  saturacao.oversample = '2x';
  const filtro = criar(ctx.createBiquadFilter());
  filtro.type = 'lowpass';
  filtro.Q.value = 1.1;
  const corpo = criar(ctx.createBiquadFilter());
  corpo.type = 'peaking';
  corpo.frequency.value = perfil.corpo ?? 150;
  corpo.Q.value = 1.2;
  corpo.gain.value = 5;
  const ganhoMotor = criar(ctx.createGain());
  ganhoMotor.gain.value = 0;
  corteGraves.connect(saturacao).connect(filtro).connect(corpo).connect(ganhoMotor).connect(saidaMotor);

  let worklet = null;
  const osciladores = [];
  if (perfil.eletrico) {
    // Elétrico: zumbido do inversor e do motor, que sobe com a velocidade
    for (const [tipo, mult, vol] of [['sine', 1, 0.4], ['triangle', 2.01, 0.14], ['sine', 3.5, 0.07], ['sine', 7.02, 0.03]]) {
      const o = criar(ctx.createOscillator());
      o.type = tipo;
      const g = criar(ctx.createGain());
      g.gain.value = vol;
      o.connect(g).connect(corteGraves);
      osciladores.push({ o, mult });
      o.start();
    }
    saturacao.curve = curvaSaturacao(0.02);
  } else {
    carregarWorklet(ctx)
      .then(() => {
        if (destruido) return;
        worklet = criar(new AudioWorkletNode(ctx, 'ronco-motor', {
          numberOfInputs: 0,
          outputChannelCount: [1],
          processorOptions: {
            cilindros: perfil.cilindros, amplitudes: perfil.amplitudes, atrasos: perfil.atrasos,
            tau: perfil.tau, ressonancia: perfil.ressonancia, ruido: perfil.ruido, estalos: perfil.estalos ?? 0, rpmMax,
          },
        }));
        worklet.connect(corteGraves);
      })
      .catch(() => {
        // Navegador sem AudioWorklet: dente-de-serra simples na frequência das explosões
        if (destruido) return;
        for (const [tipo, mult, vol] of [['sawtooth', 1, 0.4], ['square', 0.5, 0.2]]) {
          const o = criar(ctx.createOscillator());
          o.type = tipo;
          const g = criar(ctx.createGain());
          g.gain.value = vol;
          o.connect(g).connect(corteGraves);
          osciladores.push({ o, mult, explosao: true });
          o.start();
        }
      });
  }

  // Admissão: ruído filtrado que abre com o acelerador
  const admissao = criar(audio.fonteRuido());
  const filtroAdmissao = criar(ctx.createBiquadFilter());
  filtroAdmissao.type = 'bandpass';
  filtroAdmissao.Q.value = 1.2;
  const ganhoAdmissao = criar(ctx.createGain());
  ganhoAdmissao.gain.value = 0;
  admissao.connect(filtroAdmissao).connect(ganhoAdmissao).connect(saidaMotor);

  // Turbo: assobio que acompanha a pressão
  let assobio = null;
  let ganhoAssobio = null;
  if (perfil.turbo) {
    assobio = criar(ctx.createOscillator());
    assobio.type = 'sine';
    ganhoAssobio = criar(ctx.createGain());
    ganhoAssobio.gain.value = 0;
    assobio.connect(ganhoAssobio).connect(saidaMotor);
    assobio.start();
  }

  /* ---------- Pneu, vento e trepidação ---------- */
  const pneu = criar(audio.fonteRuido());
  const filtroPneu = criar(ctx.createBiquadFilter());
  filtroPneu.type = 'bandpass';
  filtroPneu.frequency.value = 1500;
  filtroPneu.Q.value = 9;
  const ganhoPneu = criar(ctx.createGain());
  ganhoPneu.gain.value = 0;
  pneu.connect(filtroPneu).connect(ganhoPneu).connect(saidaEfeitos);
  const tomPneu = criar(ctx.createOscillator());
  tomPneu.type = 'triangle';
  tomPneu.frequency.value = 820;
  const ganhoTomPneu = criar(ctx.createGain());
  ganhoTomPneu.gain.value = 0;
  tomPneu.connect(ganhoTomPneu).connect(saidaEfeitos);

  const vento = criar(audio.fonteRuido());
  const filtroVento = criar(ctx.createBiquadFilter());
  filtroVento.type = 'lowpass';
  filtroVento.frequency.value = 500;
  const ganhoVento = criar(ctx.createGain());
  ganhoVento.gain.value = 0;
  vento.connect(filtroVento).connect(ganhoVento).connect(saidaEfeitos);

  const rodagem = criar(audio.fonteRuido());
  const filtroRodagem = criar(ctx.createBiquadFilter());
  filtroRodagem.type = 'lowpass';
  filtroRodagem.frequency.value = 160;
  const ganhoRodagem = criar(ctx.createGain());
  ganhoRodagem.gain.value = 0;
  rodagem.connect(filtroRodagem).connect(ganhoRodagem).connect(saidaEfeitos);

  /* ---------- Chuva no carro: chiado + gotas no teto ---------- */
  const chuva = criar(audio.fonteRuido());
  const filtroChuva = criar(ctx.createBiquadFilter());
  filtroChuva.type = 'bandpass';
  filtroChuva.frequency.value = 2400;
  filtroChuva.Q.value = 0.5;
  const ganhoChuva = criar(ctx.createGain());
  ganhoChuva.gain.value = 0;
  chuva.connect(filtroChuva).connect(ganhoChuva).connect(saidaEfeitos);

  /* ---------- Buzina (segurar) ---------- */
  const buzinaSaida = criar(ctx.createGain());
  buzinaSaida.gain.value = 0;
  const buzinaFiltro = criar(ctx.createBiquadFilter());
  buzinaFiltro.type = 'bandpass';
  buzinaFiltro.frequency.value = 1100;
  buzinaFiltro.Q.value = 0.8;
  buzinaFiltro.connect(buzinaSaida).connect(saidaEfeitos);
  for (const f of perfil.buzina ?? [415, 523]) {
    const o = criar(ctx.createOscillator());
    o.type = 'square';
    o.frequency.value = f;
    o.connect(buzinaFiltro);
    o.start();
  }

  const inicio = agora();
  for (const f of [admissao, pneu, vento, rodagem, chuva]) f.start(inicio, Math.random() * 1.5);
  tomPneu.start(inicio);
  saidaMotor.gain.setTargetAtTime(1, inicio, 0.15);

  let destruido = false;
  let pausado = false;
  let quedaTroca = 0;
  let pressao = 0; // pressão do turbo (0–1)
  let ultimaCarga = 0;
  let intensidadeChuva = 0;
  let proximaGota = 0;

  function sopro(volume, duracao) {
    // Válvula de alívio do turbo ("pssh")
    const t = agora();
    const fonte = audio.fonteRuido();
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(5200, t + duracao);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
    fonte.connect(f).connect(g).connect(saidaEfeitos);
    fonte.start(t);
    fonte.stop(t + duracao + 0.05);
  }

  function gota() {
    const t = agora();
    const fonte = audio.fonteRuido();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800 + Math.random() * 3500;
    f.Q.value = 6;
    const g = ctx.createGain();
    const v = 0.03 + Math.random() * 0.07;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    fonte.connect(f).connect(g).connect(saidaEfeitos);
    fonte.start(t, Math.random());
    fonte.stop(t + 0.04);
  }

  return {
    perfil,
    /**
     * A cada quadro. Dados: rpm, rpmMax, carga (0–1), kmh, derrapagem (0–1), limitador, foraDaPista.
     */
    atualizar(dt, d) {
      if (pausado || destruido) return;
      const t = agora();
      quedaTroca = Math.max(0, quedaTroca - dt);
      const norm = Math.min(1, d.rpm / d.rpmMax);
      const carga = d.carga;
      let volume;

      if (perfil.eletrico) {
        const f = 70 + Math.abs(d.kmh) * 8.5;
        for (const { o, mult } of osciladores) ajustar(o.frequency, f * mult, 0.03);
        ajustar(filtro.frequency, 1500 + Math.abs(d.kmh) * 25, 0.05);
        ajustar(filtroAdmissao.frequency, 4200, 0.1);
        ajustar(ganhoAdmissao.gain, Math.min(0.04, Math.abs(d.kmh) / 4000), 0.1);
        volume = 0.06 + carga * 0.2 + Math.min(0.14, Math.abs(d.kmh) / 1300);
      } else {
        const explosoes = (d.rpm / 60) * (perfil.cilindros / 2);
        if (worklet) {
          ajustar(worklet.parameters.get('rpm'), d.rpm, 0.015);
          ajustar(worklet.parameters.get('carga'), carga, 0.03);
        }
        for (const { o, mult } of osciladores) ajustar(o.frequency, explosoes * mult, 0.02);
        ajustar(filtro.frequency, perfil.corte + d.rpm * perfil.abertura * (0.55 + carga * 0.6), 0.03);
        ajustar(filtroAdmissao.frequency, explosoes * 4, 0.03);
        ajustar(ganhoAdmissao.gain, perfil.ruido * 0.25 * carga * (0.3 + norm), 0.05);
        volume = 0.5 + carga * 0.35 + norm * 0.25;
        // Limitador de giro: corte rápido da ignição
        if (d.limitador) volume *= Math.sin(t * 2 * Math.PI * 14) > 0 ? 1 : 0.3;
        // Turbo: a pressão sobe com giro e carga e cai devagar
        if (perfil.turbo) {
          const alvoPressao = carga > 0.3 ? norm * carga : 0;
          pressao += (alvoPressao - pressao) * Math.min(1, dt * (alvoPressao > pressao ? 1.6 : 5));
          ajustar(assobio.frequency, 1600 + pressao * 4200 * perfil.turbo, 0.05);
          ajustar(ganhoAssobio.gain, pressao * pressao * 0.035 * perfil.turbo, 0.05);
          if (ultimaCarga > 0.6 && carga < 0.15 && pressao > 0.35) sopro(0.22 * perfil.turbo, 0.45);
        }
      }
      ultimaCarga = carga;
      if (quedaTroca > 0) volume *= 0.3;
      ajustar(ganhoMotor.gain, volume * (perfil.nivel ?? 1), 0.025);

      // Pneu, vento e acostamento
      const pneuVol = d.derrapagem > 0.05 && Math.abs(d.kmh) > 15 ? 0.12 + d.derrapagem * 0.35 : 0;
      ajustar(ganhoPneu.gain, pneuVol, 0.05);
      ajustar(ganhoTomPneu.gain, pneuVol * 0.12, 0.05);
      ajustar(tomPneu.frequency, 700 + d.derrapagem * 300 + Math.sin(t * 9) * 25, 0.05);
      const v = Math.abs(d.kmh) / 250;
      ajustar(ganhoVento.gain, Math.min(0.5, v * v * 0.55), 0.2);
      ajustar(filtroVento.frequency, 300 + v * 1400, 0.2);
      ajustar(ganhoRodagem.gain, (d.foraDaPista ? 0.55 : 0.08) * Math.min(1, Math.abs(d.kmh) / 60), 0.06);
      ajustar(filtroRodagem.frequency, d.foraDaPista ? 90 + Math.abs(Math.sin(t * 40)) * 120 : 160, 0.02);

      // Chuva: chiado contínuo e gotas sorteadas no teto
      ajustar(ganhoChuva.gain, intensidadeChuva * (0.1 + Math.min(0.12, Math.abs(d.kmh) / 1500)), 0.3);
      if (intensidadeChuva > 0.02) {
        proximaGota -= dt;
        while (proximaGota <= 0) {
          gota();
          proximaGota += -Math.log(1 - Math.random()) / (intensidadeChuva * 45);
        }
      }
    },

    /** Troca de marcha: queda rápida do volume (e "pssh" nos turbos ao subir). */
    trocarMarcha(subiu) {
      if (pausado || destruido) return;
      quedaTroca = 0.11;
      if (perfil.turbo && subiu && pressao > 0.3) sopro(0.18 * perfil.turbo, 0.35);
    },

    /** Buzina: toca enquanto `ligada` for verdadeiro. */
    buzina(ligada) {
      ajustar(buzinaSaida.gain, ligada && !pausado ? 0.16 : 0, 0.008);
    },

    /** Relé da seta: "tique" ao acender, "taque" ao apagar. */
    seta(acesa) {
      if (pausado || destruido) return;
      const t = agora();
      const fonte = audio.fonteRuido();
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = acesa ? 3400 : 2300;
      f.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
      fonte.connect(f).connect(g).connect(saidaEfeitos);
      fonte.start(t, Math.random());
      fonte.stop(t + 0.03);
    },

    /** Intensidade da chuva no carro (0 = seco, 1 = tempestade). */
    chuva(intensidade) {
      intensidadeChuva = Math.max(0, Math.min(1, intensidade));
    },

    pausar() {
      pausado = true;
      saidaMotor.gain.setTargetAtTime(0, agora(), 0.05);
      saidaEfeitos.gain.setTargetAtTime(0, agora(), 0.05);
    },
    retomar() {
      pausado = false;
      saidaMotor.gain.setTargetAtTime(1, agora(), 0.08);
      saidaEfeitos.gain.setTargetAtTime(1, agora(), 0.05);
    },

    destruir() {
      if (destruido) return;
      destruido = true;
      const t = agora();
      saidaMotor.gain.setTargetAtTime(0, t, 0.08);
      saidaEfeitos.gain.setTargetAtTime(0, t, 0.08);
      setTimeout(() => {
        for (const no of nos) {
          try { no.stop?.(); } catch { /* já parado */ }
          no.disconnect();
        }
        worklet?.port.close();
      }, 500);
    },
  };
}
