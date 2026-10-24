/**
 * Cenário fixo do autódromo (montado uma vez): chão que acompanha as alturas da
 * pista, árvores fora das áreas de escape, arquibancadas nas cores do Brasil na
 * Reta dos Boxes, prédio e muro dos boxes, linha de chegada quadriculada e o
 * pórtico com as cinco luzes de largada.
 */
import * as THREE from 'three';
import { MEIA_LARGURA, ACOSTAMENTO } from './tracado.js?v=202610240909';
import { geradorComSemente } from '../nucleo/util.js?v=202610240909';
import { criarRuido } from './ruido.js?v=202610240909';

const BORDA = MEIA_LARGURA + ACOSTAMENTO;

function texturaQuadriculada() {
  const tela = document.createElement('canvas');
  tela.width = 256;
  tela.height = 32;
  const g = tela.getContext('2d');
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
  }
  const t = new THREE.CanvasTexture(tela);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function criarCenarioCircuito({ cena, circuito, paisagem }) {
  const grupo = new THREE.Group();
  cena.add(grupo);
  const A = circuito.amostras;
  const N = circuito.N;
  const ruido = criarRuido(404);
  const geometrias = [];
  const materiais = [];
  const guardar = (g, m) => { geometrias.push(g); if (m) materiais.push(m); return g; };

  /* ---------- Chão: alturas interpoladas a partir da pista ---------- */
  const referencias = [];
  for (let i = 0; i < N; i += 6) referencias.push(A[i]);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const a of A) {
    minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x);
    minZ = Math.min(minZ, a.z); maxZ = Math.max(maxZ, a.z);
  }
  const margem = 420;
  minX -= margem; maxX += margem; minZ -= margem; maxZ += margem;
  /** Altura do chão e distância até a pista mais próxima. */
  function chao(x, z) {
    let soma = 0;
    let pesos = 0;
    let menor = Infinity;
    for (const r of referencias) {
      const d2 = (r.x - x) ** 2 + (r.z - z) ** 2;
      if (d2 < menor) menor = d2;
      const w = 1 / (d2 * d2 + 1);
      soma += r.y * w;
      pesos += w;
    }
    const distancia = Math.sqrt(menor);
    const ondulacao = ruido.fbm2(x / 260, z / 260, 3) * 6 * Math.min(1, Math.max(0, (distancia - 60) / 200));
    return { y: soma / pesos - 1.3 + ondulacao, distancia };
  }
  const passo = 12;
  const nx = Math.ceil((maxX - minX) / passo);
  const nz = Math.ceil((maxZ - minZ) / passo);
  const geoChao = guardar(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, nx, nz));
  geoChao.rotateX(-Math.PI / 2);
  geoChao.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  const pos = geoChao.attributes.position;
  const cores = new Float32Array(pos.count * 3);
  const cor = new THREE.Color();
  const grama = paisagem.grama.map((c) => new THREE.Color(c));
  for (let i = 0; i < pos.count; i++) {
    const { y, distancia } = chao(pos.getX(i), pos.getZ(i));
    pos.setY(i, y);
    const v = ruido.r2(pos.getX(i) / 30, pos.getZ(i) / 30) * 0.5 + 0.5;
    cor.copy(grama[Math.floor(v * grama.length) % grama.length]);
    // Grama aparada perto da pista, mais escura longe
    if (distancia < 30) cor.offsetHSL(0, -0.05, 0.04);
    if (distancia > 250) cor.multiplyScalar(0.85);
    cor.toArray(cores, i * 3);
  }
  geoChao.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  geoChao.computeVertexNormals();
  const materialChao = new THREE.MeshLambertMaterial({ vertexColors: true });
  materiais.push(materialChao);
  const malhaChao = new THREE.Mesh(geoChao, materialChao);
  malhaChao.receiveShadow = true;
  grupo.add(malhaChao);

  /* ---------- Árvores fora das áreas de escape ---------- */
  const aleatorio = geradorComSemente(2024);
  const tronco = guardar(new THREE.CylinderGeometry(0.22, 0.32, 3, 5));
  tronco.translate(0, 1.5, 0);
  const copa = guardar(new THREE.IcosahedronGeometry(2.4, 1));
  copa.translate(0, 4.4, 0);
  const MAX = 420;
  const troncos = new THREE.InstancedMesh(tronco, new THREE.MeshLambertMaterial({ color: '#5a4026' }), MAX);
  const copas = new THREE.InstancedMesh(copa, new THREE.MeshLambertMaterial({ color: '#ffffff' }), MAX);
  materiais.push(troncos.material, copas.material);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const e = new THREE.Vector3();
  let quantas = 0;
  for (let t = 0; t < MAX * 4 && quantas < MAX; t++) {
    const x = minX + aleatorio() * (maxX - minX);
    const z = minZ + aleatorio() * (maxZ - minZ);
    const { y, distancia } = chao(x, z);
    if (distancia < 45 || ruido.fbm2(x / 160, z / 160, 2) < -0.05) continue;
    const escala = 0.8 + aleatorio() * 0.9;
    q.setFromAxisAngle(e.set(0, 1, 0), aleatorio() * 6.28);
    m.compose(v.set(x, y - 0.2, z), q, e.set(escala, escala, escala));
    troncos.setMatrixAt(quantas, m);
    copas.setMatrixAt(quantas, m);
    copas.setColorAt(quantas, cor.set(paisagem.vegetacao.cores[Math.floor(aleatorio() * paisagem.vegetacao.cores.length)]));
    quantas++;
  }
  troncos.count = quantas;
  copas.count = quantas;
  grupo.add(troncos, copas);

  /* ---------- Peças ao longo da Reta dos Boxes ---------- */
  const comprimento = circuito.comprimento;
  const ponto = (s) => circuito.amostras[Math.floor((((s % comprimento) + comprimento) % comprimento) / 2) % N];
  /** Coloca uma malha a `x` metros do centro da pista (+ = direita) na distância `s`. */
  function colocar(malha, s, x, dy = 0) {
    const a = ponto(s);
    malha.position.set(a.x - Math.cos(a.rumo) * x, a.y + dy, a.z + Math.sin(a.rumo) * x);
    malha.rotation.y = a.rumo;
    grupo.add(malha);
    return malha;
  }
  const concreto = new THREE.MeshLambertMaterial({ color: '#c9c9c4' });
  const cinza = new THREE.MeshLambertMaterial({ color: '#5d6168' });
  const assentos = ['#00a651', '#ffd60a', '#1e5bff'].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  materiais.push(concreto, cinza, ...assentos);

  // Arquibancadas por fora da reta (lado direito no sentido anti-horário)
  const degrau = guardar(new THREE.BoxGeometry(30, 1.2, 2.4));
  const cobertura = guardar(new THREE.BoxGeometry(32, 0.3, 12));
  for (let k = 0; k < 9; k++) {
    const s = comprimento - 460 + k * 42;
    const bloco = new THREE.Group();
    for (let d = 0; d < 6; d++) {
      const g = new THREE.Mesh(degrau, assentos[(k + d) % 3]);
      g.position.set(0, 0.6 + d * 1.2, d * 2.2);
      bloco.add(g);
    }
    const base = new THREE.Mesh(guardar(new THREE.BoxGeometry(30, 7.2, 13)), concreto);
    base.position.set(0, -3.6 + 0.01, 5.5);
    const teto = new THREE.Mesh(cobertura, cinza);
    teto.position.set(0, 12, 5);
    bloco.add(base, teto);
    // Gira para os degraus subirem para longe da pista
    const a = ponto(s);
    bloco.position.set(a.x - Math.cos(a.rumo) * (BORDA + 9), a.y, a.z + Math.sin(a.rumo) * (BORDA + 9));
    bloco.rotation.y = a.rumo - Math.PI / 2;
    grupo.add(bloco);
  }

  // Muro e prédio dos boxes por dentro da reta
  const muro = guardar(new THREE.BoxGeometry(1, 1.1, 40));
  for (let k = 0; k < 10; k++) colocar(new THREE.Mesh(muro, concreto), comprimento - 440 + k * 40, -(MEIA_LARGURA + 1.0), 0.55);
  const predio = guardar(new THREE.BoxGeometry(14, 8, 60));
  const vidros = new THREE.MeshLambertMaterial({ color: '#2a3c52', emissive: '#0a1420' });
  materiais.push(vidros);
  for (let k = 0; k < 6; k++) {
    const b = colocar(new THREE.Mesh(predio, k % 2 ? concreto : vidros), comprimento - 420 + k * 62, -(BORDA + 24), 4);
    b.castShadow = true;
  }

  // Linha de chegada (s = 0) e pórtico com as cinco luzes
  const quadriculado = texturaQuadriculada();
  const materialLinha = new THREE.MeshBasicMaterial({ map: quadriculado });
  materiais.push(materialLinha);
  const linhaGeo = guardar(new THREE.PlaneGeometry(MEIA_LARGURA * 2, 1.6));
  linhaGeo.rotateX(-Math.PI / 2);
  colocar(new THREE.Mesh(linhaGeo, materialLinha), 0, 0, 0.04);
  const poste = guardar(new THREE.BoxGeometry(0.5, 7.5, 0.5));
  for (const lado of [-1, 1]) colocar(new THREE.Mesh(poste, cinza), 0, lado * (BORDA + 0.6), 3.75);
  const viga = guardar(new THREE.BoxGeometry(BORDA * 2 + 1.7, 0.9, 0.7));
  colocar(new THREE.Mesh(viga, cinza), 0, 0, 7.3);
  const luzGeo = guardar(new THREE.BoxGeometry(0.5, 0.5, 0.2));
  const luzMat = new THREE.MeshBasicMaterial({ color: '#3a0808' });
  materiais.push(luzMat);
  for (let k = 0; k < 5; k++) colocar(new THREE.Mesh(luzGeo, luzMat), 0.4, -2 + k, 6.6);

  grupo.traverse((o) => { if (o.isMesh && o !== malhaChao) o.castShadow = true; });

  return {
    grupo,
    /** O cenário segue a origem flutuante do circuito. */
    acompanhar() {
      const off = circuito.deslocamento;
      grupo.position.set(-off.x, -off.y, -off.z);
    },
    /** Acende ou apaga as luzes do pórtico (n de 0 a 5). */
    luzes(acesas) {
      luzMat.color.set(acesas ? '#ff1a0d' : '#3a0808');
    },
    destruir() {
      grupo.removeFromParent();
      geometrias.forEach((g) => g.dispose());
      materiais.forEach((x) => x?.dispose?.());
      quadriculado.dispose();
      troncos.dispose();
      copas.dispose();
    },
  };
}
