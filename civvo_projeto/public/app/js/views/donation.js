const PRESETS = [20, 50, 100, 200];

const pctOf = (c) => (c.meta ? Math.min(100, (c.atual / c.meta) * 100) : 0);

V.doar = (id) => {
  const p = POSTS.find((x) => x.id == id);
  const o = p && ong(p.ong);

  /* o feed não traz a chave Pix da ONG; busca o perfil completo (mesmo cache usado em V.ong)
     e mescla no objeto, senão o Pix aparece "indisponível" mesmo quando a ONG já cadastrou */
  if (!DEMO && o) {
    const pf = ONG_PERFIL[o.id];
    if (pf) Object.assign(o, pf.dados);
    if (!pf || Date.now() - pf.ts > 60000) carregarPerfilOng(o.id);
  }

  if (!p || !p.camp || !o) {
    return shell('<div class="card emp">Campanha não encontrada.</div>', 'feed', { rightCol: 0 });
  }

  if (p.camp.status == 'ENCERRADA') {
    return shell(
      '<div class="card emp">Esta campanha foi encerrada e não recebe mais doações.</div>',
      'feed',
      { rightCol: 0 }
    );
  }

  /* modo real: o id da campanha já vem do feed (api-feed.js -> adaptApi.post -> camp.id).
     Sem ele não dá para identificar a campanha no back; melhor avisar do que doar errado. */
  if (!DEMO && p.camp.id == null) {
    return shell(
      `<div class="top"><h1>Fazer uma doação</h1></div>
       <div class="card emp">Não foi possível identificar esta campanha. Atualize o feed e tente novamente.<br><br><a class="btn light sm" href="#/feed">Voltar ao feed</a></div>`,
      'feed',
      { rightCol: 0 }
    );
  }

  const c = p.camp;
  const free = temRecurso('valorLivre');

  /* Pix: a doação vai para a chave da ONG (destino) e o doador informa a chave de onde envia (remetente) */
  if (DON.ong != o.id) DON = { ...DON, ong: o.id, pixSel: '', pixOut: '' };
  const pixDestino = pixDaChaveOng(o);
  if (!pixDestino && DON.met == 'PIX') DON.met = 'CARTAO';

  const presetsHtml = PRESETS
    .map((v) => `<button class="amt ${DON.valor == v ? 'on' : ''}" data-v="${v}" onclick="setAmt(${v})">${money(v)}</button>`)
    .join('');

  const metodosHtml = [
    ['PIX', 'Pix'],
    ['CARTAO', 'Cartão de crédito'],
  ]
    .map((m) => {
      const semPix = m[0] == 'PIX' && !pixDestino;
      return `<button class="mt ${DON.met == m[0] ? 'on' : ''}" data-m="${m[0]}" ${semPix ? 'disabled title="Esta ONG ainda não cadastrou chave Pix"' : ''} onclick="setMet('${m[0]}')">${m[1]}</button>`;
    })
    .join('');

  const content = `
    <div class="top"><h1>Fazer uma doação</h1></div>
    <div class="card dcard">
      <div class="ph" style="padding:0 0 12px">
        ${av(o.name, o.h)}
        <div>
          <b>${esc(o.name)}</b>
          <small>${esc(p.text.slice(0, 90))}</small>
        </div>
      </div>
      <div class="bar"><b style="width:${pctOf(c)}%"></b></div>
      <div class="pg2"><b>${money(c.atual)}</b> de ${money(c.meta)}</div>
    </div>
    <div class="card dcard">
      <label style="margin-top:0">Valor</label>
      <div class="amts">${presetsHtml}</div>
      <label for="vl">Outro valor ${free ? '' : '(disponível no plano apoiador)'}</label>
      <input id="vl" class="in" type="number" min="1" ${free ? '' : 'disabled'} oninput="DON.valor=+this.value">
      <label>Forma de pagamento</label>
      <div class="seg">${metodosHtml}</div>
      ${pixDestino ? '' : '<small style="color:var(--mut)">Esta ONG ainda não cadastrou chave Pix: use o cartão.</small>'}
      <div id="pixBox">${pixBoxHtml()}</div>
      <label for="cpf">CPF do doador</label>
      <input id="cpf" class="in" inputmode="numeric" placeholder="000.000.000-00" value="${esc(DON.cpf || USER.cpf)}" oninput="DON.cpf=this.value">
      <small style="color:var(--mut)">O CPF identifica a doação no comprovante e na declaração de IRPF.</small>
      <p class="dn-err" id="derr" role="alert"></p>
      <button class="btn full" onclick="confirmDon(${p.id}, this)">Confirmar doação</button>
      <p style="color:var(--mut);font-size:12px;margin-top:12px">
        O pagamento é processado por gateway certificado (PCI DSS). Seus dados de cartão não ficam armazenados no Civvo. Você recebe o comprovante e a ONG é notificada.
      </p>
    </div>
  `;

  return shell(content, 'feed', { rightCol: 0 });
};

