/**
 * Som do carro sintetizado com Web Audio (sem gravações): motor que acompanha
 * o giro e a carga, trocas de marcha audíveis, limitador de giro, pneu
 * cantando, vento e o "trepidar" do acostamento.
 *
 * Frequência base = frequência de explosões: rpm / 60 × cilindros / 2 (motor 4 tempos).
 * Cada perfil muda o timbre; a etapa de sons de motor amplia esta lista.
 */

export const PERFIS_MOTOR = {
  v8: { nome: 'V8', cilindros: 8, lope: 0.28, aspereza: 0.55, corte: 380, brilho: 1, sub: 0.55, ruido: 0.18 },
  l6: { nome: '6 em linha', cilindros: 6, lope: 0.06, aspereza: 0.35, corte: 520, brilho: 1.3, sub: 0.3, ruido: 0.12 },
  v12: { nome: 'V10/V12', cilindros: 12, lope: 0.03, aspereza: 0.4, corte: 700, brilho: 1.7, sub: 0.2, ruido: 0.12 },
  l4turbo: { nome: '4 cilindros turbo', cilindros: 4, lope: 0.08, aspereza: 0.45, corte: 450, brilho: 1.1, sub: 0.3, ruido: 0.3, turbo: true },
  f1turbo: { nome: 'V6 turbo F1 anos 80', cilindros: 6, lope: 0.04, aspereza: 0.7, corte: 900, brilho: 2, sub: 0.25, ruido: 0.35, turbo: true },
  popular: { nome: 'Popular', cilindros: 4, lope: 0.05, aspereza: 0.25, corte: 330, brilho: 0.8, sub: 0.2, ruido: 0.1 },
  eletrico: { nome: 'Elétrico', eletrico: true },
};

