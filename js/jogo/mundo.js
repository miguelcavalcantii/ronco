/**
 * Mundo 3D: renderizador, cena, câmera, céu (degradê + sol), luzes, neblina e
 * as montanhas do horizonte (um anel que acompanha a câmera, sempre ao longe).
 * O mapa de reflexo do carro é gerado a partir do próprio céu.
 */
import * as THREE from 'three';
import { criarRuido } from './ruido.js?v=202610231912';

const RAIO_CEU = 3200;
const RAIO_MONTANHAS = 2300;

const SHADER_CEU = {
  vertexShader: `
    varying vec3 vDirecao;
    void main() {
      vDirecao = normalize(position);
      vec4 p = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * p;
      gl_Position.z = gl_Position.w; // sempre no fundo
    }`,
  fragmentShader: `
    uniform vec3 topo;
    uniform vec3 horizonte;
    uniform vec3 corSol;
    uniform vec3 direcaoSol;
    varying vec3 vDirecao;
    void main() {
      float h = clamp(vDirecao.y, -0.2, 1.0);
      vec3 cor = mix(horizonte, topo, pow(max(h, 0.0), 0.55));
      float s = max(dot(normalize(vDirecao), normalize(direcaoSol)), 0.0);
      cor += corSol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.25);
      gl_FragColor = vec4(cor, 1.0);
      #include <colorspace_fragment>
    }`,
};