function setAmt(v) {
  DON.valor = v;
  document.querySelectorAll('.amt').forEach((b) => b.classList.toggle('on', +b.dataset.v == v));
  const i = $('#vl');
  if (i) i.value = '';
}

/* chave Pix da ONG ({tipo, chave}) ou null */
function pixDaChaveOng(o) {
  const k = String((o && o.pix) || '').trim();
  return k ? { tipo: pixTipo(k) || 'Chave', chave: k } : null;
}

/* bloco do Pix na doação: chave de destino (da ONG, com botão copiar) e chave de origem (do doador) */
function pixBoxHtml() {
  const o = ong(DON.ong);
  if (DON.met != 'PIX' || !o) return '';

  const dest = pixDaChaveOng(o);
  if (!dest) return '';

  const minhas = pixDoDoador();

  const destinoHtml = `
    <label style="margin-top:14px">Pix da ONG (destino)</label>
    <div class="pxd" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid rgba(127,127,127,.3);border-radius:10px">
      <div style="min-width:0">
        <b style="word-break:break-all">${esc(dest.chave)}</b>
        <small style="display:block;color:var(--mut)">${esc(dest.tipo)} · ${esc(o.name)}</small>
      </div>
      <button type="button" class="btn light sm" data-k="${esc(dest.chave)}" onclick="copiarPix(this)">Copiar</button>
    </div>`;

  /* já tem chave cadastrada em Configurações e não escolheu digitar outra: mostra pronta, sem pedir de novo
     e sem um seletor que só teria uma opção pra escolher (feio e redundante) */
  if (minhas.length && DON.pixSel != '__outra') {
    const chave = minhas[0];
    DON.pixSel = String(chave.id);
    return `${destinoHtml}
      <label style="margin-top:14px">Sua chave Pix (de onde você vai enviar)</label>
      <div class="pxd" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid rgba(127,127,127,.3);border-radius:10px">
        <div style="min-width:0">
          <b style="word-break:break-all">${esc(pixMascara(chave.chave, chave.tipo))}</b>
          <small style="display:block;color:var(--mut)">${esc(chave.tipo)} · cadastrada em Configurações</small>
        </div>
        <button type="button" class="btn light sm" onclick="usarOutraPix()">Usar outra</button>
      </div>
      <small style="color:var(--mut)">Ninguém vai te doar por aqui — é só pra identificar que o Pix que a ONG vai receber é seu.</small>`;
  }

  /* sem chave cadastrada (ou escolheu digitar outra): um único campo de texto, sem seletor */
  return `${destinoHtml}
    <label for="pxOut" style="margin-top:14px">Sua chave Pix (de onde você vai enviar)</label>
    <input id="pxOut" class="in" autocomplete="off" placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória" value="${esc(DON.pixOut || '')}" oninput="DON.pixOut=this.value">
    ${minhas.length ? `<button type="button" class="btn light sm" style="margin-top:8px" onclick="usarMinhaPix()">Usar a chave cadastrada em Configurações</button>` : ''}
    <small style="color:var(--mut)">Ninguém vai te doar por aqui — é só pra identificar que o Pix que a ONG vai receber é seu.</small>`;
}

