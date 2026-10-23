/**
 * Câmeras do jogo: terceira pessoa (segue com atraso suave), capô, cockpit e
 * cinematográfica (pontos à beira da estrada que filmam o carro passando).
 */
import * as THREE from 'three';

export const MODOS_CAMERA = [
  { id: 'terceira', nome: 'Terceira pessoa' },
  { id: 'primeira', nome: 'Cockpit' },
  { id: 'capo', nome: 'Capô' },
  { id: 'cinema', nome: 'Cinematográfica' },
];

export function criarControleCamera(camera, { pontoNaEstrada }) {
  let modo = 'terceira';
  const posSuave = new THREE.Vector3();
  const alvoSuave = new THREE.Vector3();
  const desejada = new THREE.Vector3();
  const alvo = new THREE.Vector3();
  const frente = new THREE.Vector3();
  const cima = new THREE.Vector3();
  const local = new THREE.Vector3();
  let primeira = true;
  let fov = 62;
  let tremida = 0;
  const cinema = { ponto: new THREE.Vector3(), s: -Infinity };

  function definirModo(novo) {
    modo = novo;
    primeira = true;
    cinema.s = -Infinity;
  }

  /**
   * `carro`: { grupo (Object3D com a pose do carro), s, x, v (m/s) }.
   */
  function atualizar(dt, carro) {
    const g = carro.grupo;
    frente.set(0, 0, 1).applyQuaternion(g.quaternion);
    cima.set(0, 1, 0).applyQuaternion(g.quaternion);
    const velocidade = Math.abs(carro.v);
    let fovAlvo = 62;

    if (modo === 'terceira') {
      const distancia = 6.6 + velocidade * 0.012;
      desejada.copy(g.position).addScaledVector(frente, -distancia);
      desejada.y += 2.25;
      alvo.copy(g.position).addScaledVector(frente, 3.5);
      alvo.y += 1.0;
      if (primeira) {
        posSuave.copy(desejada);
        alvoSuave.copy(alvo);
      }
      // Posição segue com atraso (mais solta), o alvo segue mais firme
      posSuave.lerp(desejada, 1 - Math.exp(-dt * 7));
      alvoSuave.lerp(alvo, 1 - Math.exp(-dt * 14));
      // Nunca deixa a câmera ficar abaixo do carro (em descidas fortes)
      posSuave.y = Math.max(posSuave.y, g.position.y + 1.1);
      camera.position.copy(posSuave);
      camera.up.set(0, 1, 0);
      camera.lookAt(alvoSuave);
      fovAlvo = 60 + Math.min(16, velocidade * 0.2);
    } else if (modo === 'capo' || modo === 'primeira') {
      // Cockpit: banco do motorista (lado esquerdo = +x local); o F1 informa o próprio ponto
      const [cx, cy, cz] = carro.cockpit ?? [0.36, 1.08, -0.2];
      if (modo === 'capo') local.set(0, (carro.capo ?? 1.22), 0.9);
      else local.set(cx, cy, cz);
      camera.position.copy(local.applyMatrix4(g.matrixWorld));
      camera.up.copy(cima);
      alvo.copy(camera.position).addScaledVector(frente, 20);
      camera.lookAt(alvo);
      fovAlvo = (modo === 'capo' ? 66 : 70) + Math.min(10, velocidade * 0.12);
    } else {
      // Cinematográfica: escolhe um ponto à frente na beira da estrada e filma a passagem
      if (carro.s - cinema.s > 35 || primeira) {
        const lado = Math.random() < 0.5 ? -1 : 1;
        cinema.s = carro.s + 70 + velocidade * 1.2;
        pontoNaEstrada(cinema.s, lado * (11 + Math.random() * 8), cinema.ponto);
        cinema.ponto.y += 1.5 + Math.random() * 4;
      }
      camera.position.copy(cinema.ponto);
      camera.up.set(0, 1, 0);
      alvo.copy(g.position);
      alvo.y += 0.8;
      if (primeira) alvoSuave.copy(alvo);
      alvoSuave.lerp(alvo, 1 - Math.exp(-dt * 10));
      camera.lookAt(alvoSuave);
      const dist = camera.position.distanceTo(g.position);
      fovAlvo = THREE.MathUtils.clamp(2400 / Math.max(dist, 1), 18, 60);
    }
    primeira = false;

    // Tremida sutil em alta velocidade e nas batidas
    tremida = Math.max(0, tremida - dt * 2.5);
    const intensidade = (modo === 'cinema' ? 0 : Math.max(0, velocidade - 45) * 0.0004) + tremida * 0.05;
    if (intensidade > 0) {
      camera.position.x += (Math.random() - 0.5) * intensidade;
      camera.position.y += (Math.random() - 0.5) * intensidade;
    }
    fov += (fovAlvo - fov) * (1 - Math.exp(-dt * 4));
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  return {
    get modo() { return modo; },
    definirModo,
    proximo() {
      const i = MODOS_CAMERA.findIndex((m) => m.id === modo);
      const novo = MODOS_CAMERA[(i + 1) % MODOS_CAMERA.length];
      definirModo(novo.id);
      return novo;
    },
    sacudir(forca) { tremida = Math.max(tremida, forca); },
    /** Origem flutuante: acompanha o deslocamento do mundo. */
    deslocar(d) {
      posSuave.sub(d);
      alvoSuave.sub(d);
      cinema.ponto.sub(d);
    },
    atualizar,
  };
}
