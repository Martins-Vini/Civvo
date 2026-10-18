/* Esqueletos de carregamento. */

const sk = (h, w = '100%', x = '') =>
  `<div class="sk" style="height:${h}px;width:${w};${x}"></div>`;

const skCard = () =>
  `<div class="card" style="padding:16px;margin-bottom:14px">
    ${sk(16, '40%', 'margin-bottom:12px')}
    ${sk(12, '90%', 'margin-bottom:8px')}
    ${sk(12, '70%')}
  </div>`;

const SKELS = {
  lista: () =>
    sk(26, '180px', 'margin-bottom:18px') +
    sk(44, '100%', 'margin-bottom:16px') +
    skCard() +
    skCard() +
    skCard(),
  perfil: () =>
    `<div class="card" style="overflow:hidden">
      ${sk(190, '100%', 'border-radius:0')}
      <div style="padding:0 24px 24px">
        ${sk(104, '104px', 'border-radius:50%;margin-top:-52px')}
        ${sk(24, '220px', 'margin:14px 0 10px')}
        ${sk(14, '60%', 'margin-bottom:20px')}
        ${sk(14, '40%')}
      </div>
    </div>`,
};

const SK_TIPO = { 
  buscar: 'lista', 
  post: 'lista', 
  perfil: 'perfil', 
  ong: 'perfil' 
};

const SK_ON = { 
  ong: 'buscar', 
  post: 'feed' 
};

const VISTAS = new Set();

function carregando(r, a) {
  const k = r + '/' + (a || '');
  if (!DEMO || LATENCIA.max <= 0 || !SK_TIPO[r] || VISTAS.has(k)) return false;

  VISTAS.add(k);
  const root = document.getElementById('root');

  root.innerHTML = shell(
    `<div role="status" aria-busy="true"><span class="sr">Carregando…</span>${SKELS[SK_TIPO[r]]()}</div>`,
    SK_ON[r] || r,
    { rightCol: 0, wide: 1 },
  );

  setTitle(r, a);
  aplicarTema(r);
  a11yHeadings(r, a);

  setTimeout(
    () => {
      if (rotaAtual() == r) {
        go();
        focusTop();
      }
    },
    LATENCIA.min + Math.random() * (LATENCIA.max - LATENCIA.min),
  );

  return true;
}

const CMT_OK = new Set();

function cmtsInicial(pid) {
  if (!DEMO || LATENCIA.max <= 0 || CMT_OK.has(pid)) {
    return nest(pid) || '<p class="emp">Seja o primeiro a comentar.</p>';
  }

  chamar().then(() => {
    CMT_OK.add(pid);
    drawComments(pid);
  });

  const skeletons = [0, 1, 2]
    .map(() => `
      <div style="display:flex;gap:10px;padding:10px 0">
        ${sk(30, '30px', 'border-radius:50%;flex:none')}
        <div style="flex:1">
          ${sk(12, '35%', 'margin-bottom:8px')}
          ${sk(12, '85%')}
        </div>
      </div>
    `)
    .join('');

  return `
    <div role="status" aria-busy="true">
      <span class="sr">Carregando comentários…</span>
      ${skeletons}
    </div>
  `;
}