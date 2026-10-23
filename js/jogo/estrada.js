/**
 * Estrada 3D em pedaços (chunks) de 100 m: pista, acostamento, terreno dos dois
 * lados, vegetação e balizadores. Os pedaços ficam num "estoque" (pooling):
 * quando um fica para trás, a geometria dele é reescrita lá na frente,
 * sem criar nem destruir objetos durante o jogo.
 */
import * as THREE from 'three';
import { PASSO, MEIA_LARGURA, ACOSTAMENTO } from './tracado.js?v=202610231819';
import { geradorComSemente } from '../nucleo/util.js?v=202610231819';

export const COMPRIMENTO = 100;
const SEGMENTOS = COMPRIMENTO / PASSO; // 50 fatias por pedaço
const LINHAS = SEGMENTOS + 1;
const BORDA = MEIA_LARGURA + ACOSTAMENTO;
/** Distâncias (m) a partir da beira da pista onde ficam as colunas do terreno. */
const COLUNAS = [0, 2.5, 6, 14, 30, 60, 100, 150];
const NC = COLUNAS.length;
const REPETICAO_TEXTURA = 24; // a textura da pista se repete a cada 24 m
const MAX_ARVORES = 160;
const BALIZAS = (COMPRIMENTO / 20) * 2;

/* ---------- Textura do asfalto (desenhada em canvas) ---------- */

function criarTexturaAsfalto(paisagem, renderizador) {
  const L = 256;
  const A = 512;
  const tela = document.createElement('canvas');
  tela.width = L;
  tela.height = A;
  const g = tela.getContext('2d');
  const m = L / (2 * BORDA); // pixels por metro na largura
  const pm = A / REPETICAO_TEXTURA; // pixels por metro no comprimento
  const X = (metros) => (metros + BORDA) * m;
  // Acostamento e asfalto
  g.fillStyle = paisagem.acostamento;
  g.fillRect(0, 0, L, A);
  g.fillStyle = paisagem.asfalto;
  g.fillRect(X(-MEIA_LARGURA), 0, MEIA_LARGURA * 2 * m, A);
  // Granulado do asfalto
  const aleatorio = geradorComSemente(3);
  for (let i = 0; i < 9000; i++) {
    const claro = aleatorio() < 0.5;
    g.fillStyle = claro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    g.fillRect(aleatorio() * L, aleatorio() * A, 1 + aleatorio() * 1.5, 1 + aleatorio() * 1.5);
  }
  // Marcas de pneu nas faixas
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (const centro of [-5.4, -1.8, 1.8, 5.4]) {
    g.fillRect(X(centro - 0.95), 0, 0.5 * m, A);
    g.fillRect(X(centro + 0.45), 0, 0.5 * m, A);
  }
  // Faixas brancas das bordas
  g.fillStyle = '#e9ecef';
  g.fillRect(X(-MEIA_LARGURA + 0.15), 0, 0.18 * m, A);
  g.fillRect(X(MEIA_LARGURA - 0.33), 0, 0.18 * m, A);
  // Tracejado entre as faixas de mesmo sentido (4 m pintado, 8 m vazio)
  for (const x of [-3.6, 3.6]) {
    g.fillRect(X(x - 0.075), 0, 0.15 * m, 4 * pm);
    g.fillRect(X(x - 0.075), 12 * pm, 0.15 * m, 4 * pm);
  }
  // Linha dupla amarela no centro
  g.fillStyle = '#f4c20d';
  g.fillRect(X(-0.22), 0, 0.13 * m, A);
  g.fillRect(X(0.09), 0, 0.13 * m, A);
  const textura = new THREE.CanvasTexture(tela);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = THREE.ClampToEdgeWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.anisotropy = Math.min(8, renderizador.capabilities.getMaxAnisotropy());
  return textura;
}

/* ---------- Geometrias compartilhadas da vegetação ---------- */

function geometriasVegetacao(tipo) {
  if (tipo === 'pinheiro') {
    const perto = new THREE.ConeGeometry(1.6, 4.2, 7);
    perto.translate(0, 4.6, 0);
    const extra = new THREE.ConeGeometry(1.15, 3, 7);
    extra.translate(0, 6.6, 0);
    const juntas = mesclar([perto, extra]);
    const longe = new THREE.ConeGeometry(1.6, 6.5, 4);
    longe.translate(0, 5.2, 0);
    const tronco = new THREE.CylinderGeometry(0.18, 0.28, 2.8, 5);
    tronco.translate(0, 1.4, 0);
    return { copaPerto: juntas, copaLonge: longe, tronco };
  }
  const perto = new THREE.IcosahedronGeometry(2.2, 1);
  perto.translate(0, 4.2, 0);
  const longe = new THREE.IcosahedronGeometry(2.2, 0);
  longe.translate(0, 4.2, 0);
  const tronco = new THREE.CylinderGeometry(0.2, 0.3, 3, 5);
  tronco.translate(0, 1.5, 0);
  return { copaPerto: perto, copaLonge: longe, tronco };
}

