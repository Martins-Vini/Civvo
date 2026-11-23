
const PRESETS = [20, 50, 100, 200];

const pctOf = (c) => (c.meta ? Math.min(100, (c.atual / c.meta) * 100) : 0);

/* doação ligada a uma campanha (post) */
V.doar = (id) => {
  const p = POSTS.find((x) => x.id == id);
  const o = p && ong(p.ong);

  if (!p || !p.camp || !o) {
    return shell('<div class="card emp">Campanha não encontrada.</div>', 'feed', { rightCol: 0 });
  }
  if (p.camp.status == 'ENCERRADA') {
    return shell('<div class="card emp">Esta campanha foi encerrada e não recebe mais doações.</div>', 'feed', { rightCol: 0 });
  }
  if (!DEMO && p.camp.id == null) {
    return shell('<div class="card emp">Esta campanha não está disponível para doação no momento.</div>', 'feed', { rightCol: 0 });
  }

  const cabecalho = `
    <div class="ph" style="padding:0 0 12px">
      ${av(o.name, o.h)}
      <div><b>${esc(o.name)}</b><small>${esc(p.text.slice(0, 90))}</small></div>
    </div>
    <div class="bar"><b style="width:${pctOf(p.camp)}%"></b></div>
    <div class="pg2"><b>${money(p.camp.atual)}</b> de ${money(p.camp.meta)}</div>`;

  return telaDoacao({ o, cabecalho, campaignId: p.camp.id, postId: p.id });
};

/* doação direta ao perfil da ONG, sem campanha (item 8) */
V['doar-ong'] = (ongId) => {
  const o = ong(ongId);
  if (!o) return shell('<div class="card emp">ONG não encontrada.</div>', 'feed', { rightCol: 0 });

  const cabecalho = `
    <div class="ph" style="padding:0 0 12px">
      ${av(o.name, o.h)}
      <div><b>${esc(o.name)}</b><small>Doação direta para a ONG</small></div>
    </div>`;

  return telaDoacao({ o, cabecalho, ongId: o.id });
};

