/**
 * Modelos 3D estilizados (feitos em código, sem marcas) dos carros do Ronco.
 * Frente do carro = +z local; o chão é y = 0.
 *
 * Cada "forma" é um perfil lateral extrudado (carroceria e cabine) com medidas
 * próprias; o F1 dos anos 80 tem um construtor à parte (rodas expostas e asas).
 * Todos devolvem a mesma interface: grupo, carroceria, rodas, pivôs, frear(),
 * aplicarAjustes() (pintura, rodas, vidros, altura) e destruir().
 */
import * as THREE from 'three';
import { construirCarroceria, pecas } from './carroceria.js?v=202610240909';
import { DESENHOS } from './desenhos.js?v=202610240909';

/* ---------- Formas de carroceria ---------- */

export const FORMAS = {
  // Cupê esportivo de motor dianteiro
  cupe: {
    largura: 1.86, entreEixos: 2.62, rodaFrente: 1.32, raio: 0.34, bitola: 0.86,
    corpo: [[-2.12, 0.3], [1.95, 0.3], [2.16, 0.42], [2.18, 0.6], [1.9, 0.72], [0.9, 0.86], [-1.5, 0.94], [-2.08, 0.95], [-2.2, 0.72], [-2.18, 0.42]],
    cabine: [[-1.62, 0.9], [0.95, 0.84], [0.22, 1.28], [-1.05, 1.3], [-1.7, 0.98]],
    aerofolio: { z: -1.95, y: 1.08, largura: 1.5 },
  },
  // Cupê de motor traseiro com traseira caída
  cupeTraseiro: {
    largura: 1.85, entreEixos: 2.45, rodaFrente: 1.3, raio: 0.34, bitola: 0.86,
    corpo: [[-2.15, 0.3], [1.95, 0.3], [2.2, 0.44], [2.2, 0.58], [1.7, 0.7], [0.75, 0.8], [-1.3, 0.88], [-2.12, 0.78], [-2.25, 0.5]],
    cabine: [[-1.85, 0.84], [0.75, 0.8], [0.05, 1.28], [-0.75, 1.3], [-2.0, 0.9]],
    aerofolio: { z: -1.95, y: 0.96, largura: 1.2 },
  },
  sedan: {
    largura: 1.9, entreEixos: 2.85, rodaFrente: 1.45, raio: 0.35, bitola: 0.88,
    corpo: [[-2.35, 0.32], [2.2, 0.32], [2.4, 0.45], [2.4, 0.7], [2.0, 0.8], [1.0, 0.9], [-1.8, 0.95], [-2.35, 0.96], [-2.43, 0.72], [-2.4, 0.45]],
    cabine: [[-1.75, 0.92], [0.95, 0.88], [0.22, 1.4], [-1.2, 1.42], [-1.9, 1.0]],
  },
  hatch: {
    largura: 1.8, entreEixos: 2.55, rodaFrente: 1.3, raio: 0.32, bitola: 0.82,
    corpo: [[-1.95, 0.32], [1.85, 0.32], [2.05, 0.45], [2.05, 0.7], [1.6, 0.82], [0.8, 0.92], [-1.9, 0.98], [-2.02, 0.75], [-2.02, 0.45]],
    cabine: [[-1.95, 0.95], [0.85, 0.9], [0.15, 1.38], [-1.7, 1.41], [-1.99, 1.18]],
  },
  // Supercarro de motor central (cabine adiantada)
  supercarro: {
    largura: 1.98, entreEixos: 2.65, rodaFrente: 1.4, raio: 0.35, bitola: 0.9,
    corpo: [[-2.22, 0.28], [2.1, 0.28], [2.3, 0.36], [2.26, 0.52], [1.2, 0.7], [-0.9, 0.84], [-2.2, 0.9], [-2.32, 0.58]],
    cabine: [[-1.25, 0.82], [0.95, 0.72], [0.0, 1.16], [-0.85, 1.18], [-1.55, 0.88]],
    aerofolio: { z: -2.05, y: 1.0, largura: 1.7 },
  },
  // Cunha baixa e anguloso (V12)
  cunha: {
    largura: 2.03, entreEixos: 2.7, rodaFrente: 1.45, raio: 0.36, bitola: 0.92,
    corpo: [[-2.3, 0.28], [2.15, 0.28], [2.38, 0.34], [2.3, 0.48], [1.1, 0.68], [-0.8, 0.82], [-2.25, 0.86], [-2.38, 0.55]],
    cabine: [[-1.05, 0.8], [1.25, 0.66], [0.15, 1.1], [-0.7, 1.12], [-1.35, 0.86]],
    aerofolio: { z: -2.1, y: 0.98, largura: 1.8 },
  },
  // Muscle car: capô longo e traseira fastback
  muscle: {
    largura: 1.92, entreEixos: 2.72, rodaFrente: 1.45, raio: 0.36, bitola: 0.88,
    corpo: [[-2.35, 0.34], [2.2, 0.34], [2.42, 0.5], [2.4, 0.8], [1.9, 0.87], [0.35, 0.94], [-1.9, 0.98], [-2.4, 0.96], [-2.45, 0.5]],
    cabine: [[-1.9, 0.95], [0.35, 0.9], [-0.35, 1.34], [-1.15, 1.36], [-2.2, 0.99]],
    aerofolio: { z: -2.3, y: 1.02, largura: 1.3, baixo: true },
  },
  f1: { largura: 2.0, entreEixos: 2.9, rodaFrente: 1.55, raio: 0.33, bitola: 0.82 },
};

