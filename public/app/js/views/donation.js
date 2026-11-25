/* Doação e comprovante — pagamento REAL via gateway.

   Fluxo (modo real):
     1. POST /api/donations  { campaign_id | ong_id, amount, mensagem, cpf, metodo, idempotency_key }
        O back cria a doação como PENDENTE e uma cobrança no gateway. Responde:
          { donation: { id, status, valor, metodo, expires_at, ... },
            pix?: { copia_e_cola, qr_code_base64, expires_at },   (metodo PIX)
            checkout_url?: "https://..." }                         (metodo CARTAO)
     2. PIX    -> vai para #/recibo/:id, mostra QR Code + "copia e cola" e consulta o status sozinho.
        CARTAO -> redireciona para a página segura do gateway (checkout_url); o gateway devolve o doador
                  para #/recibo/:id, que consulta o status.
     3. GET /api/donations/:id devolve o status. Quem muda para APROVADO é o webhook do gateway no back,
        nunca o front. Os dados do cartão não passam pelo Civvo.
     4. GET /api/donations/minhas alimenta o histórico no perfil.
   Contrato completo (campos e status): ver o resumo entregue junto com este código.

   Modo demo: tudo local e simulado (DONATIONS em memória). */

const PRESETS = [20, 50, 100, 200];
const VALOR_MIN = 1;
const VALOR_MAX = 50000;
const MSG_MAX = 500;

const pctOf = (c) => (c.meta ? Math.min(100, (c.atual / c.meta) * 100) : 0);

/* ======================= regras de interface ======================= */

/* só conta de doador doa (o back confere de novo) */
function bloqueioDoador() {
  return ROLE == 'doador' ? '' : 'Somente contas de doador podem fazer doações.';
}

/* fim do dia do prazo, em ms (aceita dd/mm/aaaa, aaaa-mm-dd e datas ISO); 0 = sem prazo conhecido */
function fimDoPrazo(v) {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], 23, 59, 59).getTime();
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59).getTime();
  return new Date(s).getTime() || 0;
}

/* texto do motivo se a campanha não aceita mais doações; '' se aceita */
function campanhaFechada(c) {
  if (!c) return '';
  if (c.status == 'ENCERRADA') return 'Esta campanha foi encerrada e não recebe mais doações.';
  const fim = fimDoPrazo(c.limite);
  if (fim && fim < Date.now()) return 'O prazo desta campanha terminou e ela não recebe mais doações.';
  return '';
}

const aviso = (txt, on = 'feed') => shell(`<div class="card emp">${txt}</div>`, on, { rightCol: 0 });

const dataHora = (v) => {
  const t = new Date(v).getTime();
  return t ? new Date(t).toLocaleString('pt-BR') : '';
};

const uuid = () =>
  window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);

/* ======================= status da doação ======================= */

const ST_ROTULO = {
  PENDENTE: 'AGUARDANDO PAGAMENTO',
  APROVADO: 'APROVADO',
  REJEITADO: 'NÃO APROVADO',
  EXPIRADO: 'EXPIRADO',
  ESTORNADO: 'ESTORNADO',
};
const ST_CLASSE = { PENDENTE: 'warn', REJEITADO: 'bad', EXPIRADO: 'bad', ESTORNADO: 'bad' };

const statusDoacaoHtml = (s) =>
  `<span class="tag ${ST_CLASSE[s] || ''}" style="margin:0">${esc(ST_ROTULO[s] || s)}</span>`;

/* resposta do back (doação) -> objeto usado pelas telas */
function adaptDoacaoApi(r = {}) {
  const pix = r.pix || {};
  return {
    id: r.id ?? r.comprovante_id ?? null,
    status: String(r.status || 'PENDENTE').toUpperCase(),
    valor: +(r.valor ?? r.amount) || 0,
    metodo: r.metodo || r.metodo_pagamento || 'PIX',
    data: dataHora(r.created_at),
    pagoEm: dataHora(r.paid_at),
    projeto: r.projeto || '',
    ong: r.ong_nome || r.ong || '',
    ongId: r.ong_id ?? null,
    postId: r.post_id ?? null,
    cpfMasc: r.cpf_mascarado || '',
    msg: r.mensagem || '',
    pixCopia: pix.copia_e_cola || r.pix_copia_e_cola || '',
    pixQr: pix.qr_code_base64 || r.pix_qr_base64 || '',
    expira: pix.expires_at || r.expires_at || '',
    checkout: r.checkout_url || '',
  };
}

