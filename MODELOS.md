# Modelos 3D reais (opcional)

O Ronco já funciona com carros estilizados feitos em código. Se você quiser os
carros "de verdade", baixe modelos gratuitos e o app troca sozinho, na garagem e no jogo.

## Passo a passo

1. Abra o link de busca do carro na tabela abaixo (Sketchfab, filtrado para modelos baixáveis).
2. Escolha um modelo que tenha:
   - licença **CC0** ou **CC BY** (aparece na página do modelo, em "License");
   - menos de **60 mil triângulos** (aparece como "Triangles"); quanto menos, mais leve no celular;
   - botão **Download** disponível.
3. Clique em **Download** e escolha **glTF Binary (.glb)**. Se só houver "glTF", baixe o zip e use o `.glb`
   (ou peça para eu converter).
4. Renomeie o arquivo exatamente com o nome da coluna "Arquivo" e coloque em `assets/modelos/`.
5. Acrescente a linha correspondente em `assets/modelos/modelos.json` (exemplo no fim).
6. Anote em `CREDITOS.md`: nome do modelo, autor, link e licença (CC BY exige o crédito).

| Carro no Ronco | Arquivo | Onde procurar |
|---|---|---|
| Peugeot 208 Style (cinza) | `peugeot-208.glb` | https://sketchfab.com/search?features=downloadable&q=peugeot+208&type=models |
| Porsche 911 Carrera S | `porsche-911.glb` | https://sketchfab.com/search?features=downloadable&q=porsche+911+carrera&type=models |
| BMW M3 | `bmw-m3.glb` | https://sketchfab.com/search?features=downloadable&q=bmw+m3&type=models |
| Mercedes-AMG GT | `mercedes-amg-gt.glb` | https://sketchfab.com/search?features=downloadable&q=mercedes+amg+gt&type=models |
| Toyota GR Supra | `toyota-supra.glb` | https://sketchfab.com/search?features=downloadable&q=toyota+supra+gr&type=models |
| Ford Mustang GT | `ford-mustang.glb` | https://sketchfab.com/search?features=downloadable&q=ford+mustang+gt&type=models |
| Audi R8 V10 | `audi-r8.glb` | https://sketchfab.com/search?features=downloadable&q=audi+r8&type=models |
| Ferrari F8 Tributo | `ferrari-f8.glb` | https://sketchfab.com/search?features=downloadable&q=ferrari+f8&type=models |
| Lamborghini Aventador | `lamborghini-aventador.glb` | https://sketchfab.com/search?features=downloadable&q=lamborghini+aventador&type=models |
| Porsche Taycan Turbo S | `porsche-taycan.glb` | https://sketchfab.com/search?features=downloadable&q=porsche+taycan&type=models |
| Volkswagen Golf GTI | `vw-golf-gti.glb` | https://sketchfab.com/search?features=downloadable&q=golf+gti&type=models |
| Toyota Corolla | `toyota-corolla.glb` | https://sketchfab.com/search?features=downloadable&q=toyota+corolla&type=models |

Não há modelo para o **Ronco GT** (é original do app) nem para o **Fórmula Brasil 88**: o carro da
homenagem fica estilizado de propósito, sem pintura nem marcas de patrocinadores da época.

**Sobre o Peugeot 208 Style 2027:** esse ano-modelo ainda não tem modelo 3D gratuito. O mais próximo
é o **208 de segunda geração (2019 em diante, incluindo a reestilização de 2024)**. Ele é visualmente
quase igual; procure por "peugeot 208 2020" ou "peugeot 208 2024". O app pinta o carro de cinza
automaticamente se os materiais da carroceria tiverem nomes como "paint" ou "body".

## Exemplo de `assets/modelos/modelos.json`

```json
{
  "peugeot-208": { "arquivo": "peugeot-208.glb", "rotacaoY": 0 },
  "porsche-911": { "arquivo": "porsche-911.glb", "rotacaoY": 180, "pintura": ["carpaint"], "rodas": ["wheel"] }
}
```

- `rotacaoY`: se o carro aparecer de costas ou de lado na garagem, use 90, 180 ou 270.
- `pintura` (opcional): parte do nome dos materiais da carroceria, para a troca de cor funcionar.
- `rodas` (opcional): parte do nome das peças das rodas, para elas girarem no jogo.
- `comprimento` (opcional): comprimento real em metros, se o tamanho ficar estranho.

Modelos com compressão **Draco** ou **Meshopt** também funcionam.

**Marcas:** modelos de carros reais mostram desenhos e logotipos que são marcas registradas das
fabricantes. Para um site pessoal sem fins comerciais isso costuma ser tolerado, mas evite usar
o Ronco para vender algo com esses modelos.