function criarMaterialCeu(paisagem, direcaoSol) {
  return new THREE.ShaderMaterial({
    uniforms: {
      topo: { value: new THREE.Color(paisagem.ceu.topo) },
      horizonte: { value: new THREE.Color(paisagem.ceu.horizonte) },
      corSol: { value: new THREE.Color(paisagem.ceu.sol) },
      direcaoSol: { value: direcaoSol.clone() },
    },
    vertexShader: SHADER_CEU.vertexShader,
    fragmentShader: SHADER_CEU.fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

/** Anel de montanhas com o topo recortado por ruído; cores mais claras no alto (névoa). */
function criarMontanhas(paisagem, segmentos) {
  const ruido = criarRuido(91);
  const { cor, altura, rugosidade } = paisagem.montanhas;
  const base = new THREE.Color(cor);
  const neblina = new THREE.Color(paisagem.neblina.cor);
  const posicoes = [];
  const cores = [];
  const indices = [];
  for (let camada = 0; camada < 2; camada++) {
    const raio = RAIO_MONTANHAS - camada * 380;
    const escala = camada === 0 ? 1 : 0.62;
    const corCamada = base.clone().lerp(neblina, camada === 0 ? 0.45 : 0.2);
    const inicio = posicoes.length / 3;
    for (let i = 0; i <= segmentos; i++) {
      const a = (i / segmentos) * Math.PI * 2;
      const n = ruido.fbm2(Math.cos(a) * 3 + camada * 10, Math.sin(a) * 3, 5) * rugosidade;
      const h = Math.max(20, altura * escala * (0.45 + n * 1.3));
      const x = Math.sin(a) * raio;
      const z = Math.cos(a) * raio;
      posicoes.push(x, -160, z, x, h, z);
      const topo = corCamada.clone().lerp(neblina, 0.15);
      cores.push(...neblina.toArray(), ...topo.toArray());
      if (i < segmentos) {
        const k = inicio + i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.setIndex(indices);
  const malha = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  malha.renderOrder = -1;
  return malha;
}

export function criarMundo({ raiz, preset, paisagem }) {
  const renderizador = new THREE.WebGLRenderer({ antialias: preset.escala >= 0.85, powerPreference: 'high-performance' });
  renderizador.outputColorSpace = THREE.SRGBColorSpace;
  renderizador.toneMapping = THREE.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.05;
  renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
  renderizador.domElement.className = 'jogo__tela';
  raiz.append(renderizador.domElement);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, RAIO_CEU * 1.2);
  const direcaoSol = new THREE.Vector3(-0.45, 0.55, 0.7).normalize();

  const hemisferio = new THREE.HemisphereLight();
  const sol = new THREE.DirectionalLight();
  sol.shadow.camera.left = -28;
  sol.shadow.camera.right = 28;
  sol.shadow.camera.top = 28;
  sol.shadow.camera.bottom = -28;
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 260;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  cena.add(hemisferio, sol, sol.target);

  const ceu = new THREE.Mesh(new THREE.SphereGeometry(RAIO_CEU, 32, 16), null);
  ceu.renderOrder = -2;
  ceu.frustumCulled = false;
  cena.add(ceu);
  let montanhas = null;
  let ambiente = null;
  const pmrem = new THREE.PMREMGenerator(renderizador);
  let paisagemAtual = paisagem;
  let presetAtual = preset;

  function aplicarPaisagem(p) {
    paisagemAtual = p;
    ceu.material?.dispose();
    ceu.material = criarMaterialCeu(p, direcaoSol);
    const corNeblina = new THREE.Color(p.neblina.cor);
    cena.fog = new THREE.Fog(corNeblina, 60, presetAtual.distancia * 0.92);
    cena.background = corNeblina;
    hemisferio.color.set(p.luz.corCeu);
    hemisferio.groundColor.set(p.luz.corChao);
    hemisferio.intensity = p.luz.ceu;
    sol.color.set(p.ceu.sol);
    sol.intensity = p.luz.sol;
    refazerMontanhas();
    // Reflexo do carro: o céu desta paisagem e um chão escuro
    const cenaReflexo = new THREE.Scene();
    cenaReflexo.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), criarMaterialCeu(p, direcaoSol)));
    const chao = new THREE.Mesh(new THREE.CircleGeometry(90, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.grama[1]).multiplyScalar(0.5) }));
    chao.rotation.x = -Math.PI / 2;
    chao.position.y = -2;
    cenaReflexo.add(chao);
    ambiente?.dispose();
    ambiente = pmrem.fromScene(cenaReflexo, 0, 0.1, 300).texture;
    cenaReflexo.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  }

  function refazerMontanhas() {
    if (montanhas) {
      montanhas.geometry.dispose();
      montanhas.material.dispose();
      cena.remove(montanhas);
    }
    montanhas = criarMontanhas(paisagemAtual, presetAtual.montanhas);
    cena.add(montanhas);
  }

  function aplicarPreset(p) {
    const mudouMontanhas = p.montanhas !== presetAtual.montanhas;
    presetAtual = p;
    renderizador.shadowMap.enabled = p.sombras;
    sol.castShadow = p.sombras;
    if (p.sombras && sol.shadow.mapSize.x !== p.tamSombra) {
      sol.shadow.mapSize.set(p.tamSombra, p.tamSombra);
      sol.shadow.map?.dispose();
      sol.shadow.map = null;
    }
    if (cena.fog) cena.fog.far = p.distancia * 0.92;
    if (mudouMontanhas && montanhas) refazerMontanhas();
    redimensionar();
    // Materiais precisam recompilar quando as sombras ligam/desligam
    cena.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }

  function redimensionar() {
    const largura = raiz.clientWidth || innerWidth;
    const altura = raiz.clientHeight || innerHeight;
    renderizador.setPixelRatio(Math.min(devicePixelRatio || 1, presetAtual.pixelMax) * presetAtual.escala);
    renderizador.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(raiz);

  aplicarPaisagem(paisagem);
  aplicarPreset(preset);

  return {
    renderizador,
    cena,
    camera,
    sol,
    get ambiente() { return ambiente; },
    get direcaoSol() { return direcaoSol; },
    aplicarPaisagem,
    aplicarPreset,
    redimensionar,
    /** Céu, montanhas e a sombra do sol acompanham a câmera / o carro. */
    acompanhar(posCamera, posCarro) {
      ceu.position.copy(posCamera);
      montanhas.position.set(posCamera.x, posCamera.y - 40, posCamera.z);
      sol.position.copy(posCarro).addScaledVector(direcaoSol, 120);
      sol.target.position.copy(posCarro);
    },
    desenhar() {
      renderizador.render(cena, camera);
    },
    destruir() {
      observador.disconnect();
      renderizador.setAnimationLoop(null);
      cena.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose();
          o.material?.dispose?.();
        }
      });
      ambiente?.dispose();
      pmrem.dispose();
      renderizador.dispose();
      renderizador.forceContextLoss();
      renderizador.domElement.remove();
    },
  };
}