/* junta o que já se sabia com a resposta nova (a resposta pode vir com menos campos) */
function mesclarDoacao(antes, novo) {
  if (!antes) return novo;
  const r = { ...antes };
  Object.keys(novo).forEach((k) => {
    if (novo[k] !== '' && novo[k] !== null && novo[k] !== undefined) r[k] = novo[k];
  });
  r.status = novo.status;
  return r;
}

/* ======================= consulta de doações no back ======================= */

const DOACAO = {}; /* id -> doação (cache desta sessão) */
const DOACAO_BUSY = new Set();
const DOACAO_ERRO = {};
const DOACAO_T0 = {}; /* quando começou a acompanhar (para parar de consultar) */
let DOACAO_TMR = 0;

const POLL_MS = 4000;
const POLL_MAX_MS = 20 * 60 * 1000;

const rotaRecibo = (id) => location.hash.replace(/^#\//, '').split('/').slice(0, 2).join('/') == 'recibo/' + id;

function agendarPoll(id) {
  clearTimeout(DOACAO_TMR);
  const d = DOACAO[id];
  if (!d || d.status != 'PENDENTE' || !rotaRecibo(id)) return;

  if (!DOACAO_T0[id]) DOACAO_T0[id] = Date.now();
  if (Date.now() - DOACAO_T0[id] > POLL_MAX_MS) return; /* depois disso, só pelo botão "Verificar" */

  DOACAO_TMR = setTimeout(() => {
    if (rotaRecibo(id)) carregarDoacao(id);
  }, POLL_MS);
}

/* pagamento confirmado nesta sessão: avisa e atualiza a barra da campanha sem recarregar o feed */
function aprovouAgora(d) {
  toast('Pagamento confirmado. Obrigado por doar!');
  MINHAS_OK = false;

  if (d.postId && !d.creditado) {
    d.creditado = true;
    const p = POSTS.find((x) => x.id == d.postId);
    if (p && p.camp) p.camp.atual = (+p.camp.atual || 0) + d.valor;
  }
}

function carregarDoacao(id, aoFim) {
  id = String(id);
  if (DOACAO_BUSY.has(id)) return;
  DOACAO_BUSY.add(id);

  const antes = DOACAO[id];

  Promise.resolve()
    .then(() => API.buscarDoacao(id))
    .then((r) => {
      const novo = mesclarDoacao(antes, adaptDoacaoApi(r));
      if (novo.id == null) novo.id = id;
      DOACAO[id] = novo;
      delete DOACAO_ERRO[id];

      if (antes && antes.status == 'PENDENTE' && novo.status == 'APROVADO') aprovouAgora(novo);
      return !antes || antes.status != novo.status;
    })
    .catch((e) => {
      console.error('Falha ao consultar a doação:', e);
      /* com dados já na tela, uma falha de rede na consulta periódica é ignorada */
      if (!antes) {
        DOACAO_ERRO[id] =
          e && e.status == 404
            ? 'Comprovante não encontrado.'
            : (e && e.name == 'ApiError' && e.message) || 'Não foi possível carregar o comprovante agora.';
        return true;
      }
      return false;
    })
    .then((mudou) => {
      DOACAO_BUSY.delete(id);
      if (aoFim) aoFim(mudou);
      if (rotaRecibo(id)) {
        if (mudou) go();
        agendarPoll(id);
      }
    });
}

function recarregarDoacao(id) {
  delete DOACAO_ERRO[id];
  go();
}

/* botão "Já paguei, verificar agora" */
function verificarAgora(id, btn) {
  if (btn.dataset.busy) return;
  const antes = btn.innerHTML;
  btn.dataset.busy = '1';
  btn.disabled = true;
  btn.innerHTML = '<span class="spin" aria-hidden="true"></span> Verificando…';

  DOACAO_T0[id] = Date.now(); /* reinicia a consulta automática */
  carregarDoacao(id, (mudou) => {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.innerHTML = antes;
      delete btn.dataset.busy;
    }
    if (!mudou) toast('Ainda não identificamos o pagamento. Assim que for confirmado, esta tela atualiza.');
  });
}