/* alterna entre a chave já cadastrada e a digitação manual, sem select nem campo escondido */
function usarOutraPix() {
  DON.pixSel = '__outra';
  DON.pixOut = '';
  const box = $('#pixBox');
  if (box) box.innerHTML = pixBoxHtml();
}

function usarMinhaPix() {
  DON.pixSel = '';
  const box = $('#pixBox');
  if (box) box.innerHTML = pixBoxHtml();
}

async function copiarPix(btn) {
  try {
    await navigator.clipboard.writeText(btn.dataset.k);
    toast('Chave Pix copiada.');
  } catch {
    prompt('Copie a chave Pix:', btn.dataset.k);
  }
}

function setMet(m) {
  DON.met = m;
  document.querySelectorAll('.mt').forEach((b) => b.classList.toggle('on', b.dataset.m == m));
  const box = $('#pixBox');
  if (box) box.innerHTML = pixBoxHtml();
}

async function confirmDon(pid, btn) {
  const cpf = (DON.cpf || USER.cpf || '').replace(/\D/g, '');
  const e = $('#derr');
  const p = POSTS.find((x) => x.id == pid);
  e.textContent = '';

  if (!(DON.valor > 0)) {
    e.textContent = 'Escolha um valor para doar.';
    return;
  }

  if (cpf.length != 11) {
    e.textContent = 'Informe um CPF válido, com 11 dígitos.';
    return;
  }

  let pixOrigem = '';
  let pixDestino = '';

  if (DON.met == 'PIX') {
    pixDestino = String(ong(p.ong).pix || '').trim();
    if (!pixDestino) {
      e.textContent = 'Esta ONG ainda não cadastrou chave Pix. Use o cartão.';
      return;
    }

    if (DON.pixSel && DON.pixSel != '__outra') {
      pixOrigem = (pixDoDoador().find((x) => String(x.id) == DON.pixSel) || {}).chave || '';
    } else {
      pixOrigem = ($('#pxOut')?.value || DON.pixOut || '').trim();
    }

    if (!pixTipo(pixOrigem)) {
      e.textContent = `Informe a chave Pix de onde você vai enviar. ${PIX_ERRO}`;
      return;
    }
  }

  let novoId = null;
  let respostaApi = null;

  const ok = await comEspera(btn, 'Processando…', async () => {
    /* modo real: o back cria a doação e a cobrança no gateway (mock ou Mercado Pago) e devolve o id definitivo */
    if (!DEMO) {
      respostaApi = await API.doar({
        campaign_id: p.camp.id,
        amount: DON.valor,
        metodo: DON.met,
        cpf,
        mensagem: '',
        /* evita cobrar duas vezes se a pessoa clicar de novo durante o processamento */
        idempotency_key: `don-${pid}-${Date.now()}`,
      });
      novoId = respostaApi.donation.id;
      return;
    }

    /* modo demo: simulação local, sem back */
    const d = {
      id: Date.now(),
      camp: pid,
      valor: DON.valor,
      status: 'PENDENTE',
      data: new Date().toLocaleString('pt-BR'),
      metodo: DON.met,
      pixOrigem,
      pixDestino,
      cpf,
      projeto: p.text.slice(0, 60),
      ong: ong(p.ong).name,
      doador: USER.apelido_unico,
      ongId: p.ong,
    };
    DONATIONS.push(d);
    novoId = d.id;

    notify(
      'doador',
      'DOACAO',
      `Doação de ${money(d.valor)} para ${d.ong} registrada. Acompanhe o comprovante.`,
      '#/recibo/' + d.id
    );
    notify(
      'ong',
      'DOACAO',
      `Nova doação de ${money(d.valor)} em análise (${d.metodo == 'PIX' ? `Pix de ${pixMascara(d.pixOrigem, pixTipo(d.pixOrigem))}` : 'cartão'}).`,
      '#/painel'
    );
  });

  if (!ok) return;

  DON = { valor: 0, met: 'PIX', cpf: '' };

  /* cartão no modo real: o Mercado Pago precisa da própria página de checkout (dados do cartão não passam pelo Civvo) */
  if (!DEMO && respostaApi?.checkout_url) {
    location.href = respostaApi.checkout_url;
    return;
  }

  location.hash = '#/recibo/' + novoId;
}

