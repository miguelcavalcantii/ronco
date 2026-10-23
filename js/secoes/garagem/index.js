/**
 * Garagem: estúdio com palco giratório. Escolha o carro, veja os números
 * (aceleração, velocidade máxima, estabilidade), ouça o motor e personalize
 * pintura, rodas, vidros e altura. Tudo fica salvo e vale no jogo.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { icone } from '../../nucleo/icones.js?v=202610231912';
import { carregarEstilo, clamp, movimentoReduzido } from '../../nucleo/util.js?v=202610231912';
import { CARROS, CATEGORIAS, obterCarro, notas } from '../../jogo/carros.js?v=202610231912';
import { ACABAMENTOS, RODAS, CORES_RODA } from '../../jogo/carro3d.js?v=202610231912';
import { criarCarro, temModeloReal } from '../../jogo/modelosReais.js?v=202610231912';
import { garagem } from '../../jogo/garagemDados.js?v=202610231912';
import { criarSomDoCarro, PERFIS_MOTOR } from '../../jogo/motorSom.js?v=202610231912';

const CORES = ['#ffd60a', '#00c853', '#1e6bff', '#e10600', '#ff7a18', '#f2f2f2', '#c3c7cc', '#6e7378', '#141516', '#0a6b3a', '#5b2a86', '#22e4ff', '#ff2e97', '#7ad61a', '#8a5a2b'];
const NOMES_VIDRO = ['Claro', 'Leve', 'Escuro', 'Limusine'];

export async function montar(raiz, { audio, avisar, progresso }) {
  await carregarEstilo(new URL('../../../css/secoes/garagem.css?v=202610231912', import.meta.url));

  raiz.innerHTML = `
    <div class="garagem">
      <div class="garagem__palco" data-palco>
        <p class="garagem__dica">${icone('recarregar')}<span>Arraste para girar · role para aproximar</span></p>
        <div class="garagem__navegar">
          <button type="button" class="botao-icone pilula" data-anterior aria-label="Carro anterior">${icone('voltar')}</button>
          <span class="garagem__contador" data-contador></span>
          <button type="button" class="botao-icone pilula" data-proximo aria-label="Próximo carro">${icone('seta')}</button>
        </div>
      </div>

      <aside class="garagem__lista carbono" aria-label="Carros">
        <h2>Carros</h2>
        ${CATEGORIAS.map((cat) => `
          <section>
            <h3>${cat.nome}</h3>
            <ul>
              ${CARROS.filter((c) => c.categoria === cat.id).map((c) => `
                <li><button type="button" class="carro-item" data-carro="${c.id}" style="--cor:${c.cor}">
                  <span class="carro-item__cor" aria-hidden="true"></span>
                  <span><strong>${c.nome}</strong><small>${c.inspiracao}</small></span>
                </button></li>`).join('')}
            </ul>
          </section>`).join('')}
      </aside>

      <section class="garagem__ficha carbono" aria-live="polite">
        <header class="ficha__topo">
          <p class="ficha__categoria" data-categoria></p>
          <h2 data-nome></h2>
          <p class="ficha__descricao" data-descricao></p>
          <p class="ficha__modelo" data-modelo></p>
        </header>
        <dl class="ficha__numeros">
          <div><dt>0 a 100 km/h</dt><dd><strong data-zero></strong> s</dd><span class="barra-nota"><i data-nota="aceleracao"></i></span></div>
          <div><dt>Velocidade máxima</dt><dd><strong data-vmax></strong> km/h</dd><span class="barra-nota"><i data-nota="velocidade"></i></span></div>
          <div><dt>Estabilidade</dt><dd><strong data-estab></strong>%</dd><span class="barra-nota"><i data-nota="estabilidade"></i></span></div>
        </dl>
        <p class="ficha__motor">${icone('som')}<span>Motor: <strong data-motor></strong></span>
          <button type="button" class="chip" data-ouvir>${icone('jogar')}<span>Ouvir</span></button></p>

        <nav class="ficha__abas" role="tablist">
          ${[['pintura', 'Pintura'], ['rodas', 'Rodas'], ['vidros', 'Vidros'], ['suspensao', 'Suspensão']].map(([id, nome], i) => `<button type="button" role="tab" data-aba="${id}" aria-selected="${i === 0}">${nome}</button>`).join('')}
        </nav>
        <div class="ficha__painel" data-painel="pintura">
          <div class="amostras">
            ${CORES.map((c) => `<button type="button" class="amostra" data-cor="${c}" style="--amostra:${c}" aria-label="Cor ${c}"></button>`).join('')}
            <label class="amostra amostra--livre" title="Qualquer cor"><input type="color" data-cor-livre aria-label="Escolher qualquer cor">+</label>
          </div>
          <div class="opcoes-linha">${ACABAMENTOS.map((a) => `<button type="button" class="chip" data-acabamento="${a.id}">${a.nome}</button>`).join('')}</div>
        </div>
        <div class="ficha__painel" data-painel="rodas" hidden>
          <div class="opcoes-linha">${RODAS.map((r) => `<button type="button" class="chip" data-roda="${r.id}">${r.nome}</button>`).join('')}</div>
          <div class="amostras">
            ${CORES_RODA.map((c) => `<button type="button" class="amostra" data-cor-roda="${c}" style="--amostra:${c}" aria-label="Aro ${c}"></button>`).join('')}
            <button type="button" class="chip" data-cor-roda="carroceria">Cor do carro</button>
          </div>
        </div>
        <div class="ficha__painel" data-painel="vidros" hidden>
          <label class="regulagem"><span>Escurecimento: <strong data-vidro-nome></strong></span>
            <input type="range" class="deslizador" min="0" max="3" step="1" data-vidro aria-label="Escurecimento dos vidros"></label>
        </div>
        <div class="ficha__painel" data-painel="suspensao" hidden>
          <label class="regulagem"><span>Altura: <strong data-altura-nome></strong></span>
            <input type="range" class="deslizador" min="-1" max="1" step="0.25" data-altura aria-label="Altura da suspensão"></label>
          <p class="ficha__nota">Rebaixado gruda um pouco mais nas curvas; elevado, um pouco menos.</p>
        </div>

        <div class="ficha__acoes">
          <button type="button" class="chip" data-restaurar>${icone('recarregar')}<span>Original</span></button>
          <a class="botao" href="#/s/dirigir" data-dirigir>${icone('volante')}<span>Dirigir este</span></a>
        </div>
      </section>
    </div>`;

  const $ = (s) => raiz.querySelector(s);
  const $$ = (s) => raiz.querySelectorAll(s);
  const palco = $('[data-palco]');

  /* ---------- Estúdio 3D ---------- */

  const renderizador = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderizador.outputColorSpace = THREE.SRGBColorSpace;
  renderizador.toneMapping = THREE.ACESFilmicToneMapping;
  renderizador.toneMappingExposure = 1.0;
  renderizador.shadowMap.enabled = true;
  renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
  renderizador.domElement.className = 'garagem__tela';
  palco.prepend(renderizador.domElement);

  const cena = new THREE.Scene();
  const corFundo = new THREE.Color('#0b0d0f');
  cena.background = corFundo;
  cena.fog = new THREE.Fog(corFundo, 14, 30);
  const pmrem = new THREE.PMREMGenerator(renderizador);
  const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environment = ambiente;
  cena.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

  // Chão do estúdio e palco giratório com anel de luz na cor do tema
  const estilo = getComputedStyle(document.documentElement);
  const corTema = (nome, padrao) => new THREE.Color(estilo.getPropertyValue(nome).trim() || padrao);
  const chao = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#121417', roughness: 0.85, metalness: 0 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  const giratorio = new THREE.Group();
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.12, 64), new THREE.MeshStandardMaterial({ color: '#1c2024', roughness: 0.7, metalness: 0.15 }));
  disco.position.y = 0.06;
  disco.receiveShadow = true;
  const anel = new THREE.Mesh(new THREE.TorusGeometry(3.66, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: corTema('--a1', '#ffd60a') }));
  anel.rotation.x = Math.PI / 2;
  anel.position.y = 0.1;
  giratorio.add(disco, anel);
  // Faixas tricolores no disco (como uma linha de largada)
  const faixas = new THREE.Group();
  ['--a2', '--a1', '--a3'].forEach((nome, i) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.2), new THREE.MeshBasicMaterial({ color: corTema(nome, '#ffffff'), transparent: true, opacity: 0.85 }));
    f.rotation.x = -Math.PI / 2;
    f.position.set(-3.0 + i * 0.26, 0.125, 0);
    faixas.add(f);
  });
  giratorio.add(faixas);
  cena.add(chao, giratorio);

  // Luzes: principal com sombra e duas de recorte coloridas
  const principal = new THREE.DirectionalLight('#ffffff', 2.2);
  principal.position.set(4, 8, 5);
  principal.castShadow = true;
  principal.shadow.mapSize.set(1024, 1024);
  Object.assign(principal.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
  principal.shadow.bias = -0.0005;
  // Luzes de recorte coloridas vindas de trás (direcionais: contornam o carro sem manchar o chão)
  const recorte1 = new THREE.DirectionalLight(corTema('--a2', '#00c853'), 0.45);
  recorte1.position.set(-6, 3, -6);
  const recorte2 = new THREE.DirectionalLight(corTema('--a3', '#1e6bff'), 0.45);
  recorte2.position.set(6, 3, -6);
  cena.add(principal, recorte1, recorte2, new THREE.HemisphereLight('#c8d4e0', '#101214', 0.4));

  function redimensionar() {
    const l = palco.clientWidth || 1;
    const a = palco.clientHeight || 1;
    renderizador.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderizador.setSize(l, a, false);
    camera.aspect = l / a;
    camera.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(palco);
  redimensionar();

  /* ---------- Câmera orbital (arrastar e rolar) ---------- */

  const orbita = { azimute: 0.75, elevacao: 0.28, distancia: 9.5, alvoAz: 0.75, alvoEl: 0.28, alvoDist: 9.5 };
  let arrastando = null;
  let ultimoToque = 0;
  const ponteiros = new Map();
  renderizador.domElement.addEventListener('pointerdown', (e) => {
    renderizador.domElement.setPointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    arrastando = { x: e.clientX, y: e.clientY };
    ultimoToque = performance.now();
  });
  renderizador.domElement.addEventListener('pointermove', (e) => {
    if (!ponteiros.has(e.pointerId)) return;
    const anterior = ponteiros.get(e.pointerId);
    if (ponteiros.size === 2) {
      // Pinça: aproxima/afasta
      const [a, b] = [...ponteiros.values()];
      const antes = Math.hypot(a.x - b.x, a.y - b.y);
      ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d] = [...ponteiros.values()];
      const depois = Math.hypot(c.x - d.x, c.y - d.y);
      orbita.alvoDist = clamp(orbita.alvoDist * (antes / Math.max(depois, 1)), 5.5, 16);
      return;
    }
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    orbita.alvoAz -= (e.clientX - anterior.x) * 0.008;
    orbita.alvoEl = clamp(orbita.alvoEl + (e.clientY - anterior.y) * 0.005, 0.04, 1.1);
    ultimoToque = performance.now();
  });
  const soltar = (e) => {
    ponteiros.delete(e.pointerId);
    if (!ponteiros.size) arrastando = null;
  };
  renderizador.domElement.addEventListener('pointerup', soltar);
  renderizador.domElement.addEventListener('pointercancel', soltar);
  renderizador.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbita.alvoDist = clamp(orbita.alvoDist * (1 + Math.sign(e.deltaY) * 0.08), 5.5, 16);
  }, { passive: false });

  /* ---------- Carro no palco ---------- */

  let carroAtual = null; // dados
  let modelo = null; // objeto 3D
  let entrada = 1; // animação de entrada (0 → 1)
  let pedido = 0;

  async function mostrarCarro(id) {
    const meu = ++pedido;
    const dados = obterCarro(id);
    carroAtual = dados;
    garagem.escolher(id);
    atualizarFicha();
    const novo = await criarCarro(dados, { ambiente, ajustes: garagem.ajustesDe(id) });
    if (meu !== pedido) { novo.destruir(); return; }
    if (modelo) {
      giratorio.remove(modelo.grupo);
      modelo.destruir();
    }
    modelo = novo;
    modelo.grupo.position.y = 0.12;
    modelo.definirSombras(true);
    giratorio.add(modelo.grupo);
    entrada = movimentoReduzido() ? 1 : 0;
    $('[data-modelo]').textContent = modelo.real ? 'Modelo 3D real' : 'Modelo estilizado do Ronco (sem marcas)';
  }

  /* ---------- Ficha ---------- */

  function atualizarFicha() {
    const c = carroAtual;
    const a = garagem.ajustesDe(c.id);
    $('[data-categoria]').textContent = `${CATEGORIAS.find((x) => x.id === c.categoria)?.nome} · ${c.inspiracao}`;
    $('[data-nome]').textContent = c.nome;
    $('[data-descricao]').textContent = c.descricao;
    $('[data-zero]').textContent = c.zeroCem.toLocaleString('pt-BR');
    $('[data-vmax]').textContent = String(c.vmax);
    $('[data-estab]').textContent = String(Math.round(c.estabilidade * 100));
    $('[data-motor]').textContent = PERFIS_MOTOR[c.motor]?.nome ?? c.motor;
    const n = notas(c);
    for (const [chave, valor] of Object.entries(n)) $(`[data-nota="${chave}"]`).style.setProperty('--n', valor.toFixed(3));
    const i = CARROS.findIndex((x) => x.id === c.id);
    $('[data-contador]').textContent = `${i + 1} / ${CARROS.length}`;
    $$('[data-carro]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.carro === c.id)));
    raiz.querySelector(`[data-carro="${c.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // Personalização
    $$('[data-cor]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cor.toLowerCase() === a.cor.toLowerCase())));
    $('[data-cor-livre]').value = a.cor;
    $$('[data-acabamento]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.acabamento === a.acabamento)));
    $$('[data-roda]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.roda === a.roda)));
    $$('[data-cor-roda]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.corRoda === a.corRoda)));
    const vidro = $('[data-vidro]');
    vidro.value = String(a.vidro);
    $('[data-vidro-nome]').textContent = NOMES_VIDRO[a.vidro];
    const altura = $('[data-altura]');
    altura.value = String(a.altura);
    $('[data-altura-nome]').textContent = a.altura < 0 ? 'Rebaixado' : a.altura > 0 ? 'Elevado' : 'Original';
    for (const d of [vidro, altura]) d.style.setProperty('--p', `${((Number(d.value) - Number(d.min)) / (Number(d.max) - Number(d.min))) * 100}%`);
    const f1 = c.forma === 'f1';
    $('[data-aba="vidros"]').hidden = f1; // monoposto não tem vidros
    if (f1 && $('[data-aba="vidros"]').getAttribute('aria-selected') === 'true') abrirAba('pintura');
  }

  function ajustar(mudanca) {
    const a = { ...garagem.ajustesDe(carroAtual.id), ...mudanca };
    garagem.salvarAjustes(carroAtual.id, a);
    modelo?.aplicarAjustes(a);
    atualizarFicha();
  }

  function abrirAba(id) {
    $$('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === id)));
    $$('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== id; });
  }

  /* ---------- Ouvir o motor: acelerada no ponto morto ---------- */

  let somDemo = null;
  let demo = null;
  function ouvirMotor() {
    audio.desbloquear();
    if (!audio.ativo) return;
    somDemo?.destruir();
    somDemo = criarSomDoCarro(audio, carroAtual.motor, { rpmMax: carroAtual.rpmMax });
    demo = { t: 0, carro: carroAtual };
  }
  function passoDemo(dt) {
    if (!demo || !somDemo) return;
    demo.t += dt;
    const c = demo.carro;
    const t = demo.t;
    // Marcha lenta, duas aceleradas e volta
    const pico = (centro, largura) => Math.max(0, 1 - Math.abs(t - centro) / largura);
    const fracao = Math.max(pico(0.9, 0.45), pico(1.9, 0.6) * 0.95);
    const rpm = Math.max(c.rpmLenta, c.rpmLenta + (c.rpmMax * 0.92 - c.rpmLenta) * fracao);
    somDemo.atualizar(dt, { rpm, rpmMax: c.rpmMax, carga: fracao > 0.05 ? 1 : 0.05, kmh: c.motor === 'eletrico' ? fracao * 160 : 0, derrapagem: 0, limitador: false, foraDaPista: false });
    if (t > 3.2) {
      somDemo.destruir();
      somDemo = null;
      demo = null;
    }
  }

  /* ---------- Eventos da interface ---------- */

  const indiceAtual = () => CARROS.findIndex((x) => x.id === carroAtual.id);
  raiz.addEventListener('click', (e) => {
    const alvo = e.target.closest('button, a');
    if (!alvo) return;
    if (alvo.dataset.carro) { audio.tocar('alternar'); mostrarCarro(alvo.dataset.carro); return; }
    if (alvo.matches('[data-anterior]')) { mostrarCarro(CARROS[(indiceAtual() - 1 + CARROS.length) % CARROS.length].id); return; }
    if (alvo.matches('[data-proximo]')) { mostrarCarro(CARROS[(indiceAtual() + 1) % CARROS.length].id); return; }
    if (alvo.dataset.aba) { abrirAba(alvo.dataset.aba); audio.tocar('alternar'); return; }
    if (alvo.dataset.cor) { ajustar({ cor: alvo.dataset.cor }); return; }
    if (alvo.dataset.acabamento) { ajustar({ acabamento: alvo.dataset.acabamento }); return; }
    if (alvo.dataset.roda) { ajustar({ roda: alvo.dataset.roda }); return; }
    if (alvo.dataset.corRoda) { ajustar({ corRoda: alvo.dataset.corRoda }); return; }
    if (alvo.matches('[data-ouvir]')) { ouvirMotor(); return; }
    if (alvo.matches('[data-restaurar]')) {
      const a = garagem.restaurar(carroAtual.id);
      modelo?.aplicarAjustes(a);
      atualizarFicha();
      avisar({ titulo: 'Configuração original', texto: carroAtual.nome, icone: 'recarregar' });
    }
  });
  $('[data-cor-livre]').addEventListener('input', (e) => ajustar({ cor: e.target.value }));
  $('[data-vidro]').addEventListener('input', (e) => ajustar({ vidro: Number(e.target.value) }));
  $('[data-altura]').addEventListener('input', (e) => ajustar({ altura: Number(e.target.value) }));
  // Setas do teclado trocam de carro (quando o foco não está num campo)
  const aoTeclar = (e) => {
    if (e.target.closest('input, textarea, dialog[open]')) return;
    if (e.code === 'ArrowRight') mostrarCarro(CARROS[(indiceAtual() + 1) % CARROS.length].id);
    if (e.code === 'ArrowLeft') mostrarCarro(CARROS[(indiceAtual() - 1 + CARROS.length) % CARROS.length].id);
  };
  window.addEventListener('keydown', aoTeclar);

  /* ---------- Laço de desenho ---------- */

  let ultimo = 0;
  renderizador.setAnimationLoop((agora) => {
    const dt = ultimo ? Math.min((agora - ultimo) / 1000, 0.05) : 1 / 60;
    ultimo = agora;
    // Palco gira sozinho quando ninguém está mexendo
    if (!arrastando && performance.now() - ultimoToque > 2500 && !movimentoReduzido()) giratorio.rotation.y += dt * 0.25;
    orbita.azimute += (orbita.alvoAz - orbita.azimute) * Math.min(1, dt * 8);
    orbita.elevacao += (orbita.alvoEl - orbita.elevacao) * Math.min(1, dt * 8);
    orbita.distancia += (orbita.alvoDist - orbita.distancia) * Math.min(1, dt * 6);
    const { azimute: az, elevacao: el, distancia: d } = orbita;
    camera.position.set(Math.sin(az) * Math.cos(el) * d, 0.6 + Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(0, 0.65, 0);
    if (modelo && entrada < 1) {
      entrada = Math.min(1, entrada + dt * 2.2);
      const k = 1 - (1 - entrada) ** 3;
      modelo.grupo.position.y = 0.12 + (1 - k) * 1.2;
      modelo.grupo.rotation.y = (1 - k) * -0.8;
    }
    passoDemo(dt);
    renderizador.render(cena, camera);
  });

  abrirAba('pintura');
  await mostrarCarro(garagem.carroId);
  progresso.registrar('garagem:visita');
  // Avisa (uma vez por visita) quantos modelos reais estão instalados
  Promise.all(CARROS.map((c) => temModeloReal(c.id))).then((lista) => {
    const reais = lista.filter(Boolean).length;
    if (reais) avisar({ titulo: `${reais} modelo(s) 3D real(is) instalado(s)`, icone: 'carro' });
  });

  return {
    destruir() {
      renderizador.setAnimationLoop(null);
      window.removeEventListener('keydown', aoTeclar);
      observador.disconnect();
      somDemo?.destruir();
      modelo?.destruir();
      cena.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
      ambiente.dispose();
      pmrem.dispose();
      renderizador.dispose();
      renderizador.forceContextLoss();
    },
  };
}
