/* Página inicial (pública): hero com os botões de entrada + seções institucionais.
   Os textos das seções são lorem ipsum de propósito: é só trocar nas constantes e nos arrays abaixo.
   Os links entre seções rolam via JS (data-ir), porque o roteador do site usa o hash (#/rota). */

import paginaInicialSvg from '../assets/pagina-inicial.svg';
import logoCivvoSvg from '../assets/logo-civvo.svg';

const REPO_URL = 'https://github.com/Martins-Vini/Civvo';

const L1 = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
const L2 = 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.';
const L3 = 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const LC = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod.';

/* ---------- ícones (traço, herdam a cor do texto) ---------- */
const svg = (corpo, t = 22) =>
  `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${corpo}</svg>`;

const ICONE = {
  coracao: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  rede: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
  escudo: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  estrela: svg('<polygon points="12 2 15.1 8.6 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.6 12 2"/>'),
  usuario: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', 26),
  usuarioG: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', 44),
  seta: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18),
  github: svg('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>', 20),
};

/* ---------- conteúdo (troque aqui) ---------- */
const NAV = [
  ['sobre', 'Sobre'],
  ['impactos', 'Impactos'],
  ['etec', 'Etec CT'],
  ['equipe', 'Equipe'],
  ['contribuidores', 'Contribuidores'],
];

const PILARES = [
  [ICONE.coracao, 'Lorem ipsum dolor', LC],
  [ICONE.rede, 'Consectetur adipiscing', LC],
  [ICONE.escudo, 'Sed do eiusmod', LC],
];

/* valor, sufixo, progresso do anel (0 a 1): números de exemplo, troque pelos reais */
const IMPACTOS = [
  [1200, '+', 0.82, 'Lorem ipsum dolor sit'],
  [350, '+', 0.64, 'Consectetur adipiscing'],
  [98, '%', 0.98, 'Sed do eiusmod tempor'],
  [24, '', 0.4, 'Ut labore et dolore'],
];

const EQUIPE = [
  ['Nome Sobrenome', 'Função do integrante'],
  ['Nome Sobrenome', 'Função do integrante'],
  ['Nome Sobrenome', 'Função do integrante'],
  ['Nome Sobrenome', 'Função do integrante'],
];

const CONTRIBUIDORES = 9;

/* ---------- peças de HTML ---------- */
/* onda animada no fim da seção: a cor é a da seção seguinte (--next) */
const ONDA = 'M0 60q180-60 360 0t360 0t360 0t360 0t360 0t360 0t360 0t360 0V120H0Z';
const onda = (proxima) => `
  <div class="lp-onda" style="--next:${proxima}" aria-hidden="true">
    <svg class="lp-onda__t" viewBox="0 0 2880 120" preserveAspectRatio="none"><path d="${ONDA}"/></svg>
    <svg class="lp-onda__f" viewBox="0 0 2880 120" preserveAspectRatio="none"><path d="${ONDA}"/></svg>
  </div>`;

const cabecalho = (n, titulo, sub) => `
  <header class="lp-sec__cab lp-reveal">
    <b class="lp-kicker">${n}</b>
    <h2 class="lp-h2">${titulo}</h2>
    <p class="lp-sub">${sub}</p>
  </header>`;

const ring = (p) => `
  <svg class="lp-stat__anel" viewBox="0 0 80 80" aria-hidden="true" style="--p:${p}">
    <circle class="bg" cx="40" cy="40" r="34"/><circle class="fg" cx="40" cy="40" r="34"/>
  </svg>`;

const chipContrib = (i) => `
  <div class="lp-chipc"><i class="lp-chipc__av">${ICONE.usuario}</i><b>Nome do contribuidor</b></div>`;

const trilho = (inv) => {
  const grupo = (oculto) =>
    `<div class="lp-marquee__grupo"${oculto ? ' aria-hidden="true"' : ''}>${Array.from({ length: CONTRIBUIDORES }, chipContrib).join('')}</div>`;
  return `<div class="lp-marquee${inv ? ' lp-marquee--inv' : ''}"><div class="lp-marquee__trilho">${grupo(false)}${grupo(true)}</div></div>`;
};

