/* Tela: feed com Momentos e postagens. */

const emptySt = () =>
  '<div class="st" aria-hidden="true"><div class="ring e"></div></div>'.repeat(5);

const skel = () => {
  if (DEMO) {
    setTimeout(() => {
      FEED = 1;
      go();
    }, 700);
  } else {
    carregarFeedReal();
  }

  const storiesSkel = '<div class="st"><div class="sk av" style="width:64px;height:64px"></div></div>'.repeat(5);
  const postsSkel = '<div class="card post" style="padding:16px" aria-busy="true"><div class="sk" style="height:18px;width:40%;margin-bottom:14px"></div><div class="sk" style="aspect-ratio:16/10"></div><div class="sk" style="height:14px;width:70%;margin-top:14px"></div></div>'.repeat(2);

  return shell(
    `<div class="top"><h2>Momentos</h2></div>
     <div class="stories">${storiesSkel}</div>
     ${postsSkel}`,
    'feed'
  );
};

const feedErro = () =>
  shell(
    `<div class="top"><h2>Momentos</h2></div>
     <div class="card emp" role="alert">
       <p>${esc(FEED_ERRO)}</p>
       <button class="btn sm" onclick="recarregarFeed()">Tentar de novo</button>
     </div>`,
    'feed'
  );

V.feed = () => {
  if (!FEED) return FEED_ERRO ? feedErro() : skel();

  const isOng = ROLE == 'ong';
  const grupos = momGroups();

  const storyCreateBtn = isOng
    ? `<button class="st" onclick="openCreate('MOMENTO')" aria-label="Novo momento"><div class="ring e plus">${lc('plus', 26)}</div>Novo</button>`
    : '';

  const storiesHtml = grupos
    .map((g) => {
      const o = ong(g.o);
      if (!o) return '';
      const label = g.own ? 'Eu' : esc(o.name.split(' ')[0]);
      return `
        <div class="st" role="button" tabindex="0" onclick="abrirMomentos(${g.o})"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirMomentos(${g.o})}"
             aria-label="Ver momentos de ${esc(o.name)}${g.vistos ? '' : ' (novos)'}">
          <div class="mring ${g.vistos ? 'seen' : ''}">${av(o.name, o.h, 58, o.logo)}</div>
          ${label}
        </div>
      `;
    })
    .join('');

  const postsHtml = feedPosts() || '<div class="card emp">Ainda não há nenhum post por aqui.</div>';

  return shell(
    `<div class="top">
       <h2>Momentos</h2>
     </div>
     ${
       isOng || grupos.length
         ? `<div class="stories">${storyCreateBtn}${storiesHtml}</div>`
         : '<p class="emp" role="status">Ainda não há momentos postados.</p>'
     }
     ${postsHtml}
     ${feedFim()}`,
    'feed'
  );
};

const PAG = 8;
let FEED_N = PAG;

const feedPosts = () => POSTS.slice(0, FEED_N).map(postH).join('');

const feedFim = () => {
  if (POSTS.length > FEED_N) {
    return '<p id="mais" class="mais" role="status"><span class="spin" aria-hidden="true"></span> Carregando mais…</p>';
  }
  return POSTS.length ? '<p>Fim do seu Feed</p>' : '';
};

function maisRetry() {
  const m = document.getElementById('mais');
  if (m) {
    m.innerHTML = '<span class="spin" aria-hidden="true"></span> Carregando mais…';
  }
  observarMais();
}

function observarMais() {
  const el = document.getElementById('mais');
  if (!el || !('IntersectionObserver' in window)) return;

  new IntersectionObserver(
    async (es, ob) => {
      if (!es[0].isIntersecting) return;
      ob.disconnect();

      try {
        await chamar();
      } catch (e) {
        el.innerHTML = 'Não foi possível carregar. <button class="lk" style="margin:0" onclick="maisRetry()">Tentar de novo</button>';
        return;
      }

      const m = document.getElementById('mais');
      if (!m) return;

      const de = FEED_N;
      FEED_N += PAG;
      m.insertAdjacentHTML('beforebegin', POSTS.slice(de, FEED_N).map(postH).join(''));

      if (POSTS.length > FEED_N) {
        observarMais();
      } else {
        m.outerHTML = '<p>Fim do seu Feed</p>';
      }
    },
    { rootMargin: '400px' }
  ).observe(el);
}

