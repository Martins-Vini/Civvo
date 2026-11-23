

const ROTAS_APP = new Set([
  'feed',
  'buscar',
  'chats',
  'avisos',
  'perfil',
  'config',
  'planos',
  'painel',
  'admin',
  'doar',
  'recibo',
  'post',
  'editar-perfil',
  'ong',
]);

let TEMA = 'claro';
try {
  const t = localStorage.getItem('civvo-tema');
  if (t == 'escuro' || t == 'claro') TEMA = t;
} catch (e) {}
const rotaAtual = () => (location.hash.slice(2) || 'feed').split('/')[0];
function aplicarTema(r = rotaAtual()) {
  const app = ROTAS_APP.has(r);
  document.body.classList.toggle('t-claro', app && TEMA == 'claro');
  document.body.classList.toggle('t-escuro', app && TEMA == 'escuro');
}

function setTema(t) {
  TEMA = t;
  try {
    localStorage.setItem('civvo-tema', t);
  } catch (e) {}
  aplicarTema();
  go();
}

const TEMAS = [
  ['claro', 'Claro (principal)', 'Fundo branco e textos pretos'],
  ['escuro', 'Escuro', 'Fundo preto e textos brancos'],
];

const cardTema = () =>
  `<div class="card set"><h4>Aparência</h4><div class="temas" role="radiogroup" aria-label="Tema">${TEMAS.map(([k, n, d]) => `<button class="tema ${TEMA == k ? 'on' : ''}" role="radio" aria-checked="${TEMA == k}" onclick="setTema('${k}')"><span class="prev p-${k}" aria-hidden="true"></span><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>`;