const ST_TXT = {
  PENDENTE: 'Pagamento em análise. Este comprovante é atualizado quando for aprovado.',
  APROVADO: 'Pagamento aprovado. O valor já está a caminho do projeto.',
  REJEITADO: 'Pagamento não aprovado. Tente novamente ou use outra forma de pagamento.',
  EXPIRADO: 'O prazo para pagamento expirou. Faça uma nova doação se ainda quiser contribuir.',
  ESTORNADO: 'Este pagamento foi estornado.',
};

/* ---------------------------------------------------------------------
   Modo real: cache simples do comprovante + polling leve enquanto PENDENTE
   (o back só confere o gateway a cada 15s por doação, então aqui também
   não adianta martelar: 8s é suficiente para o doador ver a atualização). */
const RECIBOS = new Map();
const RECIBO_PROMISE = new Map();
const RECIBO_ERRO = new Map();
const RECIBO_POLL_ATIVO = new Set();

function carregarRecibo(id) {
  if (RECIBO_PROMISE.has(id)) return RECIBO_PROMISE.get(id);

  const p = API.buscarDoacao(id)
    .then((d) => {
      RECIBOS.set(id, d);
      RECIBO_ERRO.delete(id);
    })
    .catch((e) => {
      RECIBO_ERRO.set(id, e.name == 'ApiError' && e.message ? e.message : 'Não foi possível carregar o comprovante.');
    })
    .finally(() => {
      RECIBO_PROMISE.delete(id);
      go();
    });

  RECIBO_PROMISE.set(id, p);
  return p;
}

function agendarConferenciaRecibo(id) {
  if (RECIBO_POLL_ATIVO.has(id)) return;
  RECIBO_POLL_ATIVO.add(id);

  const tick = async () => {
    /* a pessoa saiu da tela deste comprovante: para de consultar */
    if (!location.hash.startsWith('#/recibo/' + id)) {
      RECIBO_POLL_ATIVO.delete(id);
      return;
    }
    RECIBO_PROMISE.delete(id); // força buscar de novo, ignorando o cache
    await carregarRecibo(id);
    const atual = RECIBOS.get(id);
    if (atual && atual.status === 'PENDENTE') {
      setTimeout(tick, 8000);
    } else {
      RECIBO_POLL_ATIVO.delete(id);
    }
  };

  setTimeout(tick, 8000);
}

/* botão de teste: só funciona enquanto o back estiver com PAYMENT_PROVIDER=mock e fora de produção.
   Remover quando o Mercado Pago real entrar em uso — nesse momento o back passa a recusar com 404. */
async function simularAprovacao(id, btn) {
  const ok = await comEspera(btn, 'Simulando…', () => API.simularPagamentoDoacao(id));
  if (!ok) return;
  RECIBO_PROMISE.delete(id);
  await carregarRecibo(id);
  toast('Pagamento simulado como aprovado.');
}

