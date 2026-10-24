/**
 * Modelos reais (glTF/GLB, com compressão Draco ou Meshopt).
 *
 * O app só tenta carregar os carros listados em assets/modelos/modelos.json
 * (assim não há pedidos 404 para quem não baixou nada). Se o arquivo faltar
 * ou der erro, o carro estilizado é usado. Instruções em MODELOS.md.
 *
 * Exemplo de entrada no modelos.json:
 *   "peugeot-208": { "arquivo": "peugeot-208.glb", "rotacaoY": 0,
 *                    "pintura": ["paint", "body"], "rodas": ["wheel"] }
 */
import * as THREE from 'three';
import { criarCarro3d, FORMAS, ajustesPadrao } from './carro3d.js?v=202610240909';

const BASE = new URL('../../assets/modelos/', import.meta.url);
const DECODIFICADOR_DRACO = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/';
let manifesto = null;
let carregador = null;
const cache = new Map();

async function lerManifesto() {
  if (manifesto) return manifesto;
  try {
    const resposta = await fetch(new URL('modelos.json', BASE));
    manifesto = resposta.ok ? await resposta.json() : {};
  } catch {
    manifesto = {};
  }
  return manifesto;
}

async function obterCarregador() {
  if (carregador) return carregador;
  const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
  ]);
  carregador = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(DECODIFICADOR_DRACO);
  carregador.setDRACOLoader(draco);
  carregador.setMeshoptDecoder(MeshoptDecoder);
  return carregador;
}

/** Diz se o carro tem modelo real registrado. */
export async function temModeloReal(id) {
  return Boolean((await lerManifesto())[id]);
}

/**
 * Cria o carro: modelo real quando existir, estilizado caso contrário.
 * Sempre devolve a mesma interface de criarCarro3d.
 */
export async function criarCarro(carro, opcoes = {}) {
  const info = (await lerManifesto())[carro.id];
  if (!info) return criarCarro3d(carro, opcoes);
  try {
    const gltf = await carregarArquivo(info.arquivo);
    return montarReal(carro, gltf.scene.clone(true), info, opcoes);
  } catch (erro) {
    console.warn(`Modelo real de ${carro.nome} não carregou; usando o estilizado.`, erro);
    return criarCarro3d(carro, opcoes);
  }
}

function carregarArquivo(arquivo) {
  if (!cache.has(arquivo)) {
    cache.set(arquivo, obterCarregador().then((c) => c.loadAsync(new URL(arquivo, BASE).href)));
  }
  return cache.get(arquivo);
}

function montarReal(carro, cena, info, { ambiente = null, ajustes = ajustesPadrao(carro) } = {}) {
  const forma = FORMAS[carro.forma] ?? FORMAS.cupe;
  const grupo = new THREE.Group();
  const carroceria = new THREE.Group();
  grupo.add(carroceria);

  // Normaliza: frente para +z, comprimento parecido com o estilizado, rodas no chão
  cena.rotation.y = THREE.MathUtils.degToRad(info.rotacaoY ?? 0);
  cena.updateMatrixWorld(true);
  const caixa = new THREE.Box3().setFromObject(cena);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const escala = (info.comprimento ?? forma.entreEixos * 1.65) / Math.max(tamanho.z, 0.001);
  cena.scale.setScalar(escala);
  cena.updateMatrixWorld(true);
  caixa.setFromObject(cena);
  const centro = caixa.getCenter(new THREE.Vector3());
  cena.position.set(-centro.x, -caixa.min.y, -centro.z);
  carroceria.add(cena);

  const nomesPintura = (info.pintura ?? ['paint', 'body', 'carpaint', 'carroceria', 'exterior']).map((n) => n.toLowerCase());
  const nomesRodas = (info.rodas ?? []).map((n) => n.toLowerCase());
  const nomesLanterna = ['tail', 'brake', 'rear_light', 'lanterna'];
  const pinturas = new Set();
  const lanternas = new Set();
  const rodas = [];
  cena.traverse((o) => {
    if (nomesRodas.some((n) => o.name.toLowerCase().includes(n)) && !rodas.some((r) => r.getObjectById(o.id))) rodas.push(o);
    if (!o.isMesh) return;
    o.castShadow = true;
    const lista = Array.isArray(o.material) ? o.material : [o.material];
    o.material = lista.map((m) => {
      const copia = m.clone(); // cada carro com seus próprios materiais (a cor muda por carro)
      if (ambiente && 'envMap' in copia) copia.envMap = ambiente;
      const nome = `${m.name} ${o.name}`.toLowerCase();
      if (nomesPintura.some((n) => nome.includes(n))) pinturas.add(copia);
      if (nomesLanterna.some((n) => nome.includes(n)) && copia.emissive) lanternas.add(copia);
      return copia;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });

  let ajustesAtuais = null;
  function aplicarAjustes(novos) {
    const a = { ...ajustesPadrao(carro), ...novos };
    for (const m of pinturas) {
      m.color?.set(a.cor);
      if (a.acabamento === 'fosca') { m.roughness = 0.75; m.metalness = 0.1; }
      else if (a.acabamento === 'metalica') { m.roughness = 0.3; m.metalness = 0.6; }
      else { m.roughness = 0.3; m.metalness = 0.1; }
    }
    carroceria.position.y = a.altura * 0.05;
    ajustesAtuais = a;
  }
  aplicarAjustes(ajustes);

  return {
    grupo,
    carroceria,
    rodas, // só giram se os nomes das rodas estiverem no modelos.json
    pivos: [],
    raioRoda: forma.raio,
    entreEixos: forma.entreEixos,
    comprimento: tamanho.z * escala,
    real: true,
    get ajustes() { return ajustesAtuais; },
    aplicarAjustes,
    frear(ligado) { for (const m of lanternas) m.emissiveIntensity = ligado ? 3 : 1; },
    farois() {},
    setas() {},
    definirSombras(ligado) { cena.traverse((o) => { if (o.isMesh) o.castShadow = ligado; }); },
    destruir() {
      cena.traverse((o) => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    },
  };
}