/* ---- histórico (perfil do doador) ---- */
let MINHAS_OK = false;
let MINHAS_ERRO = false;
let MINHAS_BUSY = false;

function carregarMinhasDoacoes() {
  if (DEMO || MINHAS_BUSY) return;
  MINHAS_BUSY = true;
  MINHAS_ERRO = false;

  Promise.resolve()
    .then(() => API.minhasDoacoes())
    .then((r) => {
      const linhas = Array.isArray(r) ? r : (r && (r.donations || r.doacoes)) || [];
      DONATIONS.length = 0;
      DONATIONS.push(...linhas.map(adaptDoacaoApi));
      MINHAS_OK = true;
    })
    .catch((e) => {
      console.error('Falha ao carregar o histórico de doações:', e);
      MINHAS_ERRO = true;
    })
    .finally(() => {
      MINHAS_BUSY = false;
      if (/^#\/perfil/.test(location.hash)) go();
    });
}

function tentarHistoricoDeNovo() {
  MINHAS_ERRO = false;
  go();
}

/* ======================= telas ======================= */

/* doação ligada a uma campanha (post) */
V.doar = (id) => {
  const p = POSTS.find((x) => x.id == id);
  const o = p && ong(p.ong);

  if (!p || !p.camp || !o) return aviso('Campanha não encontrada.');

  const bloqueio = bloqueioDoador() || campanhaFechada(p.camp);
  if (bloqueio) return aviso(bloqueio);

  if (!DEMO && p.camp.id == null) return aviso('Esta campanha não está disponível para doação no momento.');

  const cabecalho = `
    <div class="ph" style="padding:0 0 12px">
      ${av(o.name, o.h)}
      <div><b>${esc(o.name)}</b><small>${esc(p.text.slice(0, 90))}</small></div>
    </div>
    <div class="bar"><b style="width:${pctOf(p.camp)}%"></b></div>
    <div class="pg2"><b>${money(p.camp.atual)}</b> de ${money(p.camp.meta)}</div>`;

  return telaDoacao({ o, cabecalho, campaignId: p.camp.id, postId: p.id });
};

/* doação direta ao perfil da ONG, sem campanha */
V['doar-ong'] = (ongId) => {
  const o = ong(ongId);
  if (!o) return aviso('ONG não encontrada.');

  const bloqueio = bloqueioDoador();
  if (bloqueio) return aviso(bloqueio);

  const cabecalho = `
    <div class="ph" style="padding:0 0 12px">
      ${av(o.name, o.h)}
      <div><b>${esc(o.name)}</b><small>Doação direta para a ONG</small></div>
    </div>`;

  return telaDoacao({ o, cabecalho, ongId: o.id });
};

function telaDoacao({ o, cabecalho, campaignId = null, postId = null, ongId = null }) {
  const free = temRecurso('valorLivre');
  if (DON.ong != o.id) DON = { valor: 0, met: 'PIX', cpf: DON.cpf || '', msg: '', ong: o.id };

  const presetsHtml = PRESETS
    .map((v) => `<button class="amt ${DON.valor == v ? 'on' : ''}" data-v="${v}" onclick="setAmt(${v})">${money(v)}</button>`)
    .join('');

  const metodosHtml = [
    ['PIX', 'Pix'],
    ['CARTAO', 'Cartão de crédito'],
  ]
    .map((m) => `<button class="mt ${DON.met == m[0] ? 'on' : ''}" data-m="${m[0]}" onclick="setMet('${m[0]}')">${m[1]}</button>`)
    .join('');

  const outroValor = DON.valor && !PRESETS.includes(DON.valor) ? DON.valor : '';

  const rodape = DEMO
    ? '<b>Modo demonstração:</b> nenhum pagamento real é feito.'
    : 'O pagamento é processado por um gateway de pagamento parceiro. O Civvo não armazena dados de cartão. Você acompanha o status no comprovante.';

  const content = `
    <div class="top"><h1>Fazer uma doação</h1></div>
    <div class="card dcard">${cabecalho}</div>
    <div class="card dcard">
      <label style="margin-top:0">Valor</label>
      <div class="amts">${presetsHtml}</div>
      <label for="vl">Outro valor ${free ? '' : '(disponível no plano apoiador)'}</label>
      <input id="vl" class="in" type="number" min="${VALOR_MIN}" max="${VALOR_MAX}" step="0.01" inputmode="decimal" value="${outroValor}" ${free ? '' : 'disabled'} oninput="digitarValor(this.value)">
      <small style="color:var(--mut)">De ${money(VALOR_MIN)} a ${money(VALOR_MAX)} por doação.</small>
      <label>Forma de pagamento</label>
      <div class="seg">${metodosHtml}</div>
      <div id="metBox">${metodoInfoHtml()}</div>
      <label for="cpf">CPF do doador</label>
      <input id="cpf" class="in" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" value="${esc(DON.cpf || USER.cpf || '')}" oninput="DON.cpf=this.value">
      <small style="color:var(--mut)">Exigido pelo meio de pagamento. Também identifica a doação no comprovante e na declaração de IRPF.</small>
      <label for="msg">Mensagem para a ONG (opcional)</label>
      <textarea id="msg" class="in" rows="2" maxlength="${MSG_MAX}" placeholder="Deixe um recado de apoio" oninput="DON.msg=this.value">${esc(DON.msg || '')}</textarea>
      <p class="dn-err" id="derr" role="alert"></p>
      <button class="btn full" onclick="confirmDon(${campaignId ?? 'null'}, ${postId ?? 'null'}, ${ongId ?? 'null'}, this)">Continuar para o pagamento</button>
      <p class="dn-aviso">${rodape}</p>
    </div>
  `;

  return shell(content, 'feed', { rightCol: 0 });
}

function setAmt(v) {
  DON.valor = v;
  document.querySelectorAll('.amt').forEach((b) => b.classList.toggle('on', +b.dataset.v == v));
  const i = $('#vl');
  if (i) i.value = '';
}

/* valor digitado em "Outro valor": desmarca os atalhos (a não ser que coincida com um deles) */
function digitarValor(v) {
  DON.valor = +v || 0;
  document.querySelectorAll('.amt').forEach((b) => b.classList.toggle('on', +b.dataset.v == DON.valor));
}

/* explica o que acontece ao confirmar, conforme o método */
function metodoInfoHtml() {
  const txt =
    DON.met == 'PIX'
      ? 'Ao continuar, geramos um QR Code e um código Pix Copia e Cola para você pagar no app do seu banco. O código tem prazo para expirar.'
      : 'Ao continuar, você será levado à página segura do gateway de pagamento para informar os dados do cartão. O Civvo não vê nem guarda esses dados.';
  return `<small style="color:var(--mut);display:block;margin-top:8px">${txt}</small>`;
}

function setMet(m) {
  DON.met = m;
  document.querySelectorAll('.mt').forEach((b) => b.classList.toggle('on', b.dataset.m == m));
  const box = $('#metBox');
  if (box) box.innerHTML = metodoInfoHtml();
}

async function copiarPix(btn) {
  try {
    await navigator.clipboard.writeText(btn.dataset.k);
    toast('Código Pix copiado.');
  } catch {
    prompt('Copie o código Pix:', btn.dataset.k);
  }
}

/* ======================= envio ======================= */

/* devolve o texto do primeiro problema, ou '' se está tudo certo */
function validarDoacao(postId) {
  const bloqueio = bloqueioDoador();
  if (bloqueio) return bloqueio;

  if (postId) {
    const p = POSTS.find((x) => x.id == postId);
    const fechada = campanhaFechada(p && p.camp);
    if (fechada) return fechada;
  }

  const v = DON.valor;
  if (!(v > 0)) return 'Escolha um valor para doar.';
  if (v < VALOR_MIN) return `O valor mínimo é ${money(VALOR_MIN)}.`;
  if (v > VALOR_MAX) return `O valor máximo por doação é ${money(VALOR_MAX)}.`;
  if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return 'Use no máximo 2 casas decimais no valor.';

  if (!cpfOk(DON.cpf || USER.cpf || '')) return 'Informe um CPF válido, com 11 dígitos.';

  if (String(DON.msg || '').length > MSG_MAX) return `A mensagem pode ter até ${MSG_MAX} caracteres.`;

  return '';
}

const mascararCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '');
  return d.length == 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '';
};