export const ACABAMENTOS = [
  { id: 'metalica', nome: 'Metálica' },
  { id: 'solida', nome: 'Sólida' },
  { id: 'fosca', nome: 'Fosca' },
  { id: 'perolizada', nome: 'Perolizada' },
];

export const RODAS = [
  { id: 'esportiva', nome: 'Esportiva (5 raios)' },
  { id: 'multi', nome: 'Multirraios' },
  { id: 'classica', nome: 'Clássica' },
  { id: 'aero', nome: 'Aerodinâmica' },
];

export const CORES_RODA = ['#c9ced3', '#4a4f55', '#141516', '#c8a24a', '#e8e8e8'];

/** Ajustes padrão de um carro (cada carro guarda os seus na garagem). */
export const ajustesPadrao = (carro) => ({
  cor: carro.cor,
  acabamento: carro.acabamento ?? 'metalica',
  roda: carro.roda ?? 'esportiva',
  corRoda: carro.corRoda ?? '#c9ced3',
  vidro: 1,
  altura: 0,
});

/* ---------- Peças ---------- */

/** Extruda um perfil lateral (x = comprimento, y = altura) com a largura dada, centrado. */
function perfil(pontos, largura, chanfro = 0.06) {
  const forma = new THREE.Shape(pontos.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: largura - chanfro * 2,
    bevelEnabled: true,
    bevelThickness: chanfro,
    bevelSize: chanfro,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -(largura - chanfro * 2) / 2);
  geo.rotateY(-Math.PI / 2); // comprimento passa a ser o eixo z
  geo.computeVertexNormals();
  return geo;
}

let texturaSombraCache = null;
function texturaSombra() {
  if (texturaSombraCache) return texturaSombraCache;
  const tela = document.createElement('canvas');
  tela.width = tela.height = 128;
  const g = tela.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.6)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  texturaSombraCache = new THREE.CanvasTexture(tela);
  return texturaSombraCache;
}

/** Ajusta o material da pintura conforme o acabamento escolhido. */
function aplicarAcabamento(m, acabamento) {
  const valores = {
    metalica: { metalness: 0.55, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 0 },
    solida: { metalness: 0.05, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0 },
    fosca: { metalness: 0.1, roughness: 0.78, clearcoat: 0, clearcoatRoughness: 1, iridescence: 0 },
    perolizada: { metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1 },
  }[acabamento] ?? {};
  const mudouIridescencia = (m.iridescence > 0) !== (valores.iridescence > 0);
  Object.assign(m, valores);
  m.iridescenceIOR = 1.45;
  m.iridescenceThicknessRange = [180, 520];
  if (mudouIridescencia) m.needsUpdate = true;
}

/** Monta o aro de uma roda no estilo pedido (o pneu é separado). */
function montarAro(estilo, raio, largura, materiais) {
  const aro = new THREE.Group();
  const r = raio * 0.68;
  const disco = new THREE.CylinderGeometry(r, r, largura + 0.02, 18);
  disco.rotateZ(Math.PI / 2);
  const face = new THREE.Mesh(disco, estilo === 'aero' ? materiais.aro : materiais.escuro);
  aro.add(face);
  const borda = new THREE.TorusGeometry(r * 0.96, 0.025, 6, 24);
  borda.rotateY(Math.PI / 2);
  for (const lado of [-1, 1]) {
    const b = new THREE.Mesh(borda, materiais.aro);
    b.position.x = lado * (largura / 2 + 0.01);
    aro.add(b);
  }
  const raios = { esportiva: 5, multi: 10, classica: 0, aero: 0 }[estilo] ?? 5;
  if (raios) {
    const espessura = estilo === 'multi' ? 0.028 : 0.06;
    const geo = new THREE.BoxGeometry(largura + 0.04, espessura, r * 1.9);
    for (let i = 0; i < raios; i++) {
      const raioMalha = new THREE.Mesh(geo, materiais.aro);
      raioMalha.rotation.x = (i * Math.PI) / raios;
      aro.add(raioMalha);
    }
  }
  if (estilo === 'classica') {
    // Disco com furos (estilo anos 80/90)
    const furo = new THREE.CylinderGeometry(r * 0.17, r * 0.17, largura + 0.05, 10);
    furo.rotateZ(Math.PI / 2);
    const prato = new THREE.Mesh(disco, materiais.aro);
    prato.scale.set(1.01, 0.97, 0.97);
    aro.add(prato);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(furo, materiais.escuro);
      const a = (i / 6) * Math.PI * 2;
      f.position.set(0, Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
      aro.add(f);
    }
  }
  if (estilo === 'aero') {
    const anel = new THREE.TorusGeometry(r * 0.55, 0.02, 6, 24);
    anel.rotateY(Math.PI / 2);
    for (const lado of [-1, 1]) {
      const a = new THREE.Mesh(anel, materiais.escuro);
      a.position.x = lado * (largura / 2 + 0.015);
      aro.add(a);
    }
  }
  // Cubo central
  const cubo = new THREE.CylinderGeometry(r * 0.2, r * 0.2, largura + 0.06, 10);
  cubo.rotateZ(Math.PI / 2);
  aro.add(new THREE.Mesh(cubo, materiais.escuro));
  return aro;
}

