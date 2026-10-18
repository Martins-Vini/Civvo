/* Moldura das telas internas: menu por perfil (doador, ONG, admin), barra superior no celular, barra inferior e coluna de sugestões.
   Visão (Doador/ONG/Admin) e "Sair" ficam: na lateral (telas largas) ou no Menu (telas médias e celular). */

const NAV = {
  doador: [
    ['feed', 'home', 'Feed'],
    ['buscar', 'search', 'Buscar'],
    ['chats', 'chat', 'Chats'],
    ['avisos', 'bell', 'Avisos'],
    ['perfil', 'user', 'Perfil'],
    ['config', 'gear', 'Config'],
  ],
  ong: [
    ['feed', 'home', 'Feed'],
    ['buscar', 'search', 'Buscar'],
    ['chats', 'chat', 'Chats'],
    ['avisos', 'bell', 'Avisos'],
    ['painel', 'dash', 'Painel'],
    ['perfil', 'user', 'Perfil'],
    ['config', 'gear', 'Config'],
  ],
  admin: [
    ['admin', 'dash', 'Admin'],
    ['avisos', 'bell', 'Avisos'],
    ['config', 'gear', 'Config'],
  ],
};

function setRole(r) {
  ROLE = r;
  if (r == 'admin') {
    location.hash = '#/admin';
  } else if (location.hash == '#/admin') {
    location.hash = '#/feed';
  }
  go();
}

const roleSeg = (close) => {
  if (!MOSTRAR_SELETOR) {
    return '';
  }

  const roles = [
    ['doador', 'Doador'],
    ['ong', 'ONG'],
    ['admin', 'Admin'],
  ];

  const buttonsHtml = roles
    .map(
      (r) =>
        `<button class="${ROLE == r[0] ? 'on' : ''}" onclick="setRole('${r[0]}');${close ? 'closeModal()' : ''}">${r[1]}</button>`
    )
    .join('');

  return `<div class="seg" title="Alternar visão (demonstração)">${buttonsHtml}</div>`;
};

function openMenu() {
  openModal(
    `<h3>Menu</h3>
     <label style="margin-top:0">Visão (demonstração)</label>
     ${roleSeg(1)}
     <a class="btn light full" style="margin-top:22px" href="#/config" onclick="closeModal()">Configurações</a>
     <a class="btn ghost full" style="margin-top:10px" href="${LOGIN_URL}" onclick="closeModal()">Sair</a>`,
    'Menu'
  );
}

function shell(inner, on, { rightCol = 1, wide = 0 } = {}) {
  const nav = NAV[ROLE];

  const navLinks = nav
    .map(
      (n) => `
        <a class="nav ${on == n[0] ? 'on' : ''}" href="#/${n[0]}">
          ${ic(n[1])}
          <span>${n[2]}</span>
          ${n[3] && n[3]() ? '<i class="dot"></i>' : ''}
        </a>
      `
    )
    .join('');

  const createBtn = ROLE == 'ong' 
    ? `<button class="tb-plus" onclick="openCreate()" aria-label="Criar conteúdo">${ic('plus')}</button>` 
    : '';

  const chatBtn = ROLE != 'admin' 
    ? `<a class="tb-m ${on == 'chats' ? 'on' : ''}" href="#/chats" aria-label="Mensagens">${ic('chat')}</a>` 
    : '';

  const rightColHtml = rightCol 
    ? `<aside class="right" aria-label="Sugestões">${sugest()}</aside>` 
    : '';

  const bottomNavItems = BN[ROLE].map((x) => bnItem(x, on)).join('');

  return `
    <div class="app">
      <header class="tbar">
        <button class="tb-m" onclick="openMenu()" aria-label="Abrir menu">${ic('menu')}</button>
        ${logo}
        <div class="tb-r">
          ${createBtn}
          ${chatBtn}
        </div>
      </header>

      <aside class="side ${SIDE_LOCK ? 'trava' : ''}" aria-label="Menu principal">
        ${logo}
        <div style="height:18px"></div>
        ${navLinks}
        <div style="flex:1"></div>
        <div class="side-roles">${roleSeg()}</div>
        <button class="nav menub" onclick="openMenu()" aria-label="Menu">
          ${ic('menu')}
          <span>Menu</span>
        </button>
        <a class="nav" href="${LOGIN_URL}">
          ${ic('out')}
          <span>Sair</span>
        </a>
      </aside>

      <main id="conteudo" class="main ${wide ? 'wide' : ''}">
        ${inner}
      </main>

      ${rightColHtml}
    </div>

    <nav class="bnav n${BN[ROLE].length}" aria-label="Navegação principal">
      ${bottomNavItems}
    </nav>
  `;
}