function mensagemErroDoacao(err) {
  if (err && err.name == 'ApiError') {
    if (err.status === 0 && /demorou/i.test(err.message)) {
      return 'O servidor demorou para responder e não sabemos se a doação foi criada. Confira em Perfil > histórico de doações antes de tentar de novo, para não gerar duas cobranças.';
    }
    return err.message || 'Não foi possível iniciar o pagamento agora.';
  }
  return 'Não foi possível iniciar o pagamento agora.';
}

function ocupar(btn, texto) {
  btn.dataset.busy = '1';
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = `<span class="spin" aria-hidden="true"></span> ${texto}`;
}

function liberar(btn, antes) {
  if (!btn.isConnected) return;
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.innerHTML = antes;
  delete btn.dataset.busy;
}

async function confirmDon(campaignId, postId, ongId, btn) {
  if (btn.dataset.busy) return;

  const e = $('#derr');
  e.textContent = '';

  const o = ong(DON.ong);
  if (!o) return;

  const erro = validarDoacao(postId);
  if (erro) {
    e.textContent = erro;
    return;
  }

  const cpf = (DON.cpf || USER.cpf || '').replace(/\D/g, '');
  const valor = Math.round(DON.valor * 100) / 100;
  const mensagem = String(DON.msg || '').trim().slice(0, MSG_MAX);
  const p = postId ? POSTS.find((x) => x.id == postId) : null;
  const projeto = p ? p.text.slice(0, 60) : 'Doação direta';

  /* ---------- modo real: cria a cobrança no back/gateway ---------- */
  if (!DEMO) {
    /* mesma chave enquanto os dados forem os mesmos: se a resposta se perder (timeout) e o doador
       clicar de novo, o back devolve a doação já criada em vez de cobrar duas vezes */
    const assinatura = [campaignId || '', campaignId ? '' : ongId || o.id, valor, DON.met, cpf, mensagem].join('|');
    if (DON.chaveAss !== assinatura) {
      DON.chave = uuid();
      DON.chaveAss = assinatura;
    }

    const antes = btn.innerHTML;
    ocupar(btn, 'Gerando pagamento…');

    try {
      const r = await API.doar({
        campaign_id: campaignId || null,
        ong_id: campaignId ? null : ongId || o.id,
        amount: valor,
        mensagem,
        cpf,
        metodo: DON.met,
        idempotency_key: DON.chave,
      });

      const d = adaptDoacaoApi({ ...((r && r.donation) || r || {}), pix: r && r.pix, checkout_url: r && r.checkout_url });

      if (d.id == null) throw new Error('Resposta sem o código da doação.');

      /* o que o front já sabe e o back pode não devolver na criação */
      d.valor = d.valor || valor;
      d.metodo = d.metodo || DON.met;
      d.ong = d.ong || o.name;
      d.ongId = d.ongId ?? o.id;
      d.postId = d.postId ?? postId ?? null;
      d.projeto = d.projeto || projeto;
      d.cpfMasc = d.cpfMasc || mascararCpf(cpf);
      d.msg = d.msg || mensagem;
      d.data = d.data || dataHora(Date.now());

      DOACAO[d.id] = d;
      DOACAO_T0[d.id] = Date.now();
      MINHAS_OK = false;
      DON = { valor: 0, met: 'PIX', cpf, msg: '' };

      /* cartão: segue para a página segura do gateway; ele devolve o doador para #/recibo/:id */
      if (d.metodo == 'CARTAO' && /^https:\/\//i.test(d.checkout)) {
        location.assign(d.checkout);
        return;
      }

      location.hash = '#/recibo/' + d.id;
    } catch (err) {
      e.textContent = mensagemErroDoacao(err);
    } finally {
      liberar(btn, antes);
    }
    return;
  }

  /* ---------- modo demo: simula aprovação localmente ---------- */
  const d = {
    id: Date.now(),
    camp: postId,
    valor,
    status: 'PENDENTE',
    data: new Date().toLocaleString('pt-BR'),
    metodo: DON.met,
    cpf,
    projeto,
    ong: o.name,
    doador: USER.apelido_unico,
    ongId: o.id,
    msg: mensagem,
  };

  const ok = await comEspera(btn, 'Processando…', () => {
    DONATIONS.push(d);
    notify('doador', 'DOACAO', `Doação de ${money(d.valor)} para ${d.ong} registrada. Acompanhe o comprovante.`, '#/recibo/' + d.id);
    notify('ong', 'DOACAO', `Nova doação de ${money(d.valor)} em análise (${d.metodo == 'PIX' ? 'Pix' : 'cartão'}).`, '#/painel');
  });

  if (!ok) return;

  DON = { valor: 0, met: 'PIX', cpf: '', msg: '' };
  location.hash = '#/recibo/' + d.id;
}

