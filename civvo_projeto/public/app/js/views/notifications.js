/* Avisos: notificações de novas publicações das ONGs que você segue.
   Modo real: GET /notificacoes e PUT /notificacoes/lidas. Demo: continua "em desenvolvimento". */

let AVISOS = null;
let AVISOS_ERRO = '';
let AVISOS_CARREGANDO = false;

const AVISO_TXT = {
  CAMPANHA: 'iniciou uma nova campanha',
  VOLUNTARIADO: 'abriu uma vaga de voluntariado',
};

function carregarAvisos() {
  if (AVISOS_CARREGANDO) return;
  AVISOS_CARREGANDO = true;

  API.listarNotificacoes()
    .then((r) => {
      AVISOS = Array.isArray(r) ? r : [];
      AVISOS_ERRO = '';
      /* marca como lidas no banco, mas mantém o destaque nesta visita */
      if (AVISOS.some((n) => !n.is_read)) API.marcarNotificacoesLidas().catch(() => {});
    })
    .catch((e) => {
      console.error('Falha ao carregar avisos:', e);
      AVISOS_ERRO = e.name == 'ApiError' && e.message ? e.message : 'Não foi possível carregar os avisos.';
    })
    .finally(() => {
      AVISOS_CARREGANDO = false;
      go();
    });
}

function recarregarAvisos() {
  AVISOS = null;
  AVISOS_ERRO = '';
  go();
}

const avisoCard = (n) => {
  const txt = AVISO_TXT[n.post_type] || 'publicou algo novo';
  const destino = n.post_id ? `#/post/${n.post_id}` : `#/ong/${n.ong_id}`;
  const novo = !n.is_read;

  return `
    <a class="card" href="${destino}" style="display:flex;gap:12px;align-items:center;padding:14px 16px;margin-bottom:10px;color:inherit;${novo ? 'border-color:var(--mut)' : ''}">
      ${av(n.ong_nome, (n.ong_id * 70) % 360, 44, n.ong_logo)}
      <div style="flex:1;min-width:0">
        <b>${esc(n.ong_nome)}</b> ${txt}.
        <small style="display:block;color:var(--mut)">${esc(tempoRelativo(n.created_at))}</small>
      </div>
      ${novo ? '<span class="tag" style="margin:0">Novo</span>' : ''}
    </a>
  `;
};

V.avisos = () => {
  if (DEMO) return emDev('Avisos', 'avisos');

  const topo = (extra) => shell(`<div class="top"><h1>Avisos</h1></div>${extra}`, 'avisos', { rightCol: 0 });

  /* o aviso abre a publicação, que precisa estar no feed já carregado */
  if (!FEED && !FEED_ERRO) carregarFeedReal();

  if (AVISOS_ERRO) {
    return topo(`<div class="card emp" role="alert">
                   <p>${esc(AVISOS_ERRO)}</p>
                   <button class="btn sm" onclick="recarregarAvisos()">Tentar de novo</button>
                 </div>`);
  }

  if (AVISOS === null) {
    carregarAvisos();
    return topo('<div class="card emp" role="status">Carregando avisos…</div>');
  }

  if (!AVISOS.length) {
    return topo('<div class="card emp">Nada por aqui ainda. Siga ONGs para ser avisado quando publicarem algo novo.</div>');
  }

  return topo(AVISOS.map(avisoCard).join(''));
};