function montarHtml() {
  const ano = new Date().getFullYear();

  return `
  <div class="lp" id="lp">
    <div class="lp-progresso" aria-hidden="true"></div>

    <header class="lp-nav" id="lp-nav">
      <div class="lp-nav__in">
        <button type="button" class="lp-nav__marca" data-ir="topo" aria-label="Civvo: voltar ao topo">
          <img src="${logoCivvoSvg}" alt="" width="44" height="48" />
        </button>
        <nav class="lp-nav__links" aria-label="Seções da página">
          ${NAV.map(([id, nome]) => `<button type="button" data-ir="${id}">${nome}</button>`).join('')}
        </nav>
      </div>
    </header>

    <!-- ============ HERO ============ -->
    <section class="lp-hero" data-sec="inicio">
      <div class="lp-hero__bg" aria-hidden="true">
        <div class="lp-orbs">
          <i class="lp-orb lp-orb--1"></i><i class="lp-orb lp-orb--2"></i><i class="lp-orb lp-orb--3"></i>
        </div>
        <div class="lp-grade"></div>
        <div class="lp-particulas"></div>
      </div>

      <div class="lp-hero__inner">
        <div class="lp-hero__texto">
          <h1 class="lp-titulo">
            <span class="lp-palavra" style="--i:0">Olá,</span>
            <span class="lp-palavra" style="--i:1"><em class="lp-grad">Doador!</em></span>
          </h1>
          <p class="lp-lead">Vamos começar?</p>

          <div class="lp-acoes lp-entra" style="--atraso:.85s">
            <a class="lp-btn lp-btn--primario" href="#/login-user" data-magnetico data-rota>
              <b>Entrar</b>${ICONE.seta}
            </a>
            <a class="lp-btn lp-btn--vidro" href="#/cadastro-user" data-magnetico data-rota>
              <b>Cadastrar</b>${ICONE.seta}
            </a>
          </div>

          <p class="lp-ong lp-entra" style="--atraso:1.05s">Você é uma ONG? <a href="#/login-ong" data-rota>Entre por aqui</a></p>
        </div>

        <div class="lp-hero__arte">
          <div class="lp-arte-entra lp-entra" style="--atraso:.4s">
            <div class="lp-disco">
              <img src="${paginaInicialSvg}" alt="Pessoas em volta de um coração" />
            </div>
          </div>
          <i class="lp-chip" style="top:6%;left:8%;--d:-1s">${ICONE.coracao}</i>
          <i class="lp-chip" style="top:20%;right:2%;--d:-2.5s">${ICONE.rede}</i>
          <i class="lp-chip" style="bottom:8%;left:2%;--d:-4s">${ICONE.estrela}</i>
        </div>
      </div>

      <button type="button" class="lp-rolar" data-ir="sobre" aria-label="Rolar para conhecer o projeto"></button>
      ${onda('var(--bg)')}
    </section>

    <!-- ============ SOBRE O PROJETO ============ -->
    <section class="lp-sec lp-sec--claro" id="lp-sobre" data-sec="sobre" aria-labelledby="t-sobre">
      <div class="lp-wrap">
        ${cabecalho('01', '<span id="t-sobre">Sobre o Projeto</span>', L1)}
        <div class="lp-sobre">
          <div class="lp-reveal" data-dir="left">
            <p class="lp-corpo lp-corpo--capitular">${L2}</p>
            <p class="lp-corpo">${L3}</p>
            <p class="lp-corpo">${L1}</p>
          </div>
          <div class="lp-pilares">
            ${PILARES.map(
              ([ico, titulo, texto], i) => `
              <article class="lp-card lp-reveal" data-dir="right" style="--d:${i}">
                <div class="lp-card__in" data-tilt>
                  <i class="lp-ico">${ico}</i>
                  <h3>${titulo}</h3>
                  <p>${texto}</p>
                </div>
              </article>`
            ).join('')}
          </div>
        </div>
      </div>
      ${onda('var(--ink-g)')}
    </section>

    <!-- ============ IMPACTOS ============ -->
    <section class="lp-sec lp-sec--escuro" id="lp-impactos" data-sec="impactos" aria-labelledby="t-impactos">
      <div class="lp-wrap">
        ${cabecalho('02', '<span id="t-impactos">Impactos da Nossa Rede Social</span>', L1)}
        <div class="lp-stats">
          ${IMPACTOS.map(
            ([valor, sufixo, p, rotulo], i) => `
            <article class="lp-stat lp-reveal" data-dir="zoom" style="--d:${i}">
              <div class="lp-stat__in" data-tilt>
                ${ring(p)}
                <strong class="lp-stat__num"><b data-contar="${valor}">0</b><em>${sufixo}</em></strong>
                <p>${rotulo}</p>
              </div>
            </article>`
          ).join('')}
        </div>
        <p class="lp-nota lp-reveal">${L3}</p>
      </div>
      ${onda('var(--bg)')}
    </section>

    <!-- ============ ETEC CT ============ -->
    <section class="lp-sec lp-sec--claro" id="lp-etec" data-sec="etec" aria-labelledby="t-etec">
      <div class="lp-wrap lp-etec">
        <div>
          ${cabecalho('03', '<span id="t-etec">Sobre a Etec CT</span>', L1)}
          <p class="lp-selo lp-reveal">${ICONE.estrela}<b>Informática para Internet</b></p>
          <div class="lp-reveal" style="--d:1">
            <p class="lp-corpo">${L2}</p>
            <p class="lp-corpo">${L3}</p>
          </div>
        </div>

        <div class="lp-janela lp-reveal" data-dir="right" aria-hidden="true">
          <div class="lp-janela__barra"><i></i><i></i><i></i><b>etec-ct.html</b></div>
          <pre class="lp-codigo"><code>
<span class="l" style="--i:0"><em class="c">&lt;!-- lorem ipsum dolor sit amet --&gt;</em></span>
<span class="l" style="--i:1"><em class="t">&lt;section</em> <em class="a">class</em>=<em class="s">"etec"</em><em class="t">&gt;</em></span>
<span class="l" style="--i:2">  <em class="t">&lt;h1&gt;</em>Etec CT<em class="t">&lt;/h1&gt;</em></span>
<span class="l" style="--i:3">  <em class="t">&lt;p&gt;</em>Informática para Internet<em class="t">&lt;/p&gt;</em></span>
<span class="l" style="--i:4">  <em class="t">&lt;a</em> <em class="a">href</em>=<em class="s">"#/civvo"</em><em class="t">&gt;</em>Civvo<em class="t">&lt;/a&gt;</em></span>
<span class="l" style="--i:5"><em class="t">&lt;/section&gt;</em><b class="cursor"></b></span></code></pre>
        </div>
      </div>
      ${onda('var(--soft)')}
    </section>

    <!-- ============ EQUIPE ============ -->
    <section class="lp-sec lp-sec--tint" id="lp-equipe" data-sec="equipe" aria-labelledby="t-equipe">
      <div class="lp-wrap">
        ${cabecalho('04', '<span id="t-equipe">Sobre Nossa Equipe</span>', L1)}
        <div class="lp-equipe">
          ${EQUIPE.map(
            ([nome, funcao], i) => `
            <article class="lp-membro lp-reveal" style="--d:${i}">
              <div class="lp-membro__in" data-tilt>
                <i class="lp-avatar">${ICONE.usuarioG}</i>
                <h3>${nome}</h3>
                <b class="lp-funcao">${funcao}</b>
                <p>${LC}</p>
              </div>
            </article>`
          ).join('')}
        </div>
      </div>
      ${onda('var(--ink-g)')}
    </section>

    <!-- ============ CONTRIBUIDORES ============ -->
    <section class="lp-sec lp-sec--escuro" id="lp-contribuidores" data-sec="contribuidores" aria-labelledby="t-contrib">
      <div class="lp-wrap">
        ${cabecalho('05', '<span id="t-contrib">Contribuidores</span>', L1)}
      </div>
      <div class="lp-reveal" data-dir="zoom">
        ${trilho(false)}
        ${trilho(true)}
      </div>
      <div class="lp-wrap">
        <div class="lp-cta lp-reveal">
          <div>
            <h3>Quer fazer parte?</h3>
            <p>${LC}</p>
          </div>
          <a class="lp-btn lp-btn--primario" href="${REPO_URL}" target="_blank" rel="noopener noreferrer" data-magnetico>
            ${ICONE.github}<b>Ver no GitHub</b>
          </a>
        </div>
      </div>
      ${onda('var(--ink-fim)')}
    </section>

    <footer class="lp-rodape">
      <img src="${logoCivvoSvg}" alt="" width="44" height="48" />
      <p>© ${ano} Civvo · Etec CT · Informática para Internet</p>
      <button type="button" class="lp-topo" data-ir="topo">Voltar ao topo</button>
    </footer>
  </div>`;
}