/* ======================= comprovante ======================= */

const ST_TXT = {
  PENDENTE: 'Aguardando a confirmação do pagamento.',
  APROVADO: 'Pagamento confirmado. Obrigado por doar!',
  REJEITADO: 'O pagamento não foi aprovado. Nenhum valor foi cobrado. Você pode tentar de novo ou usar outra forma de pagamento.',
  EXPIRADO: 'O prazo para pagar terminou e a cobrança foi cancelada. Se você já pagou, fale com o suporte; caso contrário, faça uma nova doação.',
  ESTORNADO: 'Este pagamento foi estornado e o valor devolvido.',
};

V.recibo = (id) => (DEMO ? reciboDemo(id) : reciboReal(id));

/* campos comuns do comprovante */
function reciboLinhas(d) {
  const metodoPagamento = d.metodo == 'PIX' ? 'Pix' : 'Cartão de crédito';
  return `
        <dt>Código</dt>
        <dd>#${esc(String(d.id).slice(-6))}</dd>
        ${d.data ? `<dt>Data</dt><dd>${esc(d.data)}</dd>` : ''}
        ${d.pagoEm ? `<dt>Pago em</dt><dd>${esc(d.pagoEm)}</dd>` : ''}
        <dt>Projeto</dt>
        <dd>${esc(d.projeto || 'Doação direta')}</dd>
        <dt>ONG</dt>
        <dd>${esc(d.ong || '—')}</dd>
        <dt>Valor</dt>
        <dd>${money(d.valor)}</dd>
        <dt>Pagamento</dt>
        <dd>${metodoPagamento}</dd>
        <dt>CPF</dt>
        <dd>${esc(d.cpfMasc || '—')}</dd>
        ${d.msg ? `<dt>Mensagem</dt><dd>${esc(d.msg)}</dd>` : ''}`;
}