/* =====================================================================
   ÍCONES (Lucide) — lc('nome', tamanho)
   Usa a biblioteca instalada se o bridge.js expuser window.LUCIDE_SVG (ver instruções);
   senão usa os traços embutidos abaixo, que são os mesmos ícones do Lucide.
   ===================================================================== */
const LC_SVG = {
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  reply: '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  'triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'circle-alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  'zoom-in': '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
  'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'building-2': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  'clipboard-list': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="m7 18 1.5-1.5"/><path d="M3 4h8"/><path d="M12 4h2l6 6"/>',
};

const lc = (nome, tam = 20) => {
  let ext = '';
  try {
    ext = window.LUCIDE_SVG ? window.LUCIDE_SVG(nome) : '';
  } catch (e) {
    ext = '';
  }
  if (ext) {
    return ext
      .replace(/width="[^"]*"/, `width="${tam}"`)
      .replace(/height="[^"]*"/, `height="${tam}"`)
      .replace('<svg', '<svg aria-hidden="true" focusable="false"');
  }
  return `<svg class="lc" xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${LC_SVG[nome] || ''}</svg>`;
};

/* =====================================================================
   IMAGENS: só aparece foto que a própria pessoa enviou pelo app (Cloudinary).
   Qualquer outro endereço (serviços de imagem aleatória, foto importada de conta externa, dados de
   teste) é ignorado, e o padrão é a sigla da ONG / do nome com a cor azul do Civvo.
   ===================================================================== */
const IMG_HOSTS = ['res.cloudinary.com'];

const imgOk = (u) => {
  if (!u || typeof u !== 'string') return '';
  if (/^(data:image\/|blob:)/i.test(u)) return u; /* prévias locais */
  try {
    return IMG_HOSTS.includes(new URL(u).hostname) ? u : '';
  } catch (e) {
    return '';
  }
};

