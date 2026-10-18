
const PRESETS = [20, 50, 100, 200];

const pctOf = (c) => (c.meta ? Math.min(100, (c.atual / c.meta) * 100) : 0);

V.doar = (id) => {
  const p = POSTS.find((x) => x.id == id);
  const o = p && ong(p.ong);

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

  const c = p.camp;
  const free = USER.plano != 'GRATUITO';

  const presetsHtml = PRESETS
    .map((v) => `<button class="amt ${DON.valor == v ? 'on' : ''}" data-v="${v}" onclick="setAmt(${v})">${money(v)}</button>`)
    .join('');

  const metodosHtml = [
    ['PIX', 'Pix'],
    ['CARTAO', 'Cartão de crédito'],
  ]
    .map((m) => `<button class="mt ${DON.met == m[0] ? 'on' : ''}" data-m="${m[0]}" onclick="setMet('${m[0]}')">${m[1]}</button>`)
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

function setMet(m) {
  DON.met = m;
  document.querySelectorAll('.mt').forEach((b) => b.classList.toggle('on', b.dataset.m == m));
}

async function confirmDon(pid, btn) {
  const cpf = (DON.cpf || USER.cpf || '').replace(/\D/g, '');
  const e = $('#derr');
  const p = POSTS.find((x) => x.id == pid);

  if (!(DON.valor > 0)) {
    e.textContent = 'Escolha um valor para doar.';
    return;
  }

  if (cpf.length != 11) {
    e.textContent = 'Informe um CPF válido, com 11 dígitos.';
    return;
  }

  const d = {
    id: Date.now(),
    camp: pid,
    valor: DON.valor,
    status: 'PENDENTE',
    data: new Date().toLocaleString('pt-BR'),
    metodo: DON.met,
    cpf,
    projeto: p.text.slice(0, 60),
    ong: ong(p.ong).name,
    doador: USER.apelido_unico,
    ongId: p.ong,
  };

  const ok = await comEspera(btn, 'Processando…', () => {
    DONATIONS.push(d);
    notify(
      'doador',
      'DOACAO',
      `Doação de ${money(d.valor)} para ${d.ong} registrada. Acompanhe o comprovante.`,
      '#/recibo/' + d.id
    );
    notify(
      'ong',
      'DOACAO',
      `Nova doação de ${money(d.valor)} em análise (${d.metodo == 'PIX' ? 'Pix' : 'cartão'}).`,
      '#/painel'
    );
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