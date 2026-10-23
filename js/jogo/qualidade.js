/**
 * Níveis de qualidade gráfica e o modo automático, que mede o FPS e
 * desce (ou sobe) um nível para manter o jogo a ~60 quadros por segundo.
 */

export const NIVEIS = ['baixo', 'medio', 'alto', 'ultra'];

export const PRESETS = {
  baixo: { escala: 0.65, pixelMax: 1, distancia: 650, vegetacao: 0.45, sombras: false, tamSombra: 0, montanhas: 64 },
  medio: { escala: 0.85, pixelMax: 1.25, distancia: 950, vegetacao: 0.75, sombras: false, tamSombra: 0, montanhas: 96 },
  alto: { escala: 1, pixelMax: 1.5, distancia: 1300, vegetacao: 1, sombras: true, tamSombra: 1024, montanhas: 128 },
  ultra: { escala: 1, pixelMax: 2, distancia: 1700, vegetacao: 1.4, sombras: true, tamSombra: 2048, montanhas: 160 },
};

/**
 * Controle da qualidade. `escolha` é o que a pessoa escolheu ('auto' ou um nível).
 * `aoMudar(nivel)` é chamado quando o nível efetivo muda.
 */
export function criarControleQualidade(escolha, aoMudar) {
  const auto = escolha === 'auto';
  // Começa no médio em celulares e no alto em computadores
  const celular = matchMedia('(pointer: coarse)').matches;
  let nivel = auto ? (celular ? 'medio' : 'alto') : escolha;
  let acumulado = 0;
  let quadros = 0;
  let segundosBons = 0;
  let segundosRuins = 0;
  let travadoAte = 0; // depois de descer, não sobe de volta por um tempo
  let fps = 60;
  let tempoTotal = 0;

  function mudar(novo) {
    if (novo === nivel) return;
    nivel = novo;
    acumulado = 0;
    quadros = 0;
    aoMudar(nivel);
  }

  return {
    get nivel() { return nivel; },
    get preset() { return PRESETS[nivel]; },
    get fps() { return fps; },
    get automatico() { return auto; },

    /** Chamar a cada quadro com o tempo real do quadro (s), sem limite. */
    medir(dtReal) {
      tempoTotal += dtReal;
      acumulado += dtReal;
      quadros++;
      if (acumulado < 1) return;
      fps = quadros / acumulado;
      acumulado = 0;
      quadros = 0;
      // Os primeiros segundos têm carregamento e compilação de shaders: não contam
      if (!auto || tempoTotal < 4) return;
      const i = NIVEIS.indexOf(nivel);
      if (fps < 48) {
        segundosBons = 0;
        segundosRuins++;
        // Dois segundos ruins seguidos (um tranco isolado não conta)
        if (segundosRuins >= 2 && i > 0) {
          segundosRuins = 0;
          travadoAte = tempoTotal + 40;
          mudar(NIVEIS[i - 1]);
        }
      } else if (fps > 58) {
        segundosRuins = 0;
        segundosBons++;
        // Sobe no máximo até o "alto"; o ultra só escolhendo à mão
        if (segundosBons > 8 && i < 2 && tempoTotal > travadoAte) {
          segundosBons = 0;
          mudar(NIVEIS[i + 1]);
        }
      } else {
        segundosBons = 0;
        segundosRuins = 0;
      }
    },
  };
}