/* QR Code + copia e cola (só imprime base64 puro, para nada estranho entrar no src) */
function blocoPix(d) {
  const qr = String(d.pixQr || '').replace(/\s/g, '');
  const img = /^[A-Za-z0-9+/]+=*$/.test(qr)
    ? `<img class="pix-qr" alt="QR Code do Pix" width="200" height="200" src="data:image/png;base64,${qr}">`
    : '';
  const expira = dataHora(d.expira);

  return `
    <div class="pix-box">
      <p>Pague com Pix para concluir a doação. Esta tela atualiza sozinha quando o pagamento for confirmado.</p>
      ${img}
      ${
        d.pixCopia
          ? `<label>Pix Copia e Cola</label>
             <div class="pxd">
               <code class="pix-cod">${esc(d.pixCopia)}</code>
               <button type="button" class="btn light sm" data-k="${esc(d.pixCopia)}" onclick="copiarPix(this)">Copiar</button>
             </div>`
          : '<small style="color:var(--mut)">Não foi possível exibir o código agora. Use o botão abaixo para verificar ou tente doar de novo.</small>'
      }
      ${expira ? `<small style="color:var(--mut);display:block;margin-top:8px">O código expira em ${esc(expira)}.</small>` : ''}
      <ol class="pix-passos">
        <li>Abra o app do seu banco e escolha Pix.</li>
        <li>Leia o QR Code ou use o Pix Copia e Cola.</li>
        <li>Confirme o pagamento. Pode levar alguns segundos para aparecer aqui.</li>
      </ol>
    </div>`;
}