/* ---------- Construtor principal ---------- */

export function criarCarro3d(carro, { ambiente = null, ajustes = ajustesPadrao(carro) } = {}) {
  const forma = FORMAS[carro.forma] ?? FORMAS.cupe;
  const grupo = new THREE.Group();
  const carroceria = new THREE.Group(); // separado para inclinar com a suspensão
  grupo.add(carroceria);

  const materiais = {
    pintura: new THREE.MeshPhysicalMaterial({ color: ajustes.cor, envMap: ambiente }),
    vidro: new THREE.MeshPhysicalMaterial({ color: '#0b1216', metalness: 0.1, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.7, envMap: ambiente }),
    preto: new THREE.MeshStandardMaterial({ color: '#111315', roughness: 0.6 }),
    interior: new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.9 }),
    farol: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6d8', emissiveIntensity: 1.2 }),
    lanterna: new THREE.MeshStandardMaterial({ color: '#5a0000', emissive: '#ff1a1a', emissiveIntensity: 0.6 }),
    setaEsquerda: new THREE.MeshStandardMaterial({ color: '#6b3a00', emissive: '#ff9a1a', emissiveIntensity: 0 }),
    setaDireita: new THREE.MeshStandardMaterial({ color: '#6b3a00', emissive: '#ff9a1a', emissiveIntensity: 0 }),
    cromado: new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 1, roughness: 0.2, envMap: ambiente }),
    pneu: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.88 }),
    aro: new THREE.MeshStandardMaterial({ color: ajustes.corRoda, metalness: 0.9, roughness: 0.25, envMap: ambiente }),
    escuro: new THREE.MeshStandardMaterial({ color: '#202225', metalness: 0.4, roughness: 0.5 }),
    amarelo: new THREE.MeshPhysicalMaterial({ color: '#ffdf00', metalness: 0.1, roughness: 0.35, clearcoat: 1, envMap: ambiente }),
    azul: new THREE.MeshPhysicalMaterial({ color: '#0b3fa8', metalness: 0.1, roughness: 0.35, clearcoat: 1, envMap: ambiente }),
  };

  const desenho = carro.forma !== 'f1' ? DESENHOS[carro.id] : null;
  let medidas;
  if (carro.forma === 'f1') medidas = montarF1(carroceria, materiais);
  else if (desenho) medidas = montarDesenho(carroceria, desenho, materiais);
  else medidas = montarCarroceria(carroceria, forma, materiais);
  // Medidas das rodas: do desenho (reais) ou da forma genérica
  const geo = medidas.rodas ?? {
    raio: forma.raio, entreEixos: forma.entreEixos,
    posicoes: [[-forma.bitola, forma.rodaFrente, true], [forma.bitola, forma.rodaFrente, true], [-forma.bitola, forma.rodaFrente - forma.entreEixos, false], [forma.bitola, forma.rodaFrente - forma.entreEixos, false]],
  };
  // Elétrico não tem escapamento
  if (carro.motor === 'eletrico') carroceria.children.filter((o) => o.name === 'escape').forEach((o) => carroceria.remove(o));

  /* ---------- Rodas ---------- */
  const rodas = [];
  const pivos = [];
  const posicoes = geo.posicoes;
  const f1 = carro.forma === 'f1';
  for (const [x, z, dianteira] of posicoes) {
    const raio = f1 && !dianteira ? geo.raio * 1.08 : geo.raio;
    const largura = f1 ? (dianteira ? 0.3 : 0.42) : 0.26;
    const pivo = new THREE.Group();
    pivo.position.set(x, raio, z);
    const roda = new THREE.Group();
    const geoPneu = new THREE.CylinderGeometry(raio, raio, largura, 22);
    geoPneu.rotateZ(Math.PI / 2);
    roda.add(new THREE.Mesh(geoPneu, materiais.pneu));
    roda.userData = { raio, largura };
    pivo.add(roda);
    grupo.add(pivo);
    rodas.push(roda);
    if (dianteira) pivos.push(pivo);
  }

  function trocarAros(estilo) {
    for (const roda of rodas) {
      const antigo = roda.getObjectByName('aro');
      if (antigo) {
        roda.remove(antigo);
        antigo.traverse((o) => o.geometry?.dispose());
      }
      const aro = montarAro(estilo, roda.userData.raio, roda.userData.largura, materiais);
      aro.name = 'aro';
      aro.traverse((o) => { if (o.isMesh) o.castShadow = sombrasLigadas; });
      roda.add(aro);
    }
  }

  // Sombra de contato (sempre ligada, barata)
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(forma.largura + 0.8, medidas.comprimento + 0.9),
    new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.04;
  sombra.renderOrder = 1;
  grupo.add(sombra);

  let sombrasLigadas = true;
  let ajustesAtuais = null;
  const alturaBase = 0;

  function aplicarAjustes(novos) {
    const a = { ...ajustesPadrao(carro), ...novos };
    if (!ajustesAtuais || a.roda !== ajustesAtuais.roda) trocarAros(a.roda);
    materiais.pintura.color.set(a.cor);
    aplicarAcabamento(materiais.pintura, a.acabamento);
    materiais.aro.color.set(a.corRoda === 'carroceria' ? a.cor : a.corRoda);
    // Vidro: 0 = claro, 3 = bem escurecido
    const nivel = Math.max(0, Math.min(3, Math.round(a.vidro)));
    materiais.vidro.opacity = [0.42, 0.66, 0.84, 0.95][nivel];
    materiais.vidro.color.set(['#2a3a44', '#14202a', '#0b1216', '#050708'][nivel]);
    // Altura da suspensão: −1 (rebaixado) a +1 (elevado)
    carroceria.position.y = alturaBase + a.altura * (f1 ? 0.015 : 0.05);
    ajustesAtuais = a;
  }
  aplicarAjustes(ajustes);

  grupo.traverse((o) => {
    if (o.isMesh && o !== sombra) o.castShadow = true;
  });

  return {
    grupo,
    carroceria,
    rodas,
    pivos,
    raioRoda: geo.raio,
    entreEixos: geo.entreEixos,
    comprimento: medidas.comprimento,
    cockpit: f1 ? [0, 0.86, 0.3] : medidas.cockpit ?? [0.36, 1.08, -0.2],
    capo: f1 ? 0.92 : medidas.capo ?? 1.22,
    get ajustes() { return ajustesAtuais; },
    aplicarAjustes,
    /** Liga/desliga a luz de freio. */
    frear(ligado) {
      materiais.lanterna.emissiveIntensity = ligado ? 3 : 0.6;
    },
    /** Pisca das setas: acende/apaga cada lado. */
    setas(esquerda, direita) {
      materiais.setaEsquerda.emissiveIntensity = esquerda ? 2.5 : 0;
      materiais.setaDireita.emissiveIntensity = direita ? 2.5 : 0;
    },
    /** Intensidade dos faróis (0 = apagados), para a noite. */
    farois(intensidade) {
      materiais.farol.emissiveIntensity = intensidade;
    },
    definirSombras(ligado) {
      sombrasLigadas = ligado;
      grupo.traverse((o) => {
        if (o.isMesh && o !== sombra) o.castShadow = ligado;
      });
    },
    destruir() {
      grupo.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
      sombra.material.dispose();
      Object.values(materiais).forEach((m) => m.dispose());
    },
  };
}