function telaDoacao({ o, cabecalho, campaignId = null, postId = null, ongId = null }) {
  const free = temRecurso('valorLivre');
  if (DON.ong != o.id) DON = { valor: 0, met: 'PIX', cpf: DON.cpf || '', ong: o.id };

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
    <div class="card dcard">${cabecalho}</div>
    <div class="card dcard">
      <label style="margin-top:0">Valor</label>
      <div class="amts">${presetsHtml}</div>
      <label for="vl">Outro valor ${free ? '' : '(disponível no plano apoiador)'}</label>
      <input id="vl" class="in" type="number" min="1" ${free ? '' : 'disabled'} oninput="DON.valor=+this.value">
      <label>Forma de pagamento</label>
      <div class="seg">${metodosHtml}</div>
      ${pixDestino ? '' : '<small style="color:var(--mut)">Esta ONG ainda não cadastrou chave Pix: use o cartão.</small>'}
      <div id="pixBox">${pixBoxHtml(pixDestino, o)}</div>
      <label for="cpf">CPF do doador</label>
      <input id="cpf" class="in" inputmode="numeric" placeholder="000.000.000-00" value="${esc(DON.cpf || USER.cpf)}" oninput="DON.cpf=this.value">
      <small style="color:var(--mut)">O CPF identifica a doação no comprovante e na declaração de IRPF.</small>
      <p class="dn-err" id="derr" role="alert"></p>
      <button class="btn full" onclick="confirmDon(${campaignId ?? 'null'}, ${postId ?? 'null'}, ${ongId ?? 'null'}, this)">Confirmar doação</button>
      <p style="color:var(--mut);font-size:12px;margin-top:12px">
        O pagamento é processado por gateway certificado (PCI DSS). Seus dados de cartão não ficam armazenados no Civvo. Você recebe o comprovante e a ONG é notificada.
      </p>
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

/* chave Pix da ONG ({tipo, chave}) ou null */
function pixDaChaveOng(o) {
  const k = String((o && o.pix) || '').trim();
  return k ? { tipo: pixTipo(k) || 'Chave', chave: k } : null;
}

/* bloco do Pix na doação: só a chave de destino (da ONG), com botão de copiar.
   Removido o Pix "do doador" (item 8): quem doa via Pix paga pelo próprio app do banco,
   não precisa cadastrar chave nenhuma na Civvo. */
function pixBoxHtml(dest, o) {
  if (DON.met != 'PIX' || !dest) return '';

  return `
    <label style="margin-top:14px">Chave Pix da ONG</label>
    <div class="pxd" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid rgba(127,127,127,.3);border-radius:10px">
      <div style="min-width:0">
        <b style="word-break:break-all">${esc(dest.chave)}</b>
        <small style="display:block;color:var(--mut)">${esc(dest.tipo)} · ${esc(o.name)}</small>
      </div>
      <button type="button" class="btn light sm" data-k="${esc(dest.chave)}" onclick="copiarPix(this)">Copiar</button>
    </div>
    <small style="color:var(--mut)">Copie a chave e pague pelo app do seu banco. Depois, confirme abaixo para gerar o comprovante.</small>`;
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
  const o = ong(DON.ong);
  if (box && o) box.innerHTML = pixBoxHtml(pixDaChaveOng(o), o);
}

async function confirmDon(campaignId, postId, ongId, btn) {
  const cpf = (DON.cpf || USER.cpf || '').replace(/\D/g, '');
  const e = $('#derr');
  e.textContent = '';

  const o = ong(DON.ong);
  if (!o) return;

  if (!(DON.valor > 0)) {
    e.textContent = 'Escolha um valor para doar.';
    return;
  }
  if (cpf.length != 11) {
    e.textContent = 'Informe um CPF válido, com 11 dígitos.';
    return;
  }
  if (DON.met == 'PIX' && !pixDaChaveOng(o)) {
    e.textContent = 'Esta ONG ainda não cadastrou chave Pix. Use o cartão.';
    return;
  }

  if (!DEMO) {
    try {
      const r = await comEspera(btn, 'Processando…', () =>
        API.doar({
          campaign_id: campaignId || null,
          ong_id: campaignId ? null : ongId || o.id,
          amount: DON.valor,
          mensagem: '',
        })
      );
      DON = { valor: 0, met: 'PIX', cpf };
      location.hash = '#/recibo/' + r.comprovante_id;
    } catch (err) {
      e.textContent = (err.name == 'ApiError' && err.message) || 'Não foi possível processar a doação agora.';
    }
    return;
  }

  /* modo demo: simula aprovação localmente */
  const p = postId ? POSTS.find((x) => x.id == postId) : null;
  const d = {
    id: Date.now(),
    camp: postId,
    valor: DON.valor,
    status: 'PENDENTE',
    data: new Date().toLocaleString('pt-BR'),
    metodo: DON.met,
    cpf,
    projeto: p ? p.text.slice(0, 60) : 'Doação direta',
    ong: o.name,
    doador: USER.apelido_unico,
    ongId: o.id,
  };

  const ok = await comEspera(btn, 'Processando…', () => {
    DONATIONS.push(d);
    notify('doador', 'DOACAO', `Doação de ${money(d.valor)} para ${d.ong} registrada. Acompanhe o comprovante.`, '#/recibo/' + d.id);
    notify('ong', 'DOACAO', `Nova doação de ${money(d.valor)} em análise (${d.metodo == 'PIX' ? 'Pix' : 'cartão'}).`, '#/painel');
  });

  if (!ok) return;

  DON = { valor: 0, met: 'PIX', cpf: '' };
  location.hash = '#/recibo/' + d.id;
}

const ST_TXT = {
  PENDENTE: 'Pagamento em análise. Este comprovante é atualizado quando for aprovado.',
  APROVADO: 'Pagamento aprovado. O valor já está a caminho do projeto.',
  REJEITADO: 'Pagamento não aprovado. Tente novamente ou use outra forma de pagamento.',
};

V.recibo = (id) => {
  const d = DONATIONS.find((x) => x.id == id);
  if (!d) {
    return shell('<div class="card emp">Comprovante não encontrado.</div>', 'perfil', {
      rightCol: 0,
    });
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
};