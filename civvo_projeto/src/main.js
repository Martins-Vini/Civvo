import { renderLoginUser } from './pages/login-user.js';
import { renderLoginOng } from './pages/login-ong.js';
import { renderLoginAdmin } from './pages/login-admin.js';
import { renderCadastroUser } from './pages/cadastro-user.js';
import { renderCadastroOng } from './pages/cadastro-ong.js';
import { renderRedefinirSenha } from './pages/redefinir-senha.js';
import { renderPaginaInicial, limparPaginaInicial } from './pages/pagina-inicial.js';
import { lerSessao } from './services/sessao.js';

const routes = {
  '#/inicio': renderPaginaInicial,
  '#/login-user': renderLoginUser,
  '#/login-ong': renderLoginOng,
  '#/login-admin': renderLoginAdmin, /* sem link na tela inicial: acesso só pelo endereço */
  '#/cadastro-user': renderCadastroUser,
  '#/cadastro-ong': renderCadastroOng,
  '#/redefinir-senha': () => renderRedefinirSenha('user'),
  '#/redefinir-senha-ong': () => renderRedefinirSenha('ong'),
};

function renderCurrentRoute() {
  const hash = window.location.hash || '#/inicio';
  const route = routes[hash];

  /* desfaz os efeitos (scroll, observers) da home antes de trocar de tela */
  limparPaginaInicial();

  if (route) {
    window.scrollTo(0, 0);
    route();
    return;
  }

  /* hash desconhecido: com sessão é rota do app logado (quem cuida é o bridge.js), então não desenha a home por baixo */
  if (lerSessao()) return;

  window.scrollTo(0, 0);
  renderPaginaInicial();
}

window.addEventListener('hashchange', renderCurrentRoute);
renderCurrentRoute();