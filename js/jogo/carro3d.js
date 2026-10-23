/**
 * Modelo 3D estilizado (feito em código, sem marca) de um carro.
 * Frente do carro = +z local. Devolve o grupo e as peças animadas:
 * rodas (giram), pivôs das dianteiras (esterçam), luzes de freio e faróis.
 */
import * as THREE from 'three';

const COMPRIMENTO = 4.3;
const LARGURA = 1.72;
const RAIO_RODA = 0.34;
export const ENTRE_EIXOS = 2.62;

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

function texturaSombra() {
  const tela = document.createElement('canvas');
  tela.width = tela.height = 128;
  const g = tela.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.6)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(tela);
}

export function criarCarro3d(carro, { ambiente } = {}) {
  const grupo = new THREE.Group();
  const carroceria = new THREE.Group(); // separado para inclinar com a suspensão
  grupo.add(carroceria);

  const pintura = new THREE.MeshPhysicalMaterial({
    color: carro.cor,
    metalness: 0.2,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMap: ambiente ?? null,
  });
  const vidro = new THREE.MeshPhysicalMaterial({ color: '#0d1418', metalness: 0.2, roughness: 0.05, clearcoat: 1, envMap: ambiente ?? null });
  const preto = new THREE.MeshStandardMaterial({ color: '#111315', roughness: 0.6 });
  const farol = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6d8', emissiveIntensity: 1.2 });
  const lanterna = new THREE.MeshStandardMaterial({ color: '#5a0000', emissive: '#ff1a1a', emissiveIntensity: 0.6 });

  // Carroceria: perfil baixo de cupê
  const corpo = new THREE.Mesh(
    perfil([[-2.12, 0.3], [1.95, 0.3], [2.16, 0.42], [2.18, 0.6], [1.9, 0.72], [0.9, 0.86], [-1.5, 0.94], [-2.08, 0.95], [-2.2, 0.72], [-2.18, 0.42]], LARGURA, 0.08),
    pintura,
  );
  // Cabine (vidros) e teto
  const cabine = new THREE.Mesh(perfil([[-1.62, 0.9], [0.95, 0.84], [0.22, 1.28], [-1.05, 1.3], [-1.7, 0.98]], LARGURA - 0.26, 0.05), vidro);
  const teto = new THREE.Mesh(perfil([[-1.02, 1.27], [0.18, 1.25], [0.12, 1.33], [-0.98, 1.34]], LARGURA - 0.3, 0.04), pintura);
  // Detalhes: grade, saias, aerofólio, faróis e lanternas
  const grade = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.05), preto);
  grade.position.set(0, 0.44, 2.17);
  const saia = new THREE.Mesh(new THREE.BoxGeometry(LARGURA - 0.1, 0.1, 3.9), preto);
  saia.position.set(0, 0.3, 0);
  const aerofolio = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.32), pintura);
  aerofolio.position.set(0, 1.08, -1.95);
  const suportes = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.06), preto);
  suportes.position.set(0, 1.0, -1.95);
  const farois = [-0.62, 0.62].map((x) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.12), farol);
    m.position.set(x, 0.63, 2.07);
    m.rotation.x = -0.35;
    return m;
  });
  // Traseira: lanternas em faixa, difusor e duas saídas de escape
  const lanternas = new THREE.Group();
  for (const x of [-0.62, 0.62]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.06), lanterna);
    l.position.set(x, 0.78, -2.27);
    lanternas.add(l);
  }
  const faixaTraseira = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.05), lanterna);
  faixaTraseira.position.set(0, 0.79, -2.27);
  const difusor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.12), preto);
  difusor.position.set(0, 0.36, -2.2);
  const cromado = new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 1, roughness: 0.2, envMap: ambiente ?? null });
  const geoEscape = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10);
  geoEscape.rotateX(Math.PI / 2);
  const escapes = [-0.4, 0.4].map((x) => {
    const m = new THREE.Mesh(geoEscape, cromado);
    m.position.set(x, 0.36, -2.27);
    return m;
  });
  carroceria.add(corpo, cabine, teto, grade, saia, aerofolio, suportes, ...farois, lanternas, faixaTraseira, difusor, ...escapes);

  // Rodas
  const pneu = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.85 });
  const aro = new THREE.MeshStandardMaterial({ color: '#c9ced3', metalness: 0.9, roughness: 0.25, envMap: ambiente ?? null });
  const geoPneu = new THREE.CylinderGeometry(RAIO_RODA, RAIO_RODA, 0.27, 18);
  geoPneu.rotateZ(Math.PI / 2);
  const geoAro = new THREE.CylinderGeometry(RAIO_RODA * 0.66, RAIO_RODA * 0.66, 0.29, 10);
  geoAro.rotateZ(Math.PI / 2);
  const geoRaio = new THREE.BoxGeometry(0.3, 0.05, RAIO_RODA * 1.25);
  const rodas = [];
  const pivos = [];
  for (const [x, z] of [[-0.86, 1.32], [0.86, 1.32], [-0.86, -1.3], [0.86, -1.3]]) {
    const pivo = new THREE.Group();
    pivo.position.set(x, RAIO_RODA, z);
    const roda = new THREE.Group();
    roda.add(new THREE.Mesh(geoPneu, pneu), new THREE.Mesh(geoAro, aro));
    for (let i = 0; i < 3; i++) {
      const raio = new THREE.Mesh(geoRaio, preto);
      raio.rotation.x = (i * Math.PI) / 3;
      roda.add(raio);
    }
    pivo.add(roda);
    grupo.add(pivo);
    rodas.push(roda);
    if (z > 0) pivos.push(pivo);
  }

  // Sombra de contato (sempre ligada, barata)
  const sombra = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 5.2),
    new THREE.MeshBasicMaterial({ map: texturaSombra(), transparent: true, depthWrite: false }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = 0.04;
  sombra.renderOrder = 1;
  grupo.add(sombra);

  grupo.traverse((o) => {
    if (o.isMesh && o !== sombra) o.castShadow = true;
  });

  return {
    grupo,
    carroceria,
    rodas,
    pivos,
    raioRoda: RAIO_RODA,
    comprimento: COMPRIMENTO,
    /** Liga/desliga a luz de freio. */
    frear(ligado) {
      lanterna.emissiveIntensity = ligado ? 3 : 0.6;
    },
    definirSombras(ligado) {
      grupo.traverse((o) => {
        if (o.isMesh && o !== sombra) o.castShadow = ligado;
      });
    },
    destruir() {
      grupo.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.map?.dispose();
          o.material.dispose();
        }
      });
    },
  };
}