function reciboHtml(d, { podeSimular = false } = {}) {
  const cl = d.status == 'PENDENTE' ? 'warn' : (d.status == 'REJEITADO' || d.status == 'EXPIRADO') ? 'bad' : '';
  const metodoPagamento = d.metodo == 'PIX' ? 'Pix' : 'Cartão de crédito';

  const pixHtml = d.metodo == 'PIX' && d.pix
    ? `<div class="pxd" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin-top:10px;border:1px solid rgba(127,127,127,.3);border-radius:10px">
         <div style="min-width:0"><b style="word-break:break-all">${esc(d.pix.copia_e_cola)}</b><small style="display:block;color:var(--mut)">Pix copia e cola</small></div>
         <button type="button" class="btn light sm" data-k="${esc(d.pix.copia_e_cola)}" onclick="copiarPix(this)">Copiar</button>
       </div>`
    : '';

  const checkoutHtml = d.checkout_url
    ? `<a class="btn full" style="margin-top:14px" href="${esc(d.checkout_url)}">Ir para o pagamento</a>`
    : '';

  const simularHtml = podeSimular && d.status == 'PENDENTE'
    ? `<button class="btn light sm" style="margin-top:10px" onclick="simularAprovacao(${d.id}, this)">(teste) Simular aprovação do pagamento</button>`
    : '';

  return `
    <div class="top"><h1>Comprovante da doação</h1></div>
    <div class="card rc">
      <span class="tag ${cl}" style="margin:0">${d.status}</span>
      <p style="margin-top:10px">${ST_TXT[d.status] || ''}</p>
      <dl>
        <dt>Código</dt>
        <dd>#${String(d.id).slice(-6)}</dd>
        <dt>Data</dt>
        <dd>${esc(d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '—')}</dd>
        <dt>Projeto</dt>
        <dd>${esc(d.projeto)}</dd>
        <dt>ONG</dt>
        <dd>${esc(d.ong_nome)}</dd>
        <dt>Valor</dt>
        <dd>${money(d.valor)}</dd>
        <dt>Pagamento</dt>
        <dd>${metodoPagamento}</dd>
        <dt>CPF</dt>
        <dd>${d.cpf_mascarado || '—'}</dd>
      </dl>
      ${pixHtml}
      ${checkoutHtml}
      ${simularHtml}
      <div class="acts">
        <button class="btn sm" onclick="print()">Imprimir comprovante</button>
        <a class="btn light sm" href="#/feed">Voltar ao feed</a>
      </div>
    </div>
  `;
}

V.recibo = (idParam) => {
  /* modo demo: segue 100% local, como antes */
  if (DEMO) {
    const d = DONATIONS.find((x) => x.id == idParam);
    if (!d) {
      return shell('<div class="card emp">Comprovante não encontrado.</div>', 'perfil', { rightCol: 0 });
    }

    const cl = d.status == 'PENDENTE' ? 'warn' : d.status == 'REJEITADO' ? 'bad' : '';
    const cpf = d.cpf ? `***.${d.cpf.slice(3, 6)}.${d.cpf.slice(6, 9)}-**` : '—';
    const metodoPagamento = d.metodo == 'PIX' ? 'Pix' : 'Cartão de crédito';

    const content = `
      <div class="top"><h1>Comprovante da doação</h1></div>
      <div class="card rc">
        <span class="tag ${cl}" style="margin:0">${d.status}</span>
        <p style="margin-top:10px">${ST_TXT[d.status] || ''}</p>
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
          <dd>${metodoPagamento}</dd>
          ${d.metodo == 'PIX' && d.pixDestino ? `<dt>Pix da ONG (destino)</dt><dd>${esc(d.pixDestino)}</dd>` : ''}
          ${d.metodo == 'PIX' && d.pixOrigem ? `<dt>Pix do doador (origem)</dt><dd>${esc(pixMascara(d.pixOrigem, pixTipo(d.pixOrigem)))}</dd>` : ''}
          <dt>CPF</dt>
          <dd>${cpf}</dd>
        </dl>
        <div class="acts">
          <button class="btn sm" onclick="print()">Imprimir comprovante</button>
          <a class="btn light sm" href="#/feed">Voltar ao feed</a>
        </div>
      </div>
    `;

    return shell(content, 'perfil', { rightCol: 0 });
  }

  /* modo real: busca no back */
  const id = Number(idParam);

  if (RECIBO_ERRO.has(id)) {
    return shell(`<div class="card emp">${esc(RECIBO_ERRO.get(id))}</div>`, 'perfil', { rightCol: 0 });
  }

  const d = RECIBOS.get(id);

  if (!d) {
    if (!RECIBO_PROMISE.has(id)) carregarRecibo(id);
    return shell('<div class="card emp">Carregando comprovante…</div>', 'perfil', { rightCol: 0 });
  }

  if (d.status === 'PENDENTE') agendarConferenciaRecibo(id);

  return shell(reciboHtml(d, { podeSimular: true }), 'perfil', { rightCol: 0 });
};