import { renderLoginUser } from './pages/login-user.js';
import { renderLoginOng } from './pages/login-ong.js';
import { renderCadastroUser } from './pages/cadastro-user.js';
import { renderCadastroOng } from './pages/cadastro-ong.js';
import paginaInicialSvg from './assets/pagina-inicial.svg';
import logoCivvoSvg from './assets/logo-civvo.svg';

function renderPaginaInicial() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <header class="topbar">
      <img class="logo-civvo" src="${logoCivvoSvg}" alt="Pessoas em volta de um coração">
    </header>
    <main class="home">
      <h1 class="titulo-principal">Olá, <br><span>Doador!</span></h1>
      <img src="${paginaInicialSvg}" alt="Pessoas em volta de um coração">
      <p>Vamos começar?</p>

      <a class="entrar-btn" href="#/login-user">Entrar</a>
      <a class="cadastrar-btn" href="#/cadastro-user">Cadastrar</a>

      <p class="login-alternativo">Você é uma ONG? <a href="#/login-ong">Entre por aqui</a></p>

    </main>
  `;
}

const routes = {
  '#/inicio': renderPaginaInicial,
  '#/login-user': renderLoginUser,
  '#/login-ong': renderLoginOng,
  '#/cadastro-user': renderCadastroUser,
  '#/cadastro-ong': renderCadastroOng,
};

function renderCurrentRoute() {
  const hash = window.location.hash || '#/inicio';
  const route = routes[hash];

  if (route) {
    route();
    return;
  }

  renderPaginaInicial();
}

window.addEventListener('hashchange', renderCurrentRoute);
renderCurrentRoute();