/**
 * Conquistas do Ronco. `condicao` recebe uma visão do progresso:
 * { contador(ev), distintos(ev), recorde(chave), nivel, estatistica(chave) }.
 * As de homenagem ao Ayrton Senna citam fatos da carreira, sem marcas nem imagens.
 */

export const CONQUISTAS = [
  { id: 'partida', nome: 'Motor Ligado', descricao: 'Dê a partida no Ronco pela primeira vez', icone: 'chave', cor: '#ffd60a', condicao: (v) => v.contador('app:partida') >= 1 },
  { id: 'primeiro-km', nome: 'Primeiro Quilômetro', descricao: 'Dirija 1 km', icone: 'estrada', cor: '#00d45a', condicao: (v) => v.estatistica('distancia') >= 1000 },
  { id: 'estradeiro', nome: 'Estradeiro', descricao: 'Dirija 100 km no total', icone: 'estrada', cor: '#1e6bff', condicao: (v) => v.estatistica('distancia') >= 100000 },
  { id: 'duzentos', nome: 'Duzentão', descricao: 'Passe de 200 km/h', icone: 'velocimetro', cor: '#ff7a18', condicao: (v) => v.estatistica('velocidadeMaxima') >= 200 },
  { id: 'trezentos', nome: 'Reta Oposta', descricao: 'Passe de 300 km/h', icone: 'velocimetro', cor: '#e10600', condicao: (v) => v.estatistica('velocidadeMaxima') >= 300 },
  { id: 'paisagista', nome: 'Turista', descricao: 'Dirija em 5 paisagens diferentes', icone: 'montanha', cor: '#22e4ff', condicao: (v) => v.distintos('dirigir:paisagem') >= 5 },
  { id: 'colecionador', nome: 'Garagem Cheia', descricao: 'Dirija 6 carros diferentes', icone: 'carro', cor: '#ff2e97', condicao: (v) => v.distintos('dirigir:carro') >= 6 },
  { id: 'ultrapassagens', nome: 'Ultrapassagem Limpa', descricao: 'Faça 100 ultrapassagens no Trânsito', icone: 'seta', cor: '#a3ff12', condicao: (v) => v.contador('transito:ultrapassagem') >= 100 },
  // Homenagens ao Ayrton Senna
  { id: 'rei-da-chuva', nome: 'Rei da Chuva', descricao: 'Complete o modo Chuva do Mestre', icone: 'chuva', cor: '#ffd60a', senna: true, condicao: (v) => v.contador('mestre:completo') >= 1 },
  { id: 'monaco-84', nome: 'Mônaco, 1984', descricao: 'Dirija 5 km com chuva forte sem bater', icone: 'chuva', cor: '#1e6bff', senna: true, condicao: (v) => v.recorde('chuvaSemBater') >= 5000 },
  { id: 'donington-93', nome: 'A Volta de Donington', descricao: 'Ultrapasse 4 carros em menos de 30 segundos', icone: 'seta', cor: '#00d45a', senna: true, condicao: (v) => v.recorde('ultrapassagens30s') >= 4 },
  { id: 'tres-vezes', nome: 'Três Vezes Campeão', descricao: 'Vença os 3 modos de desafio (Trânsito, Contra o Tempo e Pontos)', icone: 'trofeu', cor: '#ffd60a', senna: true, condicao: (v) => v.distintos('modo:vitoria') >= 3 },
  { id: 'interlagos', nome: 'Em Casa', descricao: 'Dê uma volta no autódromo inspirado em Interlagos', icone: 'bandeira', cor: '#00d45a', senna: true, condicao: (v) => v.contador('autodromo:volta') >= 1 },
  { id: 'legado', nome: 'Legado', descricao: 'Percorra toda a linha do tempo da seção Legado', icone: 'capacete', cor: '#1e6bff', senna: true, condicao: (v) => v.contador('legado:fim') >= 1 },
  // Níveis
  { id: 'nivel-5', nome: 'Piloto de Testes', descricao: 'Chegue ao nível 5', icone: 'estrela', cor: '#ff7a18', condicao: (v) => v.nivel >= 5 },
  { id: 'nivel-10', nome: 'Primeiro Piloto', descricao: 'Chegue ao nível 10', icone: 'coroa', cor: '#ffd60a', condicao: (v) => v.nivel >= 10 },
];