/* "AACD IBIRAPUERA" -> "AI" */
const siglaDe = (nome) =>
  String(nome || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/* grupo de opções (no lugar do menu suspenso preto do navegador): guarda o valor num campo escondido */
const opcoesSeg = (id, itens, atual, rotulo = 'Opções') =>
  `<input type="hidden" id="${id}" value="${esc(atual)}">
   <div class="seg" role="group" aria-label="${esc(rotulo)}">${itens
     .map(([v, l, ic]) => `<button type="button" class="${v == atual ? 'on' : ''}" aria-pressed="${v == atual}" onclick="setOpc('${id}', '${esc(v)}', this)">${ic ? lc(ic, 15) : ''}${l}</button>`)
     .join('')}</div>`;

function setOpc(id, v, b) {
  const campo = document.getElementById(id);
  if (campo) campo.value = v;
  b.parentElement.querySelectorAll('button').forEach((x) => {
    x.classList.toggle('on', x === b);
    x.setAttribute('aria-pressed', x === b);
  });
}

(() => {
  if (document.getElementById('civvo-ui-css')) return;
  const st = document.createElement('style');
  st.id = 'civvo-ui-css';
  st.textContent = `
    .seg button{display:inline-flex;align-items:center;gap:6px}
    .seg.wrap{flex-wrap:wrap}

    /* seletor de arquivos (no lugar do botão "Escolher arquivo" do navegador) */
    .dz{display:flex;flex-direction:column;align-items:center;gap:6px;padding:22px 16px;margin-top:6px;border:2px dashed rgba(127,127,127,.5);border-radius:14px;text-align:center;cursor:pointer;color:var(--mut);transition:border-color .15s,background .15s,color .15s}
    .dz:hover,.dz.on,.dz:focus-visible{border-color:#b7e7ff;background:rgba(183,231,255,.08);color:inherit;outline:none}
    .dz .dz-ic{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:rgba(183,231,255,.14);color:#6fc3e8}
    .dz b{font-size:14px;color:inherit}
    .dz small{font-size:12px;color:var(--mut)}
    .dz input{display:none}

    .md-h{display:flex;align-items:center;gap:8px}
    .md-l{display:flex;align-items:center;gap:6px}
    .md-l .lc{color:var(--mut)}

    /* capa/tile padrão das publicações sem imagem: sigla em azul do Civvo */
    .pm-default{aspect-ratio:21/9;display:grid;place-items:center;background:linear-gradient(135deg,#2d4f61,#39677e)}
    .pm-sig{font-size:clamp(40px,9vw,64px);font-weight:800;letter-spacing:3px;color:rgba(255,255,255,.92)}
  `;
  document.head.appendChild(st);
})();

/* =====================================================================
   MOMENTOS (stories) — moldura, visualizador, "visto" e exclusão
   ===================================================================== */
const MOM_VISTOS = new Set(); /* chaves dos momentos que eu já vi */
const MOM_SEG = 5000; /* tempo de cada foto, em ms */

(() => {
  if (document.getElementById('civvo-mv-css')) return;
  const st = document.createElement('style');
  st.id = 'civvo-mv-css';
  st.textContent = `
    .lc{flex:none;vertical-align:middle}
    .ic-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;padding:5px;border-radius:8px;margin:0 4px 0 0;color:var(--mut)}
    .ic-btn:hover{color:inherit;background:rgba(127,127,127,.18)}
    .ic-btn.bad:hover{color:var(--bad,#e5484d)}

    /* moldura de momento (colorida = novo, cinza = já visto) */
    .mring,.pf-story{position:relative;display:inline-grid;place-items:center;padding:5px;border-radius:50%;cursor:pointer}
    .mring::before,.pf-story::before{content:"";position:absolute;inset:0;border-radius:50%;padding:3px;
      background:linear-gradient(45deg,#f9ce34,#ee2a7b 55%,#6228d7);
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
      mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;pointer-events:none}
    .mring.seen::before,.pf-story.seen::before{background:#6b7280;opacity:.75}
    .pf-story{display:inline-flex;margin-top:-56px}
    .pf-story > *{margin-top:0 !important}
    .st[role="button"]{cursor:pointer}

    /* visualizador */
    body.mv-open{overflow:hidden}
    .mv{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;gap:18px;background:rgba(0,0,0,.95);color:#fff;animation:mvIn .18s ease}
    @keyframes mvIn{from{opacity:0}to{opacity:1}}
    .mv-card{position:relative;height:min(94vh,860px);aspect-ratio:9/16;max-width:100vw;background:#111;border-radius:14px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.6)}
    .mv-stage{position:absolute;inset:0;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}
    .mv-stage img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
    .mv-stage.falhou::after{content:"Imagem indisponível";position:absolute;inset:0;display:grid;place-items:center;color:#aaa;font-size:14px}
    .mv-top{position:absolute;left:0;right:0;top:0;padding:10px 12px 30px;background:linear-gradient(rgba(0,0,0,.65),transparent);pointer-events:none}
    .mv-top button{pointer-events:auto}
    .mv-bars{display:flex;gap:4px;margin-bottom:10px}
    .mv-bar{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.35);overflow:hidden}
    .mv-bar b{display:block;height:100%;width:0;background:#fff}
    .mv-head{display:flex;align-items:center;gap:6px}
    .mv-who{display:flex;align-items:center;gap:10px;flex:1;min-width:0;background:none;border:0;color:inherit;padding:0;cursor:pointer;text-align:left;font:inherit}
    .mv-who b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mv-who small{opacity:.8;font-weight:400;margin-left:6px}
    .mv-btn{background:none;border:0;color:#fff;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;cursor:pointer;flex:none}
    .mv-btn:hover{background:rgba(255,255,255,.18)}
    .mv-btn:disabled{opacity:.4;cursor:default}
    .mv-bot{position:absolute;left:0;right:0;bottom:0;padding:56px 14px 14px;background:linear-gradient(transparent,rgba(0,0,0,.78));pointer-events:none}
    .mv-cap{margin:0 0 10px;font-size:15px;line-height:1.4;text-shadow:0 1px 3px rgba(0,0,0,.6);word-break:break-word}
    .mv-reply{display:flex;gap:8px;align-items:center;pointer-events:auto}
    .mv-reply input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.5);background:transparent;color:#fff;border-radius:999px;padding:10px 16px;font:inherit}
    .mv-reply input::placeholder{color:rgba(255,255,255,.7)}
    .mv-x{position:fixed;top:14px;right:16px;z-index:2}
    .mv-nav{background:rgba(255,255,255,.16);width:44px;height:44px;flex:none}
    .mv-menu{position:absolute;top:66px;right:10px;z-index:5;background:#1c1c1e;border-radius:12px;padding:6px;min-width:190px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
    .mv-menu button{display:flex;align-items:center;gap:10px;width:100%;background:none;border:0;color:#fff;padding:10px 12px;border-radius:8px;cursor:pointer;font:inherit}
    .mv-menu button:hover{background:rgba(255,255,255,.1)}
    .mv-menu .perigo{color:#ff6b6b}
    .mv-confirm{position:absolute;inset:0;z-index:6;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:24px}
    .mv-confirm > div{background:#1c1c1e;border-radius:16px;padding:20px;text-align:center;max-width:300px;width:100%}
    .mv-confirm p{margin:0 0 16px}
    .mv-confirm .acoes{display:flex;gap:10px}
    .mv-confirm .acoes button{flex:1;border:0;border-radius:10px;padding:11px;font:inherit;font-weight:600;cursor:pointer;background:#2c2c2e;color:#fff}
    .mv-confirm .acoes .perigo{background:#e5484d}
    .mv-aviso{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);z-index:7;background:rgba(28,28,30,.95);padding:10px 16px;border-radius:999px;font-size:14px;white-space:nowrap}
    @media (max-width:600px){
      .mv{gap:0}
      .mv-card{height:100%;width:100%;aspect-ratio:auto;border-radius:0}
      .mv-nav{display:none}
    }
    @media (prefers-reduced-motion:reduce){.mv{animation:none}}
  `;
  document.head.appendChild(st);
})();

const momKey = (m) => (m.id != null ? 'm' + m.id : 's' + m.src);
const momVisto = (m) => MOM_VISTOS.has(momKey(m));

/* grupos de momentos por ONG: o meu primeiro, depois os novos, depois os já vistos */
function momGroups() {
  return STORIES.map((s) => {
    const imgs = [...s.imgs].sort((a, b) => (a.criado || 0) - (b.criado || 0));
    return {
      o: s.o,
      imgs,
      own: ROLE == 'ong' && s.o == ME_ONG,
      vistos: imgs.every(momVisto),
      ultimo: imgs.length ? imgs[imgs.length - 1].criado || 0 : 0,
    };
  })
    .filter((g) => g.imgs.length)
    .sort((a, b) => b.own - a.own || a.vistos - b.vistos || b.ultimo - a.ultimo);
}

let MV = null;

function momMarcarVisto(m) {
  const k = momKey(m);
  if (MOM_VISTOS.has(k)) return;
  MOM_VISTOS.add(k);
  if (MV) MV.mudou = true;
  if (!DEMO && m.id != null) API.marcarMomentoVisto(m.id).catch(() => {});
}

function abrirMomentos(ongId) {
  const grupos = momGroups();
  const g = grupos.findIndex((x) => x.o == ongId);
  if (g < 0) return;

  const primeiroNovo = grupos[g].imgs.findIndex((m) => !momVisto(m));
  MV = { grupos, g, i: primeiroNovo < 0 ? 0 : primeiroNovo, t0: 0, resto: MOM_SEG, pausado: false, raf: 0, menu: false, confirmando: false, mudou: false, foco: document.activeElement };

  let root = document.getElementById('mv');
  if (!root) {
    root = document.createElement('div');
    root.id = 'mv';
    root.className = 'mv';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Momentos');
    document.body.appendChild(root);
  }
  document.body.classList.add('mv-open');
  document.addEventListener('keydown', mvTecla);
  mvDesenhar();
  root.querySelector('.mv-x')?.focus();
}

function mvDesenhar() {
  const root = document.getElementById('mv');
  if (!root || !MV) return;

  const grp = MV.grupos[MV.g];
  const m = grp.imgs[MV.i];
  const o = ong(grp.o) || { name: 'ONG', h: 0 };

  momMarcarVisto(m);
  MV.menu = false;
  MV.confirmando = false;
  MV.pausado = false;
  cancelAnimationFrame(MV.raf);

  const barras = grp.imgs
    .map((_, k) => `<span class="mv-bar"><b style="width:${k < MV.i ? 100 : 0}%"></b></span>`)
    .join('');

  const quando = m.criado ? tempoRelativo(m.criado) : '';

  root.innerHTML = `
    <button class="mv-btn mv-x" aria-label="Fechar" title="Fechar" onclick="mvFechar()">${lc('x', 26)}</button>
    <button class="mv-btn mv-nav" aria-label="Anterior" title="Anterior" onclick="mvAnt()">${lc('chevron-left', 26)}</button>
    <div class="mv-card">
      <div class="mv-stage" id="mvStage"><img src="${esc(m.src)}" alt="Momento de ${esc(o.name)}" onerror="this.style.display='none';this.parentNode.classList.add('falhou')"></div>
      <div class="mv-top">
        <div class="mv-bars">${barras}</div>
        <div class="mv-head">
          <button class="mv-who" onclick="mvPerfil()" aria-label="Abrir perfil de ${esc(o.name)}">
            ${av(o.name, o.h, 34, o.logo)}
            <span style="min-width:0"><b>${esc(o.name)}</b><small>${esc(quando)}</small></span>
          </button>
          <button class="mv-btn" id="mvPlay" aria-label="Pausar" title="Pausar" onclick="mvPausar(!MV.pausado)">${lc('pause', 20)}</button>
          ${grp.own ? `<button class="mv-btn" aria-label="Mais opções" title="Mais opções" onclick="mvMenu()">${lc('ellipsis', 22)}</button>` : ''}
        </div>
      </div>
      <div class="mv-bot">
        ${m.caption ? `<p class="mv-cap">${esc(m.caption)}</p>` : ''}
        ${grp.own ? '' : `<div class="mv-reply">
            <input disabled aria-label="Responder ao momento" placeholder="Responder…" title="As respostas pelo chat chegam em breve">
            <button class="mv-btn" disabled aria-label="Enviar resposta" title="Em breve">${lc('send', 22)}</button>
          </div>`}
      </div>
    </div>
    <button class="mv-btn mv-nav" aria-label="Próximo" title="Próximo" onclick="mvProx()">${lc('chevron-right', 26)}</button>
  `;

  mvLigarToque();
  mvIniciar(MOM_SEG);

  /* pré-carrega a próxima foto */
  const prox = grp.imgs[MV.i + 1] || (MV.grupos[MV.g + 1] && MV.grupos[MV.g + 1].imgs[0]);
  if (prox) new Image().src = prox.src;
}

function mvIniciar(resto) {
  if (!MV) return;
  cancelAnimationFrame(MV.raf);
  MV.resto = resto;
  MV.t0 = performance.now();

  const passo = (t) => {
    if (!MV || MV.pausado) return;
    const falta = MV.resto - (t - MV.t0);
    const pct = Math.max(0, Math.min(100, 100 - (falta / MOM_SEG) * 100));
    const b = document.querySelectorAll('#mv .mv-bar b')[MV.i];
    if (b) b.style.width = pct + '%';
    if (falta <= 0) return mvProx();
    MV.raf = requestAnimationFrame(passo);
  };
  MV.raf = requestAnimationFrame(passo);
}

function mvPausar(p) {
  if (!MV || MV.pausado === p) return;
  if (p) {
    MV.pausado = true;
    cancelAnimationFrame(MV.raf);
    MV.resto -= performance.now() - MV.t0;
  } else {
    MV.pausado = false;
    mvIniciar(MV.resto);
  }
  const btn = document.getElementById('mvPlay');
  if (btn) {
    btn.innerHTML = lc(p ? 'play' : 'pause', 20);
    btn.setAttribute('aria-label', p ? 'Continuar' : 'Pausar');
    btn.title = p ? 'Continuar' : 'Pausar';
  }
}

function mvProx() {
  if (!MV) return;
  const grp = MV.grupos[MV.g];
  if (MV.i < grp.imgs.length - 1) {
    MV.i++;
  } else if (MV.g < MV.grupos.length - 1) {
    MV.g++;
    const n = MV.grupos[MV.g].imgs.findIndex((m) => !momVisto(m));
    MV.i = n < 0 ? 0 : n;
  } else {
    return mvFechar();
  }
  mvDesenhar();
}

function mvAnt() {
  if (!MV) return;
  if (MV.i > 0) {
    MV.i--;
  } else if (MV.g > 0) {
    MV.g--;
    MV.i = 0;
  }
  mvDesenhar();
}

/* toque: esquerda volta, o resto avança; segurar pausa */
function mvLigarToque() {
  const st = document.getElementById('mvStage');
  if (!st) return;
  let seg = null;
  let segurou = false;

  st.addEventListener('pointerdown', () => {
    segurou = false;
    clearTimeout(seg);
    seg = setTimeout(() => {
      segurou = true;
      mvPausar(true);
    }, 220);
  });

  const soltar = (ev) => {
    clearTimeout(seg);
    if (segurou) {
      segurou = false;
      mvPausar(false);
      return;
    }
    if (ev.type !== 'pointerup') return;
    const r = st.getBoundingClientRect();
    if (ev.clientX - r.left < r.width / 3) mvAnt();
    else mvProx();
  };
  st.addEventListener('pointerup', soltar);
  st.addEventListener('pointercancel', soltar);
  st.addEventListener('pointerleave', (ev) => {
    if (segurou) soltar(ev);
    else clearTimeout(seg);
  });
}

function mvTecla(e) {
  if (!MV) return;
  if (e.key === 'Escape') mvFechar();
  else if (e.key === 'ArrowRight') mvProx();
  else if (e.key === 'ArrowLeft') mvAnt();
  else if (e.key === ' ' && !MV.confirmando) {
    e.preventDefault();
    mvPausar(!MV.pausado);
  }
}

function mvPerfil() {
  if (!MV) return;
  const id = MV.grupos[MV.g].o;
  mvFechar(true);
  location.hash = '#/ong/' + id;
}

function mvFechar(semAtualizar) {
  if (!MV) return;
  cancelAnimationFrame(MV.raf);
  const { mudou, foco } = MV;
  MV = null;

  document.removeEventListener('keydown', mvTecla);
  document.getElementById('mv')?.remove();
  document.body.classList.remove('mv-open');
  try { foco && foco.focus && foco.focus(); } catch (e) { /* sem foco para devolver */ }

  /* atualiza as molduras (colorida -> cinza) */
  if (mudou && !semAtualizar && /^#\/(feed|ong|perfil)/.test(location.hash)) go();
}

function mvAviso(txt) {
  const card = document.querySelector('#mv .mv-card');
  if (!card) return;
  card.querySelector('.mv-aviso')?.remove();
  const d = document.createElement('div');
  d.className = 'mv-aviso';
  d.setAttribute('role', 'status');
  d.textContent = txt;
  card.appendChild(d);
  setTimeout(() => d.remove(), 2600);
}

/* ---- menu e exclusão (só a ONG dona) ---- */
function mvMenu() {
  const card = document.querySelector('#mv .mv-card');
  if (!card || !MV) return;

  const aberto = card.querySelector('.mv-menu');
  if (aberto) {
    aberto.remove();
    MV.menu = false;
    mvPausar(false);
    return;
  }

  mvPausar(true);
  MV.menu = true;
  const d = document.createElement('div');
  d.className = 'mv-menu';
  d.innerHTML = `<button class="perigo" onclick="mvPedirExclusao()">${lc('trash-2', 18)}<span>Excluir momento</span></button>`;
  card.appendChild(d);
}

function mvPedirExclusao() {
  const card = document.querySelector('#mv .mv-card');
  if (!card || !MV) return;
  card.querySelector('.mv-menu')?.remove();
  MV.confirmando = true;

  const d = document.createElement('div');
  d.className = 'mv-confirm';
  d.innerHTML = `
    <div role="alertdialog" aria-label="Excluir momento">
      <p><b>Excluir este momento?</b><br><small style="opacity:.8">Esta ação não pode ser desfeita.</small></p>
      <div class="acoes">
        <button onclick="mvCancelarExclusao()">Cancelar</button>
        <button class="perigo" id="mvDel" onclick="mvExcluir(this)">Excluir</button>
      </div>
    </div>`;
  card.appendChild(d);
  d.querySelector('button')?.focus();
}

function mvCancelarExclusao() {
  if (!MV) return;
  document.querySelector('#mv .mv-confirm')?.remove();
  MV.confirmando = false;
  mvPausar(false);
}

async function mvExcluir(btn) {
  if (!MV) return;
  const grp = MV.grupos[MV.g];
  const m = grp.imgs[MV.i];
  btn.disabled = true;

  try {
    if (!DEMO) {
      if (m.id == null) throw new Error('Não foi possível identificar este momento.');
      await API.excluirMomento(m.id);
    }
  } catch (e) {
    btn.disabled = false;
    mvCancelarExclusao();
    mvAviso(e.name == 'ApiError' && e.message ? e.message : 'Não foi possível excluir. Tente de novo.');
    return;
  }

  /* tira da memória (STORIES e do grupo aberto) */
  const s = STORIES.find((x) => x.o == grp.o);
  if (s) {
    s.imgs = s.imgs.filter((x) => momKey(x) !== momKey(m));
    if (!s.imgs.length) STORIES.splice(STORIES.indexOf(s), 1);
  }
  grp.imgs.splice(MV.i, 1);
  MV.mudou = true;

  if (!grp.imgs.length) {
    MV.grupos.splice(MV.g, 1);
    if (!MV.grupos.length) return mvFechar();
    MV.g = Math.min(MV.g, MV.grupos.length - 1);
    MV.i = 0;
  } else {
    MV.i = Math.min(MV.i, grp.imgs.length - 1);
  }

  mvDesenhar();
  mvAviso('Momento excluído.');
}