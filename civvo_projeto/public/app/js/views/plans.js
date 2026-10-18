/* Planos: Doador (Gratuito / Apoiador) e ONG (Gratuito / PRO).  */

const PLANOS = {
  doador: [
    [
      'GRATUITO',
      'Gratuito',
      ['Doar valores pré-definidos', 'Seguir ONGs e se voluntariar', 'Histórico e comprovantes'],
    ],
    ['APOIADOR', 'Apoiador', ['Tudo do plano gratuito', 'Doação de valor livre']],
  ],
  ong: [
    [
      'GRATUITO',
      'Gratuito',
      [
        'Feed, perfil e campanhas',
        'Demandas e relatórios de transparência',
        'Lançamentos de receitas e despesas',
      ],
    ],
    [
      'PRO',
      'PRO',
      [
        'Tudo do plano gratuito',
        'Relatório de doações por dia, semana e mês',
        'Envio de planilhas (Excel)',
        'Gerenciamento de recursos em estoque',
        'Vagas de voluntariado',
      ],
    ],
  ],
};

const planoAtual = () => (ROLE == 'ong' ? ONG_PLANO : USER.plano);

V.planos = () => {
  if (ROLE == 'admin') {
    return shell('<div class="card emp">Planos não se aplicam ao Admin.</div>', 'config', {
      rightCol: 0,
    });
  }

  const subititleText = ROLE == 'ong' ? 'Para ONGs' : 'Para doadores';

  const cardsHtml = PLANOS[ROLE]
    .map(([k, n, l]) => {
      const on = planoAtual() == k;
      const pr = PRECOS[k];

      const priceText = k == 'GRATUITO' 
        ? 'Grátis' 
        : pr != null 
        ? `${money(pr)} / mês` 
        : 'Valor a definir';

      const tagAtual = on 
        ? '<span class="tag" style="margin:0 0 0 6px">Plano atual</span>' 
        : '';

      const listHtml = l.map((x) => `<li>${x}</li>`).join('');

      let actionBtn = '';
      if (!on) {
        actionBtn = k == 'GRATUITO'
          ? `<button class="btn ghost full" onclick="setPlano('GRATUITO', this)">Voltar ao gratuito</button>`
          : `<button class="btn full" onclick="assinar('${k}', '${n}')">Assinar ${n}</button>`;
      }

      return `
        <div class="card plan ${on ? 'on' : ''}">
          <h4>${n} ${tagAtual}</h4>
          <b class="pr">${priceText}</b>
          <ul>${listHtml}</ul>
          ${actionBtn}
        </div>
      `;
    })
    .join('');

  const content = `
    <div class="top">
      <div>
        <h1>Planos</h1>
        <small>${subititleText}</small>
      </div>
    </div>
    <div class="plans">
      ${cardsHtml}
    </div>
  `;

  return shell(content, 'config', { rightCol: 0, wide: 1 });
};

function assinar(k, n) {
  const pr = PRECOS[k];
  const priceNotice = pr != null 
    ? `Valor: <b>${money(pr)} / mês</b>.` 
    : 'O valor será informado pela Omoyari.';

  openModal(
    `<h3>Assinar ${n}</h3>
     <p style="margin:8px 0">${priceNotice}</p>
     <p style="color:var(--mut);font-size:13px">
       O pagamento é processado pelo gateway certificado (PCI DSS). Você pode cancelar quando quiser.
     </p>
     <button class="btn full" style="margin-top:16px" onclick="setPlano('${k}', this)">Confirmar assinatura</button>`,
    'Assinar plano'
  );
}

async function setPlano(k, btn) {
  const ok = await comEspera(btn, 'Processando…', () => {
    if (ROLE == 'ong') {
      ONG_PLANO = k;
    } else {
      USER.plano = k;
    }
  });

  if (!ok) return;

  closeModal();
  toast(k == 'GRATUITO' ? 'Você voltou ao plano gratuito.' : 'Plano ativado.');
  go();
}