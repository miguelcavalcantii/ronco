# Ronco: plano de etapas

App de carros em HTML, CSS e JavaScript puros (sem etapa de build), com Three.js
carregado por import map. Cada seção é um módulo em `js/secoes/<id>/` registrado
em `js/secoes/registro.js`.

| Etapa | Conteúdo | Situação |
|---|---|---|
| 1 | Estrutura, temas (Brasil, Pista Noturna, Anos 80, Carbono, Corrida de Rua), áudio com 4 canais, menu-painel, configurações, abertura "gire a chave" | Feita |
| 2 | Base do jogo: estrada infinita em pedaços com curvas, subidas e banking, um carro estilizado, uma paisagem (Serra Verde), qualidade Baixo/Médio/Alto/Ultra + Automático, FPS opcional, pausa ao trocar de aba, luzes de largada, som de motor sintetizado | Feita |
| 3 | Garagem: palco giratório, 14 carros estilizados (7 formas de carroceria + F1), pintura (metálica, sólida, fosca, perolizada), 4 rodas, vidros, altura; números de cada carro; troca automática por modelos glTF reais (MODELOS.md) | Feita |
| 4 | Sons de motor por tipo (V8, 6 em linha, V10, V12, 4 cil. turbo, 3 cil. turbo, V6 turbo anos 80, elétrico, popular) com explosões simuladas por cilindro, turbo e estalos; buzina contínua, seta com pisca no carro e no painel, chuva no teto | Feita |
| 5 | 9 paisagens (Serra Verde, Litoral com mar, Montanhas, Floresta, Cânion, Cidade Neon à noite, Campo, Neve escorregadia e Autódromo inspirado em Interlagos com zebras, arquibancadas, cronômetro de volta e nome das curvas), troca suave pela pausa. Carros redesenhados por seções com medidas reais e traços de cada modelo | Feita |
| 6 | Clima e hora do dia: sol, nublado, chuva (gotas no para-brisa, asfalto molhado), tempestade, neblina, neve; madrugada, dia, pôr do sol, noite com faróis e postes | A fazer |
| 7 | Câmeras e modo foto; modos Passeio livre, Trânsito, Contra o tempo, Desafio de pontos e Chuva do Mestre | A fazer |
| 8 | Rádio (lo-fi, synthwave, eletrônica, rock), painel completo, câmbio manual, estatísticas e conquistas | A fazer |
| 9 | Legado: homenagem a Ayrton Senna (linha do tempo, números verificados, corridas marcantes, carro F1 estilizado nas cores do Brasil) | A fazer |