/** Junta geometrias não indexadas simples (sem depender dos addons). */
function mesclar(lista) {
  const partes = lista.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = partes.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of partes) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return r;
}

/* ---------- Índices fixos (iguais para todos os pedaços) ---------- */

function indicesGrade(colunas, pular = -1) {
  const indices = [];
  for (let i = 0; i < SEGMENTOS; i++) {
    for (let j = 0; j < colunas - 1; j++) {
      if (j === pular) continue;
      const a = i * colunas + j;
      const b = a + 1;
      const c = a + colunas;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  return indices;
}

export class Estrada {
  /** Deslocamento total da origem flutuante (para o ruído usar coordenadas absolutas). */
  origem = new THREE.Vector3();
  #pedacos = new Map(); // n → pedaço
  #estoque = [];
  #grupo = new THREE.Group();
  #materiais;
  #geoVeg;
  #paisagem;
  #ruido;
  #tracado;
  #renderizador;
  #preset;
  #cor = new THREE.Color();
  #corA = new THREE.Color();
  #corB = new THREE.Color();
  #m = new THREE.Matrix4();
  #q = new THREE.Quaternion();
  #v = new THREE.Vector3();
  #e = new THREE.Vector3();
  #p = {};

  constructor({ cena, tracado, ruido, paisagem, renderizador, preset }) {
    this.#tracado = tracado;
    this.#ruido = ruido;
    this.#renderizador = renderizador;
    this.#preset = preset;
    cena.add(this.#grupo);
    this.#materiais = {
      pista: new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 }),
      terreno: new THREE.MeshLambertMaterial({ vertexColors: true }),
      tronco: new THREE.MeshLambertMaterial({ color: '#5a4026' }),
      copa: new THREE.MeshLambertMaterial({ color: '#ffffff' }),
      baliza: new THREE.MeshLambertMaterial({ color: '#f2f2f2', emissive: '#000000' }),
    };
    this.definirPaisagem(paisagem);
  }

  definirPaisagem(paisagem) {
    this.#paisagem = paisagem;
    this.#materiais.pista.map?.dispose();
    this.#materiais.pista.map = criarTexturaAsfalto(paisagem, this.#renderizador);
    this.#materiais.pista.needsUpdate = true;
    if (this.#geoVeg) Object.values(this.#geoVeg).forEach((g) => g.dispose());
    this.#geoVeg = geometriasVegetacao(paisagem.vegetacao.tipo);
    for (const p of [...this.#pedacos.values(), ...this.#estoque]) {
      p.troncos.geometry = this.#geoVeg.tronco;
      p.copas.geometry = this.#geoVeg.copaPerto;
      p.copaLonge = false;
    }
    this.reconstruir();
  }

  definirPreset(preset) {
    const mudouDensidade = preset.vegetacao !== this.#preset.vegetacao;
    this.#preset = preset;
    for (const p of this.#pedacos.values()) {
      p.terreno.receiveShadow = preset.sombras;
      p.pista.receiveShadow = preset.sombras;
    }
    if (mudouDensidade) this.reconstruir();
  }

  /** Refaz todos os pedaços visíveis (troca de paisagem ou de densidade). */
  reconstruir() {
    for (const [n, p] of this.#pedacos) this.#montar(p, n);
  }

  /** Mantém pedaços de um pouco atrás até a distância de visão à frente. */
  atualizar(sCarro, sCamera = sCarro, maxNovos = 2) {
    const primeiro = Math.max(0, Math.floor((Math.min(sCarro, sCamera) - 60) / COMPRIMENTO));
    const ultimo = Math.floor((sCarro + this.#preset.distancia) / COMPRIMENTO);
    for (const [n, p] of this.#pedacos) {
      if (n < primeiro || n > ultimo) {
        p.grupo.visible = false;
        this.#pedacos.delete(n);
        this.#estoque.push(p);
      }
    }
    let novos = 0;
    for (let n = primeiro; n <= ultimo; n++) {
      if (this.#pedacos.has(n)) continue;
      if (novos >= maxNovos) break;
      const p = this.#estoque.pop() ?? this.#criarPedaco();
      this.#montar(p, n);
      p.grupo.visible = true;
      this.#pedacos.set(n, p);
      novos++;
    }
    // Nível de detalhe: pedaços distantes usam copas simples e sem troncos
    const nCarro = Math.floor(sCarro / COMPRIMENTO);
    for (const [n, p] of this.#pedacos) {
      const longe = n - nCarro > 3;
      if (longe !== p.copaLonge) {
        p.copaLonge = longe;
        p.copas.geometry = longe ? this.#geoVeg.copaLonge : this.#geoVeg.copaPerto;
        p.troncos.visible = !longe;
      }
      const perto = n - nCarro <= 1 && n - nCarro >= -1;
      p.copas.castShadow = this.#preset.sombras && perto;
      p.troncos.castShadow = this.#preset.sombras && perto;
    }
  }

  /** Origem flutuante: move tudo para perto de (0,0,0). */
  deslocar(dx, dy, dz) {
    this.origem.x += dx;
    this.origem.y += dy;
    this.origem.z += dz;
    for (const p of this.#pedacos.values()) p.grupo.position.set(p.grupo.position.x - dx, p.grupo.position.y - dy, p.grupo.position.z - dz);
  }

  /** Altura do terreno na distância `s` e afastamento lateral `x` (igual à malha desenhada). */
  alturaTerreno(s, x) {
    const c = this.#tracado.em(s, this.#p);
    return this.#alturaInterpolada(c, Math.sign(x) || 1, Math.max(0, Math.abs(x) - BORDA));
  }

  /** Fator que encolhe o lado de dentro de curvas fechadas (evita o terreno se dobrar). */
  #escala(c, lado) {
    const raio = Math.abs(c.curvatura) > 1e-5 ? 1 / Math.abs(c.curvatura) : Infinity;
    const dentro = (c.curvatura > 0 ? 1 : -1) === lado;
    return dentro ? Math.min(1, (0.8 * raio - BORDA) / COLUNAS[NC - 1]) : 1;
  }

  /** Altura exata de uma coluna do terreno (`d0` = distância nominal da beira). */
  #alturaColuna(c, lado, d0, escala) {
    const x = lado * (BORDA + d0 * escala);
    const n = this.#ruido.fbm2((c.x - Math.cos(c.rumo) * x + this.origem.x) / 190, (c.z + Math.sin(c.rumo) * x + this.origem.z) / 190, 4);
    return { altura: c.y + lado * BORDA * c.lateral + this.#paisagem.relevo(d0, n) - (d0 === 0 ? 0.05 : 0), ruido: n };
  }

  /** Altura entre duas colunas, interpolada como na malha. */
  #alturaInterpolada(c, lado, d) {
    let j = 0;
    while (j < NC - 2 && COLUNAS[j + 1] < d) j++;
    const t = Math.min(1, Math.max(0, (d - COLUNAS[j]) / (COLUNAS[j + 1] - COLUNAS[j])));
    const escala = this.#escala(c, lado);
    const a = this.#alturaColuna(c, lado, COLUNAS[j], escala).altura;
    const b = this.#alturaColuna(c, lado, COLUNAS[j + 1], escala).altura;
    return a + (b - a) * t;
  }

  destruir() {
    for (const p of [...this.#pedacos.values(), ...this.#estoque]) {
      p.pista.geometry.dispose();
      p.terreno.geometry.dispose();
      p.troncos.dispose();
      p.copas.dispose();
      p.balizas.dispose();
    }
    Object.values(this.#materiais).forEach((m) => { m.map?.dispose(); m.dispose(); });
    Object.values(this.#geoVeg).forEach((g) => g.dispose());
    this.#grupo.removeFromParent();
  }

  /* ---------- Criação e montagem de um pedaço ---------- */

  #criarPedaco() {
    const grupo = new THREE.Group();
    const geoPista = new THREE.BufferGeometry();
    geoPista.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINHAS * 4 * 3), 3));
    geoPista.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(LINHAS * 4 * 3), 3));
    geoPista.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(LINHAS * 4 * 2), 2));
    geoPista.setIndex(indicesGrade(4));
    const pista = new THREE.Mesh(geoPista, this.#materiais.pista);

    const colunas = NC * 2;
    const geoTerreno = new THREE.BufferGeometry();
    geoTerreno.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINHAS * colunas * 3), 3));
    geoTerreno.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(LINHAS * colunas * 3), 3));
    geoTerreno.setAttribute('color', new THREE.BufferAttribute(new Float32Array(LINHAS * colunas * 3), 3));
    geoTerreno.setIndex(indicesGrade(colunas, NC - 1));
    const terreno = new THREE.Mesh(geoTerreno, this.#materiais.terreno);

    const troncos = new THREE.InstancedMesh(this.#geoVeg.tronco, this.#materiais.tronco, MAX_ARVORES);
    const copas = new THREE.InstancedMesh(this.#geoVeg.copaPerto, this.#materiais.copa, MAX_ARVORES);
    copas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_ARVORES * 3), 3);
    const geoBaliza = new THREE.BoxGeometry(0.14, 1.1, 0.14);
    geoBaliza.translate(0, 0.55, 0);
    const balizas = new THREE.InstancedMesh(geoBaliza, this.#materiais.baliza, BALIZAS);
    grupo.add(pista, terreno, troncos, copas, balizas);
    this.#grupo.add(grupo);
    return { grupo, pista, terreno, troncos, copas, balizas, copaLonge: false };
  }

  #montar(p, n) {
    const tracado = this.#tracado;
    const paisagem = this.#paisagem;
    const s0 = n * COMPRIMENTO;
    tracado.garantir(s0 + COMPRIMENTO + PASSO);
    const i0 = Math.round(s0 / PASSO);
    const o = tracado.indice(i0);
    p.grupo.position.set(o.x, o.y, o.z);

    const posPista = p.pista.geometry.attributes.position.array;
    const uvPista = p.pista.geometry.attributes.uv.array;
    const norPista = p.pista.geometry.attributes.normal.array;
    const colunas = NC * 2;
    const posTerreno = p.terreno.geometry.attributes.position.array;
    const corTerreno = p.terreno.geometry.attributes.color.array;
    const fracaoV = ((s0 / REPETICAO_TEXTURA) % 1);
    const xsPista = [-BORDA, -MEIA_LARGURA, MEIA_LARGURA, BORDA];
    const grama = paisagem.grama;

    for (let i = 0; i < LINHAS; i++) {
      const a = tracado.indice(i0 + i);
      const cx = a.x - o.x;
      const cy = a.y - o.y;
      const cz = a.z - o.z;
      const rx = -Math.cos(a.rumo);
      const rz = Math.sin(a.rumo);
      // Normal da pista: "para cima" inclinada pelo banking
      const ny = 1;
      const nx = -a.lateral * rx;
      const nz = -a.lateral * rz;
      const nl = Math.hypot(nx, ny, nz);

      for (let j = 0; j < 4; j++) {
        const x = xsPista[j];
        const k = (i * 4 + j) * 3;
        posPista[k] = cx + rx * x;
        posPista[k + 1] = cy + x * a.lateral + 0.02;
        posPista[k + 2] = cz + rz * x;
        norPista[k] = nx / nl;
        norPista[k + 1] = ny / nl;
        norPista[k + 2] = nz / nl;
        uvPista[(i * 4 + j) * 2] = (x + BORDA) / (2 * BORDA);
        uvPista[(i * 4 + j) * 2 + 1] = fracaoV + (i * PASSO) / REPETICAO_TEXTURA;
      }

      // Terreno: o lado de dentro de curvas fechadas é "encolhido" para não se dobrar
      const escalas = { [-1]: this.#escala(a, -1), 1: this.#escala(a, 1) };
      for (let c = 0; c < colunas; c++) {
        const lado = c < NC ? -1 : 1;
        const d0 = c < NC ? COLUNAS[NC - 1 - c] : COLUNAS[c - NC];
        const x = lado * (BORDA + d0 * escalas[lado]);
        const { altura, ruido: ruidoLocal } = this.#alturaColuna(a, lado, d0, escalas[lado]);
        const k = (i * colunas + c) * 3;
        posTerreno[k] = cx + rx * x;
        posTerreno[k + 1] = altura - o.y;
        posTerreno[k + 2] = cz + rz * x;
        // Cor: terra perto da pista, grama variada, rocha nos altos
        const variacao = this.#ruido.r2((a.x + rx * x + this.origem.x) / 23, (a.z + rz * x + this.origem.z) / 23) * 0.5 + 0.5;
        const indiceGrama = Math.min(grama.length - 1, Math.floor(variacao * grama.length));
        this.#cor.set(grama[indiceGrama]);
        this.#corA.set(grama[(indiceGrama + 1) % grama.length]);
        this.#cor.lerp(this.#corA, (variacao * grama.length) % 1);
        if (d0 < 3) this.#cor.lerp(this.#corB.set(paisagem.terra), d0 === 0 ? 0.75 : 0.35);
        if (d0 >= 60 && ruidoLocal > 0.25) this.#cor.lerp(this.#corB.set(paisagem.rocha), Math.min(1, (ruidoLocal - 0.25) * 2.5));
        corTerreno[k] = this.#cor.r;
        corTerreno[k + 1] = this.#cor.g;
        corTerreno[k + 2] = this.#cor.b;
      }
    }
    for (const malha of [p.pista, p.terreno]) {
      const geo = malha.geometry;
      for (const nome in geo.attributes) geo.attributes[nome].needsUpdate = true;
      if (malha === p.terreno) geo.computeVertexNormals();
      geo.computeBoundingSphere();
    }
    p.pista.receiveShadow = this.#preset.sombras;
    p.terreno.receiveShadow = this.#preset.sombras;

    this.#plantar(p, n, s0, o);
    this.#balizar(p, s0, o);
  }

  /** Árvores: posições sorteadas com a semente do pedaço (sempre as mesmas no mesmo lugar). */
  #plantar(p, n, s0, o) {
    const aleatorio = geradorComSemente(n * 7919 + 13);
    const veg = this.#paisagem.vegetacao;
    const alvo = Math.min(MAX_ARVORES, Math.round(95 * veg.densidade * this.#preset.vegetacao));
    const cores = veg.cores;
    let quantas = 0;
    for (let t = 0; t < alvo * 2 && quantas < alvo; t++) {
      const s = s0 + aleatorio() * COMPRIMENTO;
      const lado = aleatorio() < 0.5 ? -1 : 1;
      const d = 5 + aleatorio() ** 0.8 * 135;
      const c = this.#tracado.em(s, this.#p);
      const dEf = d * this.#escala(c, lado);
      if (dEf < 4) continue;
      const x = lado * (BORDA + dEf);
      const wx = c.x - Math.cos(c.rumo) * x;
      const wz = c.z + Math.sin(c.rumo) * x;
      // Bosques e clareiras
      const mata = this.#ruido.fbm2((wx + this.origem.x) / 140, (wz + this.origem.z) / 140, 2);
      if (mata < -0.12 + aleatorio() * 0.1) continue;
      const y = this.#alturaInterpolada(c, lado, d) - 0.2;
      const escala = 0.75 + aleatorio() * 0.8;
      this.#q.setFromAxisAngle(this.#e.set(0, 1, 0), aleatorio() * Math.PI * 2);
      this.#m.compose(this.#v.set(wx - o.x, y - o.y, wz - o.z), this.#q, this.#e.set(escala, escala * (0.85 + aleatorio() * 0.4), escala));
      p.troncos.setMatrixAt(quantas, this.#m);
      p.copas.setMatrixAt(quantas, this.#m);
      this.#cor.set(cores[Math.floor(aleatorio() * cores.length)]).offsetHSL(0, 0, (aleatorio() - 0.5) * 0.06);
      p.copas.setColorAt(quantas, this.#cor);
      quantas++;
    }
    for (const malha of [p.troncos, p.copas]) {
      malha.count = quantas;
      malha.instanceMatrix.needsUpdate = true;
      malha.computeBoundingSphere();
    }
    p.copas.instanceColor.needsUpdate = true;
  }

  /** Balizadores brancos a cada 20 m nos dois lados (ajudam a sentir a velocidade). */
  #balizar(p, s0, o) {
    let k = 0;
    for (let s = s0; s < s0 + COMPRIMENTO; s += 20) {
      const c = this.#tracado.em(s, this.#p);
      for (const lado of [-1, 1]) {
        const x = lado * (BORDA + 0.6);
        this.#q.setFromAxisAngle(this.#e.set(0, 1, 0), c.rumo);
        this.#m.compose(
          this.#v.set(c.x - Math.cos(c.rumo) * x - o.x, c.y + x * c.lateral - o.y, c.z + Math.sin(c.rumo) * x - o.z),
          this.#q,
          this.#e.set(1, 1, 1),
        );
        p.balizas.setMatrixAt(k++, this.#m);
      }
    }
    p.balizas.count = k;
    p.balizas.instanceMatrix.needsUpdate = true;
    p.balizas.computeBoundingSphere();
  }
}
