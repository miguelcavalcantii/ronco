# Decisões técnicas

- **Sem build, sem dependências locais.** Three.js 0.170.0 vem do jsDelivr por import map
  (`index.html`). Versão fixa para nada mudar sozinho.
- **Física em coordenadas da estrada** (`js/jogo/fisica.js`): o carro é descrito por
  distância percorrida, afastamento lateral e ângulo em relação à pista. Não cai do mapa,
  não precisa de motor de física e é barato. Estilo arcade, como escolhido.
- **Estrada em pedaços de 100 m com estoque** (`js/jogo/estrada.js`): as geometrias são
  criadas uma vez e reescritas quando o pedaço vai para a frente (pooling). Vegetação e
  balizadores usam `InstancedMesh`; pedaços distantes usam copas simples e sem tronco (LOD).
  No máximo 2 pedaços novos por quadro para não dar tranco.
- **Origem flutuante:** a cada 2,5 km o mundo é recentrado em (0,0,0); o ruído do terreno
  usa coordenadas absolutas, então a paisagem continua igual.
- **Qualidade automática** (`js/jogo/qualidade.js`): mede o FPS a cada segundo; desce um
  nível depois de 2 segundos abaixo de 48 FPS e só tenta subir (até o Alto) depois de 8
  segundos acima de 58 e 40 s sem ter descido.
- **Motores sintetizados, não gravados** (`js/jogo/motorSom.js`). Gravações CC0 de motor
  costumam ser de um giro só; para acompanhar o giro seria preciso um banco com várias faixas
  de rotação por motor e mistura entre elas, e quase não existe isso livre. Em vez disso, um
  AudioWorklet gera cada explosão dos cilindros (pulso curto que ressoa no escapamento). A ordem,
  a força e o espaçamento irregular das explosões dão o caráter: o "lope" do V8 (sub-harmônico
  forte, medido), o liso do 6 em linha, o agudo do V10/V12, o 3 cilindros do 208.
  Turbo tem assobio e válvula de alívio; giro alto sem acelerar dá estalos no escapamento.
- **Níveis medidos offline:** cada perfil foi renderizado em OfflineAudioContext (marcha lenta,
  meio e pé no fundo) e ganhou um `nivel` para todos soarem parecidos, com um limitador por carro
  (picos ficam abaixo de 0,85). A marcha lenta fica 6 a 15 dB abaixo do pé no fundo.
- **Carros por seções (loft)** (`carroceria.js`, `desenhos.js`): cada carro tem medidas reais
  aproximadas (comprimento, largura, balanços, roda) e perfis ao longo do comprimento; a seção
  transversal é uma superelipse. Faróis, grades e lanternas são "colados" na superfície calculada.
  Modelos 3D reais de marcas só existem no Sketchfab com login (ver MODELOS.md).
- **Autódromo** (`circuito.js`): curva Catmull-Rom centrípeta fechada por 28 pontos de controle,
  com a mesma interface do traçado infinito (o `s` cresce volta após volta). Validado em Node:
  4.289 m (Interlagos tem 4.309), giro de exatamente 360° por volta, sem trechos se cruzando
  (menor distância entre partes não vizinhas: 66 m) e curva mais fechada com raio de ~19 m.
  O chão do autódromo é uma malha única cujas alturas vêm da pista (interpolação por distância).
- **Sem marcas:** os carros são estilizados e não usam logotipos (marcas registradas).
  Na seção Legado não serão usadas fotos, o logotipo oficial, o desenho original do
  capacete nem marcas de patrocinadores: só cores, textos, números e ilustrações próprias.
- **Teste:** `?depurar` no endereço expõe `window.ronco` (física, estrada, mundo…) no console.