/* ---------- Carros de rua (perfil extrudado) ---------- */

function montarCarroceria(carroceria, forma, m) {
  const xs = forma.corpo.map(([x]) => x);
  const frente = Math.max(...xs);
  const tras = Math.min(...xs);
  const L = forma.largura;
  const corpo = new THREE.Mesh(perfil(forma.corpo, L - 0.14, 0.08), m.pintura);
  const cabine = new THREE.Mesh(perfil(forma.cabine, L - 0.4, 0.05), m.vidro);
  // Teto: chapa pintada sobre os dois pontos mais altos da cabine
  const [, , a, b] = forma.cabine;
  const tetoPerfil = [[b[0] + 0.02, b[1] - 0.03], [a[0] - 0.04, a[1] - 0.03], [a[0] - 0.08, a[1] + 0.05], [b[0] + 0.05, b[1] + 0.05]];
  const teto = new THREE.Mesh(perfil(tetoPerfil, L - 0.44, 0.04), m.pintura);
  // Interior escuro (aparece pelos vidros claros): bancos e painel
  const baseCabine = Math.min(...forma.cabine.map(([, y]) => y));
  const zCabine = (Math.max(...forma.cabine.map(([x]) => x)) + Math.min(...forma.cabine.map(([x]) => x))) / 2;
  const interior = new THREE.Group();
  for (const x of [-0.38, 0.38]) {
    const banco = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.18), m.interior);
    banco.position.set(x, baseCabine + 0.2, zCabine - 0.35);
    banco.rotation.x = -0.18;
    interior.add(banco);
  }
  const painel = new THREE.Mesh(new THREE.BoxGeometry(L - 0.5, 0.18, 0.35), m.interior);
  painel.position.set(0, baseCabine + 0.05, zCabine + 0.55);
  interior.add(painel);
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 16), m.preto);
  volante.position.set(0.38, baseCabine + 0.22, zCabine + 0.3);
  volante.rotation.x = -0.4;
  interior.add(volante);

  const grade = new THREE.Mesh(new THREE.BoxGeometry(L * 0.52, 0.14, 0.05), m.preto);
  grade.position.set(0, 0.44, frente - 0.01);
  const saia = new THREE.Mesh(new THREE.BoxGeometry(L - 0.24, 0.1, (frente - tras) * 0.9), m.preto);
  saia.position.set(0, 0.3, (frente + tras) / 2);

  const alturaFarol = forma.corpo.find(([x, y]) => x === frente)?.[1] ?? 0.6;
  const farois = [-1, 1].map((lado) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(L * 0.2, 0.09, 0.12), m.farol);
    f.position.set(lado * L * 0.33, Math.min(0.66, alturaFarol + 0.02), frente - 0.1);
    f.rotation.x = -0.35;
    return f;
  });
  const alturaTraseira = Math.max(...forma.corpo.filter(([x]) => x < tras + 0.3).map(([, y]) => y));
  const lanternas = [-1, 1].map((lado) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(L * 0.22, 0.11, 0.06), m.lanterna);
    l.position.set(lado * L * 0.33, alturaTraseira - 0.17, tras - 0.04);
    return l;
  });
  const faixa = new THREE.Mesh(new THREE.BoxGeometry(L * 0.42, 0.04, 0.05), m.lanterna);
  faixa.position.set(0, alturaTraseira - 0.16, tras - 0.04);
  const difusor = new THREE.Mesh(new THREE.BoxGeometry(L * 0.75, 0.16, 0.12), m.preto);
  difusor.position.set(0, 0.36, tras + 0.06);
  const geoEscape = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10);
  geoEscape.rotateX(Math.PI / 2);
  const escapes = [-0.4, 0.4].map((x) => {
    const e = new THREE.Mesh(geoEscape, m.cromado);
    e.name = 'escape';
    e.position.set(x, 0.36, tras - 0.04);
    return e;
  });
  // Setas nos quatro cantos (esquerda do motorista = +x local)
  const setas = [];
  for (const [lado, material] of [[1, m.setaEsquerda], [-1, m.setaDireita]]) {
    for (const [z, y] of [[frente - 0.14, Math.min(0.6, alturaFarol)], [tras - 0.03, alturaTraseira - 0.3]]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), material);
      s.position.set(lado * (L / 2 - 0.13), y, z);
      setas.push(s);
    }
  }
  carroceria.add(corpo, cabine, teto, interior, grade, saia, ...farois, ...lanternas, faixa, difusor, ...escapes, ...setas);

  if (forma.aerofolio) {
    const { z, y, largura, baixo } = forma.aerofolio;
    const asa = new THREE.Mesh(new THREE.BoxGeometry(largura, 0.05, baixo ? 0.18 : 0.32), m.pintura);
    asa.position.set(0, y, z);
    carroceria.add(asa);
    if (!baixo) {
      const suportes = new THREE.Mesh(new THREE.BoxGeometry(largura * 0.65, 0.14, 0.06), m.preto);
      suportes.position.set(0, y - 0.08, z);
      carroceria.add(suportes);
    }
  }
  return { comprimento: frente - tras };
}

