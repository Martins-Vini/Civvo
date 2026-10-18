


import './main.js';

const BASE = import.meta.env?.BASE_URL ?? '/';

const PUBLICAS = ['#/inicio', '#/login-user', '#/login-ong', '#/confirmacao-login-ong', '#/cadastro-user', '#/cadastro-ong'];

const CHAVE = 'civvo.sessao';
const PERFIS = { DOADOR: 'doador', ONG: 'ong', ADMIN: 'admin' };

const areaPublica = document.getElementById('app');
const areaLogada = document.getElementById('area-logada');
const linksDoApp = [];
let appCarregando = null;
let appCarregado = false;

export const sessao = {
  ler() {
    try {
      return JSON.parse(sessionStorage.getItem(CHAVE));
    } catch {
      return null;
    }
  },
  entrar(s) {
    sessionStorage.setItem(CHAVE, JSON.stringify(s));
  },
  sair() {
    sessionStorage.removeItem(CHAVE);
  },
};
window.CivvoSessao = sessao;

const modoDemo = () => new URLSearchParams(location.search).has('demo') || import.meta.env?.VITE_DEMO === 'true';

function sessaoDoLogin(perfilPadrao, dados = {}) {
  const usuario = dados.user || dados.usuario || dados.data || {};
  const tipo = String(usuario.user_type || dados.role || dados.perfil || '').toUpperCase();

  return {
    perfil: PERFIS[tipo] || perfilPadrao,
    usuario,
    token: dados.token || null,
  };
}

const telaInicial = (s) => (s.perfil == 'admin' ? '#/admin' : '#/feed');

const fetchOriginal = window.fetch.bind(window);

window.fetch = async (url, opcoes) => {
  const resposta = await fetchOriginal(url, opcoes);

  if (resposta.ok && /\/login-user$/.test(String(url))) {
    const dados = await resposta.clone().json().catch(() => ({}));
    const nova = sessaoDoLogin('doador', dados);
    sessao.entrar(nova);
    location.hash = telaInicial(nova);
  }

  return resposta;
};

function mostrar(logada) {
  window.__civvoPublico = !logada;
  areaPublica.hidden = logada;
  areaLogada.hidden = !logada;
  linksDoApp.forEach((l) => {
    l.disabled = !logada;
  });

  document.documentElement.classList.toggle('area-logada', logada);
  document.body.classList.toggle('area-logada', logada);

  if (!logada) {
    document.title = 'Civvo';
  }
}

function carregarScript(src) {
  return new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = ok;
    s.onerror = () => erro(new Error(`Falha ao carregar ${src}`));
    document.body.append(s);
  });
}

function carregarApp() {
  appCarregando ??= (async () => {
    const html = await (await fetchOriginal(`${BASE}app/index.html`)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const local = (c) => c && !/^(https?:)?\/\//.test(c) && !c.startsWith('/');
    const estilos = [...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href')).filter(local);
    const scripts = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).filter(local);

    estilos.forEach((href) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = `${BASE}app/${href}`;
      document.head.append(l);
      linksDoApp.push(l);
    });

    window.__civvoSessao = sessao.ler();

    for (const src of scripts) {
      await carregarScript(`${BASE}app/${src}`);
    }

    appCarregado = true;
  })().catch((e) => {
    areaLogada.innerHTML = '<p style="padding:24px">Não foi possível carregar o app. Atualize a página.</p>';
    console.error(e);
  });

  return appCarregando;
}

function roteia() {
  const hash = location.hash;

  if (hash === '#/sair') {
    sessao.sair();
    history.replaceState(null, '', `${location.pathname}#/inicio`);
    location.reload();
    return;
  }

  if (PUBLICAS.includes(hash)) {
    mostrar(false);
    return;
  }

  let s = sessao.ler();

  if (!s && modoDemo()) {
    s = { perfil: 'doador', usuario: {}, demo: true };
    sessao.entrar(s);
  }

  if (!s) {
    mostrar(false);
    location.hash = '#/inicio';
    return;
  }

  if (hash === '' || hash === '#/') {
    location.hash = telaInicial(s);
    return;
  }

  const veioDoPublico = window.__civvoPublico !== false;
  mostrar(true);

  if (appCarregado && veioDoPublico) {
    aplicarSessao(s);
  }

  carregarApp();
}

addEventListener('hashchange', roteia);
roteia();
