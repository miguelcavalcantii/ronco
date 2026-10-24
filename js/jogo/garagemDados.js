/**
 * O que fica guardado da garagem: o carro escolhido e os ajustes de cada carro
 * (pintura, rodas, vidros, altura). Salvo no navegador (localStorage).
 */
import { ler, gravar } from '../nucleo/armazenamento.js?v=202610240909';
import { CARROS, obterCarro } from './carros.js?v=202610240909';
import { ajustesPadrao } from './carro3d.js?v=202610240909';

const CHAVE = 'garagem';
const estado = { carro: 'ronco-gt', ajustes: {}, ...ler(CHAVE, {}) };
if (!CARROS.some((c) => c.id === estado.carro)) estado.carro = 'ronco-gt';

const salvar = () => gravar(CHAVE, estado);

export const garagem = {
  get carroId() { return estado.carro; },
  get carro() { return obterCarro(estado.carro); },
  escolher(id) {
    estado.carro = obterCarro(id).id;
    salvar();
  },
  ajustesDe(id) {
    return { ...ajustesPadrao(obterCarro(id)), ...(estado.ajustes[id] ?? {}) };
  },
  salvarAjustes(id, ajustes) {
    estado.ajustes[id] = { ...ajustes };
    salvar();
  },
  restaurar(id) {
    delete estado.ajustes[id];
    salvar();
    return this.ajustesDe(id);
  },
};