export function criarSomDoCarro(audio, idPerfil = 'v8') {
  const ctx = audio.ctx;
  if (!ctx) return null;
  const perfil = PERFIS_MOTOR[idPerfil] ?? PERFIS_MOTOR.v8;
  const agora = () => ctx.currentTime;
  const nos = [];
  const criar = (no) => { nos.push(no); return no; };

  const saidaMotor = criar(ctx.createGain());
  saidaMotor.gain.value = 0;
  saidaMotor.connect(audio.destino('motor'));
  const saidaEfeitos = criar(ctx.createGain());
  saidaEfeitos.gain.value = 1;
  saidaEfeitos.connect(audio.destino('efeitos'));

  /* ---------- Motor ---------- */
  const filtro = criar(ctx.createBiquadFilter());
  filtro.type = 'lowpass';
  filtro.Q.value = 2.2;
  const distorcao = criar(ctx.createWaveShaper());
  distorcao.curve = curvaSaturacao(perfil.aspereza ?? 0.4);
  distorcao.oversample = '2x';
  const pulsacao = criar(ctx.createGain()); // "lope" do V8 (ronco irregular)
  const mistura = criar(ctx.createGain());
  mistura.gain.value = 0.5;
  mistura.connect(distorcao).connect(filtro).connect(pulsacao).connect(saidaMotor);

  const osciladores = [];
  let lfo = null;
  let ganhoLfo = null;
  if (perfil.eletrico) {
    // Elétrico: zumbido do inversor que sobe com a velocidade
    for (const [tipo, mult, vol] of [['sine', 1, 0.5], ['triangle', 2.01, 0.18], ['sine', 3.5, 0.08]]) {
      const o = criar(ctx.createOscillator());
      o.type = tipo;
      const g = criar(ctx.createGain());
      g.gain.value = vol;
      o.connect(g).connect(mistura);
      osciladores.push({ o, mult });
    }
    distorcao.curve = curvaSaturacao(0.05);
  } else {
    for (const [tipo, mult, vol, desafinar] of [
      ['sawtooth', 1, 0.5, 0],
      ['sawtooth', 0.5, perfil.sub, 7],
      ['square', 2, 0.12 * perfil.brilho, -5],
      ['triangle', 0.25, perfil.sub * 0.6, 0],
    ]) {
      const o = criar(ctx.createOscillator());
      o.type = tipo;
      o.detune.value = desafinar;
      const g = criar(ctx.createGain());
      g.gain.value = vol;
      o.connect(g).connect(mistura);
      osciladores.push({ o, mult });
    }
    lfo = criar(ctx.createOscillator());
    lfo.type = 'sine';
    ganhoLfo = criar(ctx.createGain());
    ganhoLfo.gain.value = 0;
    pulsacao.gain.value = 1;
    lfo.connect(ganhoLfo).connect(pulsacao.gain);
  }

  // Ruído de admissão/escape
  const ruido = criar(audio.fonteRuido());
  const filtroRuido = criar(ctx.createBiquadFilter());
  filtroRuido.type = 'bandpass';
  filtroRuido.Q.value = 1.4;
  const ganhoRuido = criar(ctx.createGain());
  ganhoRuido.gain.value = 0;
  ruido.connect(filtroRuido).connect(ganhoRuido).connect(perfil.eletrico ? saidaEfeitos : filtro);

  /* ---------- Pneu, vento e trepidação ---------- */
  const pneu = criar(audio.fonteRuido());
  const filtroPneu = criar(ctx.createBiquadFilter());
  filtroPneu.type = 'bandpass';
  filtroPneu.frequency.value = 1500;
  filtroPneu.Q.value = 9;
  const ganhoPneu = criar(ctx.createGain());
  ganhoPneu.gain.value = 0;
  pneu.connect(filtroPneu).connect(ganhoPneu).connect(saidaEfeitos);
  // Chiado "cantado": oscilador que dá tom ao pneu derrapando
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

  const inicio = agora();
  for (const { o } of osciladores) o.start(inicio);
  lfo?.start(inicio);
  tomPneu.start(inicio);
  for (const f of [ruido, pneu, vento, rodagem]) f.start(inicio, Math.random() * 1.5);
  saidaMotor.gain.setTargetAtTime(1, inicio, 0.2);

  let pausado = false;
  let quedaTroca = 0;
  let ultimoRpm = 0;

  function ajustar(param, valor, constante = 0.04) {
    param.setTargetAtTime(valor, agora(), constante);
  }

  return {
    perfil,
    /**
     * Atualiza a cada quadro. Dados: rpm, rpmMax, carga (0–1), kmh, derrapagem (0–1),
     * limitador, foraDaPista.
     */
    atualizar(dt, d) {
      if (pausado) return;
      const t = agora();
      quedaTroca = Math.max(0, quedaTroca - dt);
      const rpm = d.rpm;
      const norm = Math.min(1, rpm / d.rpmMax);
      const carga = d.carga;
      let volume;
      if (perfil.eletrico) {
        const f = 90 + Math.abs(d.kmh) * 9;
        for (const { o, mult } of osciladores) ajustar(o.frequency, f * mult, 0.03);
        ajustar(filtro.frequency, 1200 + Math.abs(d.kmh) * 20, 0.05);
        ajustar(filtroRuido.frequency, 3000, 0.1);
        ajustar(ganhoRuido.gain, Math.min(0.05, Math.abs(d.kmh) / 3000), 0.1);
        volume = 0.08 + carga * 0.18 + Math.min(0.15, Math.abs(d.kmh) / 1200);
      } else {
        const f0 = (rpm / 60) * (perfil.cilindros / 2);
        for (const { o, mult } of osciladores) ajustar(o.frequency, f0 * mult, 0.02);
        // Lope: forte em marcha lenta, some nos giros altos
        if (lfo) {
          ajustar(lfo.frequency, f0 / 4, 0.02);
          ajustar(ganhoLfo.gain, perfil.lope * (1 - norm) * 1.4, 0.08);
        }
        ajustar(filtro.frequency, perfil.corte + rpm * 0.38 * perfil.brilho + carga * 1600, 0.03);
        ajustar(filtroRuido.frequency, f0 * 3, 0.03);
        ajustar(ganhoRuido.gain, perfil.ruido * (0.2 + carga * 0.9) * (0.4 + norm), 0.05);
        volume = 0.22 + carga * 0.32 + norm * 0.2;
        // Limitador de giro: corte rápido da ignição
        if (d.limitador) volume *= Math.sin(t * 2 * Math.PI * 14) > 0 ? 1 : 0.35;
      }
      if (quedaTroca > 0) volume *= 0.35;
      ajustar(saidaMotor.gain, volume, 0.025);

      // Pneu cantando e vento
      const pneuVol = d.derrapagem > 0.05 && Math.abs(d.kmh) > 15 ? 0.12 + d.derrapagem * 0.35 : 0;
      ajustar(ganhoPneu.gain, pneuVol, 0.05);
      ajustar(ganhoTomPneu.gain, pneuVol * 0.12, 0.05);
      ajustar(tomPneu.frequency, 700 + d.derrapagem * 300 + Math.sin(t * 9) * 25, 0.05);
      const v = Math.abs(d.kmh) / 250;
      ajustar(ganhoVento.gain, Math.min(0.5, v * v * 0.55), 0.2);
      ajustar(filtroVento.frequency, 300 + v * 1400, 0.2);
      ajustar(ganhoRodagem.gain, (d.foraDaPista ? 0.55 : 0.08) * Math.min(1, Math.abs(d.kmh) / 60), 0.06);
      ajustar(filtroRodagem.frequency, d.foraDaPista ? 90 + Math.abs(Math.sin(t * 40)) * 120 : 160, 0.02);
      ultimoRpm = rpm;
    },

    /** Troca de marcha: queda rápida de volume (e "pssh" da válvula nos turbos). */
    trocarMarcha(subiu) {
      if (pausado) return;
      quedaTroca = 0.12;
      if (perfil.turbo && subiu && ultimoRpm > 3500) {
        const t = agora();
        const fonte = audio.fonteRuido();
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.setValueAtTime(2500, t);
        f.frequency.exponentialRampToValueAtTime(5000, t + 0.3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.32, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        fonte.connect(f).connect(g).connect(saidaEfeitos);
        fonte.start(t);
        fonte.stop(t + 0.45);
      }
    },

    pausar() {
      pausado = true;
      saidaMotor.gain.setTargetAtTime(0, agora(), 0.05);
      saidaEfeitos.gain.setTargetAtTime(0, agora(), 0.05);
    },
    retomar() {
      pausado = false;
      saidaEfeitos.gain.setTargetAtTime(1, agora(), 0.05);
    },

    destruir() {
      const t = agora();
      saidaMotor.gain.setTargetAtTime(0, t, 0.08);
      saidaEfeitos.gain.setTargetAtTime(0, t, 0.08);
      setTimeout(() => {
        for (const no of nos) {
          try { no.stop?.(); } catch { /* já parado */ }
          no.disconnect();
        }
      }, 500);
    },
  };
}

function curvaSaturacao(quantidade) {
  const n = 1024;
  const curva = new Float32Array(n);
  const k = 1 + quantidade * 12;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curva[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curva;
}
