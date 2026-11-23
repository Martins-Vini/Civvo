/* Avisos: notificações de novas publicações das ONGs que você segue.
   Modo real: GET /notificacoes e PUT /notificacoes/lidas. Demo: continua "em desenvolvimento". */

let AVISOS = null;
let AVISOS_ERRO = '';
let AVISOS_CARREGANDO = false;

const AVISO_TXT = {
  CAMPANHA: 'iniciou uma nova campanha',
  VOLUNTARIADO: 'abriu uma vaga de voluntariado',
};

/* aceita/recusa um pedido de parceria direto no card do aviso */
async function responderParceriaAviso(reqId, aceitar, btn) {
  try {
    await comEspera(btn, aceitar ? 'Aceitando…' : 'Recusando…', () => API.responderParceria(reqId, aceitar));
    toast(aceitar ? 'Parceria aceita.' : 'Parceria recusada.');
    recarregarAvisos();
  } catch (e) {
    toast(e.name == 'ApiError' && e.message ? e.message : 'Não foi possível responder agora.');
  }
}

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
  const novo = !n.is_read;
  const nome = n.actor_nome || n.ong_nome || 'Alguém';
  const avatar = n.actor_avatar || n.ong_logo;
  const avHtml = av(nome, ((n.actor_user_id || n.ong_id || 0) * 70) % 360, 44, avatar);
  const quando = `<small style="display:block;color:var(--mut)">${esc(tempoRelativo(n.created_at))}</small>`;
  const moldura = `display:flex;gap:12px;align-items:center;padding:14px 16px;margin-bottom:10px;${novo ? 'border-color:var(--mut)' : ''}`;

  /* pedido de parceria entre ONGs: aceitar/recusar direto no aviso (item 2) */
  if (n.type == 'PARCERIA_SOLICITADA') {
    return `
      <div class="card" style="${moldura}">
        ${avHtml}
        <div style="flex:1;min-width:0">
          <b>${esc(nome)}</b> pediu parceria com sua ONG.
          ${quando}
          <div class="acts" style="margin-top:8px;gap:8px">
            <button class="btn sm" onclick="responderParceriaAviso(${n.id}, true, this)">Aceitar</button>
            <button class="btn ghost sm" onclick="responderParceriaAviso(${n.id}, false, this)">Recusar</button>
          </div>
        </div>
      </div>`;
  }

  if (n.type == 'PARCERIA_ACEITA' || n.type == 'PARCERIA_RECUSADA') {
    const aceita = n.type == 'PARCERIA_ACEITA';
    return `
      <a class="card" href="#/ong/${n.ong_id}" style="${moldura};color:inherit">
        ${avHtml}
        <div style="flex:1;min-width:0">
          <b>${esc(nome)}</b> ${aceita ? 'aceitou' : 'recusou'} seu pedido de parceria.
          ${quando}
        </div>
        ${novo ? '<span class="tag" style="margin:0">Novo</span>' : ''}
      </a>`;
  }

  /* pedido de conversa: aceitar direto no aviso (item 6) */
  if (n.type == 'CHAT_REQUEST') {
    return `
      <div class="card" style="${moldura}">
        ${avHtml}
        <div style="flex:1;min-width:0">
          <b>${esc(nome)}</b> quer iniciar uma conversa com você.
          ${quando}
          <div class="acts" style="margin-top:8px;gap:8px">
            <button class="btn sm" onclick="chatAceitarPedido('${n.actor_user_id}', this)">Aceitar</button>
            <a class="btn ghost sm" href="#/chats/${n.actor_user_id}">Ver conversa</a>
          </div>
        </div>
      </div>`;
  }

  const txt = AVISO_TXT[n.post_type] || 'publicou algo novo';
  const destino = n.post_id ? `#/post/${n.post_id}` : `#/ong/${n.ong_id}`;

  return `
    <a class="card" href="${destino}" style="${moldura};color:inherit">
      ${avHtml}
      <div style="flex:1;min-width:0">
        <b>${esc(nome)}</b> ${txt}.
        ${quando}
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