function sugest() {
  const ok = DONATIONS.filter((d) => d.status == 'APROVADO').length;

  const ongsList = ONGS.slice(0, 3)
    .map((o) => `
      <div class="sg">
        ${av(o.name, o.h, 38)}
        <div>
          ${esc(o.name)}
          <small>${esc(o.cat)}</small>
        </div>
        <button class="btn light sm" onclick="toggleSet(FOLLOW, ${o.id})">
          ${FOLLOW.has(o.id) ? 'Seguindo' : 'Seguir'}
        </button>
      </div>
    `)
    .join('') || '<p style="color:var(--mut)">Nenhuma sugestão por enquanto.</p>';

  return `
    <div class="card sug">
      <h4>ONGs para você</h4>
      ${ongsList}
    </div>
    <div class="card sug">
      <h4>Seu impacto</h4>
      <b style="font-size:26px">${ok}</b> 
      <span style="color:var(--mut)">doações aprovadas</span>
    </div>
  `;
}

/* Barra inferior do celular */
const BN = {
  doador: [
    ['buscar', 'search', 'Buscar'],
    ['avisos', 'bell', 'Avisos'],
    'feed',
    ['config', 'gear', 'Config'],
    'perfil',
  ],
  ong: [
    ['buscar', 'search', 'Buscar'],
    ['painel', 'dash', 'Painel'],
    'feed',
    ['avisos', 'bell', 'Avisos'],
    'perfil',
  ],
  admin: [
    ['avisos', 'bell', 'Avisos'], 
    'admin', 
    ['config', 'gear', 'Config']
  ],
};

const MY = () => {
  if (ROLE == 'ong') {
    const o = ONGS.find((x) => x.id == ME_ONG) || ONGS[0];
    return { 
      n: o ? o.name : 'Sua ONG', 
      h: o ? o.h : 200, 
      s: o && o.logo 
    };
  }
  return { 
    n: nomeDoador(), 
    h: 200, 
    s: USER.avatar_url 
  };
};

const bnItem = (x, on) => {
  if (x == 'feed' || x == 'admin') {
    const isFeed = x == 'feed';
    return `
      <a class="bn-home ${on == x ? 'on' : ''}" href="#/${x}" aria-label="${isFeed ? 'Feed' : 'Admin'}">
        ${ic(isFeed ? 'home' : 'dash')}
      </a>
    `;
  }

  if (x == 'perfil') {
    const m = MY();
    return `
      <a class="bn-av ${on == 'perfil' ? 'on' : ''}" href="#/perfil" aria-label="Perfil">
        ${av(m.n, m.h, 34, m.s)}
      </a>
    `;
  }

  return `
    <a class="${on == x[0] ? 'on' : ''}" href="#/${x[0]}" aria-label="${x[2]}">
      ${ic(x[1])}
    </a>
  `;
};

let SIDE_LOCK = false;

document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('.side a');
  if (a && e.detail > 0) {
    SIDE_LOCK = true;
    a.closest('.side').classList.add('trava');
  }
});

document.addEventListener('mouseover', (e) => {
  if (SIDE_LOCK && e.target.closest && !e.target.closest('.side')) {
    SIDE_LOCK = false;
    const s = document.querySelector('.side');
    if (s) s.classList.remove('trava');
  }
});