/* ---------- F1 dos anos 80 nas cores do Brasil (sem marcas, capacete genérico) ---------- */

function montarF1(carroceria, m) {
  const g = (geo, mat, x, y, z) => {
    const malha = new THREE.Mesh(geo, mat);
    malha.position.set(x, y, z);
    carroceria.add(malha);
    return malha;
  };
  // Monocoque e bico
  const monocoque = perfil([[-0.6, 0.12], [1.3, 0.14], [2.45, 0.2], [2.5, 0.3], [1.3, 0.5], [0.25, 0.62], [-0.6, 0.66]], 0.62, 0.06);
  g(monocoque, m.pintura, 0, 0, 0);
  // Faixa amarela no bico
  g(new THREE.BoxGeometry(0.2, 0.02, 1.1), m.amarelo, 0, 0.41, 1.75).rotation.x = 0.17;
  // Laterais (sidepods)
  const sidepod = perfil([[-1.4, 0.12], [0.55, 0.12], [0.62, 0.42], [-0.3, 0.52], [-1.5, 0.42]], 0.42, 0.06);
  for (const lado of [-1, 1]) {
    g(sidepod, m.pintura, lado * 0.5, 0, 0);
    g(new THREE.BoxGeometry(0.03, 0.08, 1.7), m.amarelo, lado * 0.72, 0.33, -0.45);
  }
  // Tampa do motor e entrada de ar
  const tampa = perfil([[-1.9, 0.18], [-0.35, 0.5], [-0.15, 0.82], [-0.6, 0.86], [-1.95, 0.48]], 0.5, 0.05);
  g(tampa, m.pintura, 0, 0, 0);
  // Cockpit aberto, piloto com capacete genérico (branco, viseira escura)
  g(new THREE.BoxGeometry(0.44, 0.08, 0.7), m.preto, 0, 0.62, 0.35);
  const capacete = g(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshStandardMaterial({ color: '#eeeeee', roughness: 0.3 }), 0, 0.78, 0.1);
  capacete.scale.set(1, 1.05, 1.1);
  g(new THREE.BoxGeometry(0.2, 0.06, 0.05), m.preto, 0, 0.8, 0.24);
  // Asa dianteira e traseira (azul)
  g(new THREE.BoxGeometry(1.75, 0.04, 0.42), m.azul, 0, 0.12, 2.35);
  for (const lado of [-1, 1]) g(new THREE.BoxGeometry(0.03, 0.2, 0.46), m.azul, lado * 0.88, 0.18, 2.35);
  g(new THREE.BoxGeometry(1.05, 0.05, 0.42), m.azul, 0, 0.98, -2.0);
  g(new THREE.BoxGeometry(1.05, 0.04, 0.3), m.azul, 0, 0.86, -2.05);
  for (const lado of [-1, 1]) g(new THREE.BoxGeometry(0.03, 0.62, 0.62), m.pintura, lado * 0.53, 0.68, -2.0);
  g(new THREE.BoxGeometry(0.08, 0.5, 0.12), m.preto, 0, 0.62, -1.9);
  // Braços da suspensão
  const braco = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5);
  braco.rotateZ(Math.PI / 2);
  for (const z of [1.55, -1.35]) for (const y of [0.22, 0.36]) g(braco, m.preto, 0, y, z).scale.set(1, z > 0 ? 0.95 : 0.75, 1);
  // Luz de chuva traseira (usa o material da lanterna)
  g(new THREE.BoxGeometry(0.12, 0.08, 0.04), m.lanterna, 0, 0.3, -2.12);
  // Faróis não existem num F1: o material fica sem peças
  return { comprimento: 4.6 };
}