/* ---------- efeitos ---------- */
let limpezas = [];

/* desfaz listeners, observers e animações da home (chamado pelo roteador ao sair dela) */
export function limparPaginaInicial() {
  limpezas.forEach((f) => {
    try {
      f();
    } catch {
      /* nada a fazer */
    }
  });
  limpezas = [];
  document.body.classList.remove('is-home');
}

function particulas(caixa) {
  const n = window.innerWidth < 700 ? 12 : 22;
  caixa.innerHTML = Array.from({ length: n }, (_, i) => {
    const d = 10 + Math.random() * 14;
    const estilo = `--x:${(Math.random() * 100).toFixed(1)}%;--s:${(6 + Math.random() * 16).toFixed(1)}px;--d:${d.toFixed(1)}s;--t:${(-Math.random() * d).toFixed(1)}s;--o:${(0.25 + Math.random() * 0.45).toFixed(2)}`;
    const coracao = i % 4 === 0;
    return `<i class="lp-part${coracao ? ' lp-part--c' : ''}" style="${estilo}">${coracao ? '♥' : ''}</i>`;
  }).join('');
}

function iniciarEfeitos(root) {
  const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ac = new AbortController();
  const { signal } = ac;
  const rafs = new Set();
  const observers = [];

  limpezas.push(() => {
    ac.abort();
    rafs.forEach(cancelAnimationFrame);
    observers.forEach((o) => o.disconnect());
  });

  const nav = root.querySelector('#lp-nav');
  const hero = root.querySelector('.lp-hero');

  if (!reduz) particulas(root.querySelector('.lp-particulas'));

  /* contador dos números de impacto */
  const contar = (el) => {
    const alvo = Number(el.dataset.contar);
    const fmt = (v) => v.toLocaleString('pt-BR');
    if (reduz) {
      el.textContent = fmt(alvo);
      return;
    }
    const t0 = performance.now();
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / 1700);
      el.textContent = fmt(Math.round(alvo * (k === 1 ? 1 : 1 - Math.pow(2, -10 * k))));
      if (k < 1) rafs.add(requestAnimationFrame(passo));
    };
    rafs.add(requestAnimationFrame(passo));
  };

  /* revelar ao rolar */
  const revelar = [...root.querySelectorAll('.lp-reveal')];
  if (reduz || !('IntersectionObserver' in window)) {
    revelar.forEach((el) => el.classList.add('is-in'));
    root.querySelectorAll('[data-contar]').forEach(contar);
  } else {
    const io = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          e.target.querySelectorAll('[data-contar]').forEach(contar);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revelar.forEach((el) => io.observe(el));
    observers.push(io);
  }

  /* seção ativa no menu */
  const botoes = [...nav.querySelectorAll('[data-ir]')];
  if ('IntersectionObserver' in window) {
    const ioSec = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) botoes.forEach((b) => b.classList.toggle('is-ativo', b.dataset.ir === e.target.dataset.sec));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    root.querySelectorAll('[data-sec]').forEach((s) => ioSec.observe(s));
    observers.push(ioSec);
  }

  /* barra de progresso + menu que ganha fundo ao rolar */
  let esperando = false;
  const aoRolar = () => {
    if (esperando) return;
    esperando = true;
    rafs.add(
      requestAnimationFrame(() => {
        esperando = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty('--prog', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
        nav.classList.toggle('is-solido', window.scrollY > 60);
      })
    );
  };
  window.addEventListener('scroll', aoRolar, { passive: true, signal });
  aoRolar();

  /* rolagem suave entre seções (e transição de saída ao ir para login/cadastro) */
  root.addEventListener(
    'click',
    (e) => {
      const ir = e.target.closest('[data-ir]');
      if (ir) {
        e.preventDefault();
        const id = ir.dataset.ir;
        const comportamento = reduz ? 'auto' : 'smooth';
        if (id === 'topo') window.scrollTo({ top: 0, behavior: comportamento });
        else root.querySelector(`#lp-${id}`)?.scrollIntoView({ behavior: comportamento, block: 'start' });
        return;
      }

      const rota = e.target.closest('a[data-rota]');
      if (rota && !reduz && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
        e.preventDefault();
        root.classList.add('is-saindo');
        setTimeout(() => {
          window.location.hash = rota.getAttribute('href');
        }, 380);
      }
    },
    { signal }
  );

  if (reduz) return;

  /* parallax do hero seguindo o mouse */
  hero.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--rx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      hero.style.setProperty('--ry', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    },
    { signal }
  );
  hero.addEventListener(
    'pointerleave',
    () => {
      hero.style.setProperty('--rx', '0');
      hero.style.setProperty('--ry', '0');
    },
    { signal }
  );

  /* botões "magnéticos" com brilho que segue o cursor */
  root.querySelectorAll('[data-magnetico]').forEach((el) => {
    el.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((e.clientX - (r.left + r.width / 2)) * 0.18).toFixed(1)}px`);
        el.style.setProperty('--my', `${((e.clientY - (r.top + r.height / 2)) * 0.28).toFixed(1)}px`);
        el.style.setProperty('--px', `${(e.clientX - r.left).toFixed(0)}px`);
        el.style.setProperty('--py', `${(e.clientY - r.top).toFixed(0)}px`);
      },
      { signal }
    );
    el.addEventListener(
      'pointerleave',
      () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      },
      { signal }
    );
  });

  /* cartões que inclinam em 3D */
  root.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--tilt-y', `${((x - 0.5) * 10).toFixed(2)}deg`);
        el.style.setProperty('--tilt-x', `${((0.5 - y) * 10).toFixed(2)}deg`);
        el.style.setProperty('--gx', `${(x * 100).toFixed(0)}%`);
        el.style.setProperty('--gy', `${(y * 100).toFixed(0)}%`);
      },
      { signal }
    );
    el.addEventListener(
      'pointerleave',
      () => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      },
      { signal }
    );
  });
}

export function renderPaginaInicial() {
  limparPaginaInicial();
  document.body.classList.add('is-home');

  const app = document.getElementById('app');
  app.innerHTML = montarHtml();
  iniciarEfeitos(app.querySelector('.lp'));
}
