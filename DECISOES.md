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
- **Sons sintetizados** com Web Audio: nenhum arquivo de áudio precisa ser baixado.
- **Sem marcas:** os carros são estilizados e não usam logotipos (marcas registradas).
  Na seção Legado não serão usadas fotos, o logotipo oficial, o desenho original do
  capacete nem marcas de patrocinadores: só cores, textos, números e ilustrações próprias.
- **Teste:** `?depurar` no endereço expõe `window.ronco` (física, estrada, mundo…) no console.