/* ---------- Carros com desenho próprio (carroceria por seções) ---------- */

function montarDesenho(carroceria, d, m) {
  const c = construirCarroceria(d, m);
  carroceria.add(c.grupo);
  const W = d.largura;
  const L = d.comprimento;
  const add = (geo, mat, x, y, z) => {
    const malha = new THREE.Mesh(geo, mat);
    malha.position.set(x, y, z);
    c.grupo.add(malha);
    return malha;
  };
  const espelhar = (fn) => [-1, 1].map(fn);

  /* Faróis */
  const f = d.farol;
  const xf = (f.x * W) / 2;
  if (f.tipo === 'lamina') {
    espelhar((s) => c.colar(pecas.lamina(f.l, f.a, -s * (f.angulo ?? 0)), m.farol, s * xf, f.y, 1));
    if (f.faixaCentral) c.colar(pecas.retangulo(W * 0.62, 0.015), m.farol, 0, f.y + 0.03, 1);
  } else if (f.tipo === 'redondo') {
    espelhar((s) => {
      c.colar(pecas.redondo(f.r + 0.015), m.escuro, s * xf, f.y, 1, 0.002);
      c.colar(pecas.redondo(f.r), m.farol, s * xf, f.y, 1, 0.012);
    });
  } else if (f.tipo === 'y') {
    espelhar((s) => {
      c.colar(pecas.lamina(f.l, 0.04, -s * 0.35), m.farol, s * xf, f.y + 0.03, 1);
      c.colar(pecas.lamina(f.l * 0.55, 0.04, s * 0.5), m.farol, s * (xf - 0.08), f.y - 0.04, 1);
    });
  } else if (f.tipo === 'garra') {
    // Farol fino + três "garras" de luz diurna descendo
    espelhar((s) => {
      c.colar(pecas.lamina(0.36, 0.06, -s * 0.12), m.farol, s * xf, f.y, 1);
      for (let i = 0; i < 3; i++) c.colar(pecas.lamina(0.03, 0.2, s * 0.25), m.farol, s * (xf - 0.1 + i * 0.07), f.y - 0.2, 1);
    });
  } else if (f.tipo === 'quatroPontos') {
    espelhar((s) => {
      c.colar(pecas.redondo(0.1), m.escuro, s * xf, f.y, 1, 0.002);
      for (const [dx, dy] of [[-0.04, 0.04], [0.04, 0.04], [-0.04, -0.04], [0.04, -0.04]]) c.colar(pecas.retangulo(0.04, 0.025), m.farol, s * xf + dx, f.y + dy, 1, 0.012);
    });
  }

  /* Grade e entrada de ar inferior */
  const g = d.grade;
  if (g) {
    if (g.tipo === 'larga') c.colar(pecas.retangulo(g.l, g.a), m.escuro, 0, g.y, 1);
    else if (g.tipo === 'rins') espelhar((s) => c.colar(pecas.hexagono(g.l, g.a), m.escuro, s * g.x, g.y, 1));
    else if (g.tipo === 'hexagono' || g.tipo === 'trapezio') c.colar(pecas.hexagono(g.l, g.a), m.escuro, 0, g.y, 1);
    else if (g.tipo === 'barras') {
      c.colar(pecas.hexagono(g.l, g.a), m.escuro, 0, g.y, 1);
      for (let i = 0; i < g.barras; i++) c.colar(pecas.retangulo(0.018, g.a * 0.8), m.cromado, -g.l * 0.38 + (i * g.l * 0.76) / (g.barras - 1), g.y, 1, 0.014);
    }
    if (g.fioVermelho) c.colar(pecas.retangulo(g.l * 1.1, 0.012), m.lanterna, 0, g.y - 0.03, 1, 0.012);
  }
  if (d.entrada) c.colar(pecas.retangulo(d.entrada.l, d.entrada.a), m.escuro, 0, d.entrada.y, 1);

  /* Lanternas (usam o material da luz de freio) */
  const l = d.lanterna;
  if (l.tipo === 'faixa') {
    c.colar(pecas.retangulo(l.l, l.a), m.lanterna, 0, l.y, -1);
  } else if (l.tipo === 'lamina') {
    espelhar((s) => c.colar(pecas.lamina(l.l, l.a, s * (l.angulo ?? 0)), m.lanterna, s * W * 0.31, l.y, -1));
  } else if (l.tipo === 'l') {
    espelhar((s) => {
      c.colar(pecas.retangulo(l.l, 0.04), m.lanterna, s * W * 0.31, l.y + 0.03, -1);
      c.colar(pecas.retangulo(0.04, l.a), m.lanterna, s * (W * 0.31 + l.l / 2 - 0.02), l.y, -1);
    });
  } else if (l.tipo === 'tribarra') {
    espelhar((s) => { for (let i = 0; i < 3; i++) c.colar(pecas.retangulo(0.045, 0.16), m.lanterna, s * ((l.x * W) / 2 - 0.08 + i * 0.08), l.y, -1); });
  } else if (l.tipo === 'duploRedondo') {
    espelhar((s) => { for (const dx of [-0.08, 0.08]) c.colar(pecas.redondo(l.r), m.lanterna, s * ((l.x * W) / 2 + dx), l.y, -1); });
  } else if (l.tipo === 'y') {
    espelhar((s) => {
      c.colar(pecas.lamina(l.l, 0.035, s * 0.35), m.lanterna, (s * l.x * W) / 2, l.y + 0.03, -1);
      c.colar(pecas.lamina(l.l * 0.55, 0.035, -s * 0.5), m.lanterna, s * ((l.x * W) / 2 - 0.08), l.y - 0.04, -1);
    });
  } else if (l.tipo === 'garraTraseira') {
    // Faixa preta de lado a lado com três "garras" em cada lanterna
    c.colar(pecas.retangulo(W * 0.78, 0.16), m.escuro, 0, l.y, -1, 0.002);
    espelhar((s) => { for (let i = 0; i < 3; i++) c.colar(pecas.lamina(0.16, 0.025, s * 0.25), m.lanterna, s * W * 0.31, l.y + 0.05 - i * 0.05, -1, 0.012); });
  }
  // Difusor
  c.colar(pecas.retangulo(W * 0.62, 0.12), m.escuro, 0, c.base(0.04) + 0.1, -1);

  /* Setas (laranja) nos quatro cantos; esquerda do motorista = +x local */
  for (const [s, mat] of [[1, m.setaEsquerda], [-1, m.setaDireita]]) {
    c.colar(pecas.retangulo(0.1, 0.035), mat, s * W * 0.36, f.y - 0.07, 1, 0.012);
    c.colar(pecas.retangulo(0.1, 0.035), mat, s * W * 0.36, (l.y ?? 0.85) - 0.09, -1, 0.012);
  }

  /* Escapes */
  const e = d.escapes ?? { tipo: 'duplo', y: 0.36 };
  const escape = (x, y, r = 0.045) => {
    c.colar(pecas.redondo(r, 0.08), m.cromado, x, y, -1, 0.02).name = 'escape';
    c.colar(pecas.redondo(r * 0.7, 0.08), m.preto, x, y, -1, 0.03).name = 'escape';
  };
  const ye = e.y ?? 0.36;
  if (e.tipo === 'duplo') espelhar((s) => escape(s * W * 0.3, ye));
  else if (e.tipo === 'quatro') espelhar((s) => { escape(s * W * 0.27, ye); escape(s * W * 0.34, ye); });
  else if (e.tipo === 'duploCentro') { escape(-0.08, ye); escape(0.08, ye); }
  else if (e.tipo === 'central') c.colar(pecas.hexagono(0.22, 0.12, 0.08), m.cromado, 0, ye, -1, 0.02).name = 'escape';
  else if (e.tipo === 'simples') escape(-W * 0.3, ye);

  /* Entradas de ar laterais (supercarros) */
  if (d.lateral) {
    const { t0, t1, y0, y1 } = d.lateral;
    const tm = (t0 + t1) / 2;
    const ym = (y0 + y1) / 2;
    espelhar((s) => {
      const x = s * (c.lateralX(tm, ym) - 0.004);
      const malha = add(new THREE.BoxGeometry(0.03, y1 - y0, (t1 - t0) * L), m.escuro, x, ym, c.zDe(tm));
      malha.rotation.y = s * 0.04;
    });
  }

  /* Aerofólio */
  const a = d.aerofolio?.tipo;
  if (a === 'labio') add(new THREE.BoxGeometry(W * 0.5, 0.03, 0.12), m.pintura, 0, c.topo(0.035) + 0.015, c.zDe(0.035));
  else if (a === 'asa') {
    add(new THREE.BoxGeometry(W * 0.86, 0.04, 0.3), m.escuro, 0, d.aerofolio.y, c.zDe(0.06));
    espelhar((s) => add(new THREE.BoxGeometry(0.04, d.aerofolio.y - c.topo(0.06), 0.1), m.escuro, s * W * 0.25, (d.aerofolio.y + c.topo(0.06)) / 2, c.zDe(0.06)));
  } else if (a === 'teto') {
    const tA = d.estufa.teto[0][0];
    add(new THREE.BoxGeometry(W * 0.6, 0.04, 0.22), m.pintura, 0, c.teto(tA + 0.06) + 0.01, c.zDe(tA + 0.03));
  }

  /* Espelhos retrovisores (na base do para-brisa) */
  const tPara = d.estufa.teto[d.estufa.teto.length - 1][0];
  const yEsp = c.topo(tPara) + 0.1;
  espelhar((s) => {
    const x = s * (c.lateralX(tPara - 0.02, yEsp - 0.12) + 0.06);
    add(new THREE.BoxGeometry(0.16, 0.09, 0.07), m.pintura, x, yEsp, c.zDe(tPara - 0.03));
    add(new THREE.BoxGeometry(0.1, 0.03, 0.03), m.preto, x - s * 0.08, yEsp - 0.02, c.zDe(tPara - 0.03));
  });

  /* Interior: bancos, painel e volante (aparecem pelos vidros) */
  const zPara = c.zDe(tPara);
  const yCintura = c.topo(tPara);
  for (const x of [-0.38, 0.38]) {
    const banco = add(new THREE.BoxGeometry(0.46, 0.55, 0.16), m.interior, x, yCintura - 0.12, zPara - 1.0);
    banco.rotation.x = -0.2;
  }
  add(new THREE.BoxGeometry(W * 0.7, 0.16, 0.4), m.interior, 0, yCintura - 0.14, zPara - 0.45);
  const volante = add(new THREE.TorusGeometry(0.17, 0.025, 6, 16), m.preto, 0.38, yCintura - 0.02, zPara - 0.7);
  volante.rotation.x = -0.45;

  /* Rodas: posição real (entre-eixos e balanços) e caixas de roda escuras */
  const zF = L / 2 - d.balancoF;
  const zR = -L / 2 + d.balancoT;
  const r = d.raio;
  const posicoes = [];
  for (const [z, dianteira] of [[zF, true], [zR, false]]) {
    const t = (z + L / 2) / L;
    const xLado = c.lateralX(t, r + 0.12);
    for (const s of [-1, 1]) {
      posicoes.push([s * (xLado - 0.1), z, dianteira]);
      // "Caixa de roda": disco escuro na lateral, atrás do pneu
      const caixa = add(new THREE.CircleGeometry(r + 0.06, 24), m.preto, s * (c.lateralX(t, r) + 0.004), r, z);
      caixa.rotation.y = (s * Math.PI) / 2;
    }
  }

  return {
    comprimento: L,
    rodas: { raio: r, entreEixos: zF - zR, posicoes },
    cockpit: [0.38, yCintura + 0.22, zPara - 0.85],
    capo: c.topo(0.85) + 0.32,
  };
}