function reciboReal(id) {
  if (!/^\d+$/.test(String(id || ''))) return aviso('Comprovante não encontrado.', 'perfil');

  const d = DOACAO[id];

  if (!d) {
    if (DOACAO_ERRO[id]) {
      return shell(
        `<div class="card emp">${esc(DOACAO_ERRO[id])}
           <div class="acts" style="margin-top:12px">
             <button class="btn light sm" onclick="recarregarDoacao('${id}')">Tentar de novo</button>
             <a class="btn ghost sm" href="#/feed">Voltar ao feed</a>
           </div>
         </div>`,
        'perfil',
        { rightCol: 0 }
      );
    }
    if (!DOACAO_BUSY.has(String(id))) carregarDoacao(id);
    return shell('<div class="card emp" role="status" aria-busy="true">Carregando comprovante…</div>', 'perfil', { rightCol: 0 });
  }

  agendarPoll(id);

  const pendente = d.status == 'PENDENTE';
  const checkoutOk = d.metodo == 'CARTAO' && /^https:\/\//i.test(d.checkout);
  const novaDoacao = d.postId ? '#/doar/' + d.postId : d.ongId ? '#/doar-ong/' + d.ongId : '#/feed';

  const pagamento = pendente
    ? d.metodo == 'PIX'
      ? blocoPix(d)
      : `<p>Estamos aguardando a confirmação do pagamento com cartão.</p>${
          checkoutOk ? `<p><a class="btn sm" href="${esc(d.checkout)}">Continuar pagamento</a></p>` : ''
        }`
    : '';

  const acoes = [
    pendente ? `<button class="btn sm" onclick="verificarAgora('${id}', this)">Já paguei, verificar agora</button>` : '',
    d.status == 'REJEITADO' || d.status == 'EXPIRADO' ? `<a class="btn sm" href="${novaDoacao}">Doar novamente</a>` : '',
    '<button class="btn light sm" onclick="print()">Imprimir comprovante</button>',
    '<a class="btn ghost sm" href="#/feed">Voltar ao feed</a>',
  ].join('');

  const content = `
    <div class="top"><h1>Comprovante da doação</h1></div>
    <div class="card rc">
      ${statusDoacaoHtml(d.status)}
      <p style="margin-top:10px">${ST_TXT[d.status] || ''}</p>
      ${pagamento}
      <dl>${reciboLinhas(d)}</dl>
      <div class="acts">${acoes}</div>
    </div>
  `;

  return shell(content, 'perfil', { rightCol: 0 });
}

/* modo demo: comprovante local */
function reciboDemo(id) {
  const d = DONATIONS.find((x) => x.id == id);
  if (!d) return aviso('Comprovante não encontrado.', 'perfil');

  const cl = d.status == 'PENDENTE' ? 'warn' : d.status == 'REJEITADO' ? 'bad' : '';
  const cpf = d.cpf ? `***.${d.cpf.slice(3, 6)}.${d.cpf.slice(6, 9)}-**` : '—';

  const content = `
    <div class="top"><h1>Comprovante da doação</h1></div>
    <div class="card rc">
      <span class="tag ${cl}" style="margin:0">${d.status}</span>
      <p style="margin-top:10px">Modo demonstração: nenhum pagamento real foi feito.</p>
      <dl>
        <dt>Código</dt>
        <dd>#${String(d.id).slice(-6)}</dd>
        <dt>Data</dt>
        <dd>${esc(d.data)}</dd>
        <dt>Projeto</dt>
        <dd>${esc(d.projeto)}</dd>
        <dt>ONG</dt>
        <dd>${esc(d.ong)}</dd>
        <dt>Valor</dt>
        <dd>${money(d.valor)}</dd>
        <dt>Pagamento</dt>
        <dd>${d.metodo == 'PIX' ? 'Pix' : 'Cartão de crédito'}</dd>
        <dt>CPF</dt>
        <dd>${cpf}</dd>
        ${d.msg ? `<dt>Mensagem</dt><dd>${esc(d.msg)}</dd>` : ''}
      </dl>
      <div class="acts">
        <button class="btn sm" onclick="print()">Imprimir comprovante</button>
        <a class="btn light sm" href="#/feed">Voltar ao feed</a>
      </div>
    </div>
  `;

  return shell(content, 'perfil', { rightCol: 0 });
}
