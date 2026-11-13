/* Administração: fila de denúncias de publicações (POST_REPORTS).
   Modo real: lista GET /admin/denuncias e muda o status (PENDENTE, ANALISADO, IGNORADO).
   Demo: continua como "em desenvolvimento". */

let DENUNCIAS = null;
let DEN_ERRO = '';
let DEN_CARREGANDO = false;
let DEN_FILTRO = 'TODAS';

const DEN_STATUS = {
  PENDENTE: 'Pendente',
  ANALISADO: 'Analisada',
  IGNORADO: 'Ignorada',
};

function carregarDenuncias() {
  if (DEN_CARREGANDO) return;
  DEN_CARREGANDO = true;

  API.listarDenuncias()
    .then((r) => {
      DENUNCIAS = Array.isArray(r) ? r : [];
      DEN_ERRO = '';
    })
    .catch((e) => {
      console.error('Falha ao carregar denúncias:', e);
      DEN_ERRO = e.name == 'ApiError' && e.message ? e.message : 'Não foi possível carregar as denúncias.';
    })
    .finally(() => {
      DEN_CARREGANDO = false;
      go();
    });
}

function recarregarDenuncias() {
  DEN_ERRO = '';
  DENUNCIAS = null;
  go();
}

function filtrarDenuncias(f) {
  DEN_FILTRO = f;
  go();
}

async function mudarStatusDenuncia(id, status, btn) {
  const d = DENUNCIAS.find((x) => x.id == id);
  if (!d) return;

  const ok = await comEspera(btn, 'Salvando…', async () => {
    await API.atualizarDenuncia(id, status);
    d.status = status;
  });

  if (!ok) return;

  toast(status == 'PENDENTE' ? 'Denúncia reaberta.' : 'Denúncia atualizada.');
  go();
}

const denCard = (d) => {
  const p = POSTS.find((x) => x.id == d.post_id);
  const o = p && ong(p.ong);
  const trecho = p ? esc(p.text.slice(0, 140)) + (p.text.length > 140 ? '…' : '') : '';
  const cl = d.status == 'PENDENTE' ? 'warn' : '';

  const acoes =
    d.status == 'PENDENTE'
      ? `<button class="btn light sm" onclick="mudarStatusDenuncia(${d.id}, 'ANALISADO', this)">Marcar como analisada</button>
         <button class="btn ghost sm" onclick="mudarStatusDenuncia(${d.id}, 'IGNORADO', this)">Ignorar</button>`
      : `<button class="btn ghost sm" onclick="mudarStatusDenuncia(${d.id}, 'PENDENTE', this)">Reabrir</button>`;

  return `
    <div class="card" style="padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <b>Denúncia #${d.id}</b>
        <span class="tag ${cl}" style="margin:0">${esc(DEN_STATUS[d.status] || d.status)}</span>
      </div>
      <p style="margin:8px 0"><b>Motivo:</b> ${esc(d.reason)}</p>
      <small style="color:var(--mut)">
        ${esc(dia(d.created_at))} · por ${esc(d.autor_denuncia_email || 'usuário #' + d.user_id)}
      </small>
      <div class="lnk" style="margin-top:10px;display:block">
        ${
          p
            ? `<small style="color:var(--mut)">${esc(o ? o.name : 'ONG #' + p.ong)}</small>
               <p style="margin:4px 0 8px">${trecho || '(sem texto)'}</p>
               <a href="#/post/${p.id}">Ver publicação</a>`
            : `<small style="color:var(--mut)">Publicação #${d.post_id} (não está no feed carregado)</small>`
        }
      </div>
      <div class="acts" style="margin-top:12px">${acoes}</div>
    </div>
  `;
};

V.admin = () => {
  if (DEMO) return emDev('Administração', 'admin');

  const topo = (extra = '') => `<div class="top"><div><h1>Denúncias</h1></div></div>${extra}`;

  if (DEN_ERRO) {
    return shell(
      topo(`<div class="card emp" role="alert">
              <p>${esc(DEN_ERRO)}</p>
              <button class="btn sm" onclick="recarregarDenuncias()">Tentar de novo</button>
            </div>`),
      'admin',
      { rightCol: 0 }
    );
  }

  if (DENUNCIAS === null) {
    carregarDenuncias();
    return shell(topo('<div class="card emp" role="status">Carregando denúncias…</div>'), 'admin', { rightCol: 0 });
  }

  const conta = (s) => DENUNCIAS.filter((d) => d.status == s).length;
  const filtros = [
    ['TODAS', `Todas (${DENUNCIAS.length})`],
    ['PENDENTE', `Pendentes (${conta('PENDENTE')})`],
    ['ANALISADO', `Analisadas (${conta('ANALISADO')})`],
    ['IGNORADO', `Ignoradas (${conta('IGNORADO')})`],
  ];

  const abas = `<nav class="tabs" aria-label="Filtrar denúncias">${filtros
    .map(([k, n]) => `<a href="#/admin" class="${DEN_FILTRO == k ? 'on' : ''}" onclick="event.preventDefault();filtrarDenuncias('${k}')">${n}</a>`)
    .join('')}</nav>`;

  const lista = DENUNCIAS.filter((d) => DEN_FILTRO == 'TODAS' || d.status == DEN_FILTRO)
    .map(denCard)
    .join('');

  return shell(topo(abas + (lista || '<div class="card emp">Nenhuma denúncia nesta lista.</div>')), 'admin', {
    rightCol: 0,
  });
};
